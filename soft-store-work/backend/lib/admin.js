// Admin / developer-console API. Every route needs the x-admin-key header.
//
//   GET    /api/admin/apps                              all apps incl. drafts (?status=&limit=&offset=)
//   POST   /api/admin/apps                              create app (JSON)
//   GET    /api/admin/apps/:pkg                         one app (any status)
//   PUT    /api/admin/apps/:pkg                         update fields (JSON)
//   DELETE /api/admin/apps/:pkg                         delete app + all its files
//   POST   /api/admin/apps/:pkg/icon                    multipart: icon
//   POST   /api/admin/apps/:pkg/feature                 multipart: feature (banner)
//   POST   /api/admin/apps/:pkg/screenshots             multipart: screenshots (up to 8 per call)
//   DELETE /api/admin/apps/:pkg/screenshots/:fileId
//   POST   /api/admin/apps/:pkg/versions                multipart: apk + versionName, versionCode, changelog?, minSdk?
//   DELETE /api/admin/apps/:pkg/versions/:code
//   DELETE /api/admin/reviews/:id

const fs = require("fs");
const express = require("express");
const { HttpError, wrap, requireAdmin, baseUrl, cleanupUploads, tx } = require("./http");
const { anyFile, images } = require("./uploads");
const { storeFile, deleteFiles } = require("./storage");
const { serializeApp } = require("./serialize");

const PKG_RE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
const MAX_SCREENSHOTS = 8;

const ADMIN_SELECT = `
  SELECT a.*, v.version_name, v.version_code, v.size AS v_size, v.changelog AS v_changelog,
         v.min_sdk AS v_min_sdk, v.sha256 AS v_sha256, v.created_at AS v_created_at
  FROM apps a LEFT JOIN app_versions v ON v.id = a.latest_version_id`;

// JSON body field -> column (with validation/cleaning)
const FIELDS = {
  title: (v) => String(v).trim().slice(0, 100),
  shortDescription: (v) => String(v).trim().slice(0, 160),
  description: (v) => String(v).slice(0, 8000),
  developer: (v) => String(v).trim().slice(0, 100),
  category: (v) => String(v).trim().toLowerCase().slice(0, 40) || "other",
  contentRating: (v) => String(v).trim().slice(0, 30),
  tags: (v) => (Array.isArray(v) ? v.map((t) => String(t).trim().toLowerCase().slice(0, 30)).filter(Boolean).slice(0, 20) : []),
  website: (v) => (v ? String(v).slice(0, 300) : null),
  privacyPolicyUrl: (v) => (v ? String(v).slice(0, 300) : null),
  status: (v) => {
    if (!["draft", "published"].includes(v)) throw new HttpError(400, 'status must be "draft" or "published"');
    return v;
  },
  featured: (v) => v === true || v === "true",
};
const COLUMN = {
  title: "title", shortDescription: "short_description", description: "description", developer: "developer",
  category: "category", contentRating: "content_rating", tags: "tags", website: "website",
  privacyPolicyUrl: "privacy_policy_url", status: "status", featured: "featured",
};

function createAdminRouter(pool, tg) {
  const router = express.Router();
  router.use(requireAdmin);

  const findApp = async (pkg, db = pool) => {
    const { rows } = await db.query("SELECT * FROM apps WHERE package_name = $1", [pkg]);
    if (!rows[0]) throw new HttpError(404, "App not found");
    return rows[0];
  };
  const sendApp = async (req, res, pkg, status = 200) => {
    const { rows } = await pool.query(`${ADMIN_SELECT} WHERE a.package_name = $1`, [pkg]);
    res.status(status).json(serializeApp(rows[0], baseUrl(req), { admin: true }));
  };

  router.get(
    "/apps",
    wrap(async (req, res) => {
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
      const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
      const params = [];
      let where = "";
      if (req.query.status) {
        params.push(req.query.status);
        where = `WHERE a.status = $1`;
      }
      params.push(limit, offset);
      const { rows } = await pool.query(
        `${ADMIN_SELECT} ${where} ORDER BY a.created_at DESC, a.id LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
      const base = baseUrl(req);
      res.json({ items: rows.map((r) => serializeApp(r, base, { admin: true })), nextOffset: rows.length === limit ? offset + limit : null });
    })
  );

  router.post(
    "/apps",
    wrap(async (req, res) => {
      const b = req.body || {};
      if (!PKG_RE.test(b.packageName || "")) throw new HttpError(400, "packageName must look like com.example.app");
      if (!b.title || !String(b.title).trim()) throw new HttpError(400, "title is required");
      const cols = ["package_name"];
      const vals = [b.packageName];
      for (const [key, clean] of Object.entries(FIELDS)) {
        if (b[key] !== undefined) {
          cols.push(COLUMN[key]);
          vals.push(clean(b[key]));
        }
      }
      try {
        await pool.query(`INSERT INTO apps (${cols.join(",")}) VALUES (${vals.map((_, i) => `$${i + 1}`).join(",")})`, vals);
      } catch (err) {
        if (err.code === "23505") throw new HttpError(409, "An app with this packageName already exists");
        throw err;
      }
      await sendApp(req, res, b.packageName, 201);
    })
  );

  router.get("/apps/:pkg", wrap(async (req, res) => {
    await findApp(req.params.pkg);
    await sendApp(req, res, req.params.pkg);
  }));

  router.put(
    "/apps/:pkg",
    wrap(async (req, res) => {
      const app = await findApp(req.params.pkg);
      const sets = [];
      const vals = [];
      for (const [key, clean] of Object.entries(FIELDS)) {
        if (req.body?.[key] !== undefined) {
          vals.push(clean(req.body[key]));
          sets.push(`${COLUMN[key]} = $${vals.length}`);
        }
      }
      if (!sets.length) throw new HttpError(400, "Nothing to update");
      vals.push(app.id);
      await pool.query(`UPDATE apps SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${vals.length}`, vals);
      await sendApp(req, res, req.params.pkg);
    })
  );

  router.delete(
    "/apps/:pkg",
    wrap(async (req, res) => {
      const app = await findApp(req.params.pkg);
      const versions = await pool.query("SELECT file_id FROM app_versions WHERE app_id = $1", [app.id]);
      await pool.query("DELETE FROM apps WHERE id = $1", [app.id]); // cascades versions/reviews/counters
      await deleteFiles(pool, tg, [
        app.icon_file, app.feature_file, ...app.screenshots, ...versions.rows.map((v) => v.file_id),
      ]);
      res.json({ deleted: true });
    })
  );

  // ---- images ----
  const singleImage = (field, column) =>
    wrap(async (req, res) => {
      try {
        const app = await findApp(req.params.pkg);
        const file = req.files?.[0];
        if (!file) throw new HttpError(400, `Send an image in a multipart field named "${field}"`);
        const stored = await storeFile(pool, tg, file, { kind: "image", appId: app.package_name });
        await pool.query(`UPDATE apps SET ${column} = $1, updated_at = NOW() WHERE id = $2`, [stored.id, app.id]);
        await deleteFiles(pool, tg, [app[column]]);
        await sendApp(req, res, app.package_name);
      } finally {
        cleanupUploads(req);
      }
    });
  router.post("/apps/:pkg/icon", images.array("icon", 1), singleImage("icon", "icon_file"));
  router.post("/apps/:pkg/feature", images.array("feature", 1), singleImage("feature", "feature_file"));

  router.post(
    "/apps/:pkg/screenshots",
    images.array("screenshots", MAX_SCREENSHOTS),
    wrap(async (req, res) => {
      try {
        const app = await findApp(req.params.pkg);
        if (!req.files?.length) throw new HttpError(400, 'Send images in a multipart field named "screenshots"');
        if (app.screenshots.length + req.files.length > MAX_SCREENSHOTS)
          throw new HttpError(400, `An app can have at most ${MAX_SCREENSHOTS} screenshots`);
        const ids = [];
        for (const f of req.files) ids.push((await storeFile(pool, tg, f, { kind: "image", appId: app.package_name })).id);
        await pool.query(
          `UPDATE apps SET screenshots = screenshots || $1::jsonb, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(ids), app.id]
        );
        await sendApp(req, res, app.package_name);
      } finally {
        cleanupUploads(req);
      }
    })
  );

  router.delete(
    "/apps/:pkg/screenshots/:fileId",
    wrap(async (req, res) => {
      const app = await findApp(req.params.pkg);
      if (!app.screenshots.includes(req.params.fileId)) throw new HttpError(404, "Screenshot not found");
      const rest = app.screenshots.filter((id) => id !== req.params.fileId);
      await pool.query("UPDATE apps SET screenshots = $1::jsonb, updated_at = NOW() WHERE id = $2", [JSON.stringify(rest), app.id]);
      await deleteFiles(pool, tg, [req.params.fileId]);
      await sendApp(req, res, app.package_name);
    })
  );

  // ---- versions (APK uploads) ----
  router.post(
    "/apps/:pkg/versions",
    anyFile.single("apk"),
    wrap(async (req, res) => {
      try {
        const app = await findApp(req.params.pkg);
        if (!req.file) throw new HttpError(400, 'Send the APK in a multipart field named "apk"');
        const versionName = String(req.body.versionName || "").trim().slice(0, 50);
        const versionCode = Number(req.body.versionCode);
        if (!versionName) throw new HttpError(400, "versionName is required");
        if (!Number.isInteger(versionCode) || versionCode < 1) throw new HttpError(400, "versionCode must be a positive integer");
        const minSdk = req.body.minSdk ? parseInt(req.body.minSdk, 10) : null;

        // an APK is a zip: check the magic bytes
        const fh = await fs.promises.open(req.file.path, "r");
        const magic = Buffer.alloc(2);
        await fh.read(magic, 0, 2, 0);
        await fh.close();
        if (magic.toString() !== "PK") throw new HttpError(400, "That doesn't look like an APK file");

        const dup = await pool.query("SELECT 1 FROM app_versions WHERE app_id = $1 AND version_code = $2", [app.id, versionCode]);
        if (dup.rows[0]) throw new HttpError(409, `versionCode ${versionCode} already exists for this app`);

        const stored = await storeFile(pool, tg, req.file, {
          kind: "apk", appId: app.package_name, version: versionName, notes: req.body.changelog || null,
        });
        try {
          await tx(pool, async (db) => {
            await db.query(
              `INSERT INTO app_versions (app_id, version_name, version_code, changelog, min_sdk, file_id, size, sha256)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
              [app.id, versionName, versionCode, String(req.body.changelog || "").slice(0, 4000), minSdk, stored.id, stored.size, stored.sha256]
            );
            await db.query(
              `UPDATE apps SET updated_at = NOW(),
                 latest_version_id = (SELECT id FROM app_versions WHERE app_id = $1 ORDER BY version_code DESC LIMIT 1)
               WHERE id = $1`,
              [app.id]
            );
          });
        } catch (err) {
          await deleteFiles(pool, tg, [stored.id]);
          if (err.code === "23505") throw new HttpError(409, `versionCode ${versionCode} already exists for this app`);
          throw err;
        }
        await sendApp(req, res, app.package_name, 201);
      } finally {
        cleanupUploads(req);
      }
    })
  );

  router.delete(
    "/apps/:pkg/versions/:code",
    wrap(async (req, res) => {
      const app = await findApp(req.params.pkg);
      const code = parseInt(req.params.code, 10);
      const { rows } = await pool.query("SELECT * FROM app_versions WHERE app_id = $1 AND version_code = $2", [app.id, code]);
      if (!rows[0]) throw new HttpError(404, "Version not found");
      await tx(pool, async (db) => {
        // detach as "latest" first, then delete, then pick the new latest
        await db.query("UPDATE apps SET latest_version_id = NULL WHERE id = $1", [app.id]);
        await db.query("DELETE FROM app_versions WHERE id = $1", [rows[0].id]);
        await db.query(
          `UPDATE apps SET updated_at = NOW(),
             latest_version_id = (SELECT id FROM app_versions WHERE app_id = $1 ORDER BY version_code DESC LIMIT 1)
           WHERE id = $1`,
          [app.id]
        );
      });
      await deleteFiles(pool, tg, [rows[0].file_id]);
      await sendApp(req, res, app.package_name);
    })
  );

  router.delete(
    "/reviews/:id",
    wrap(async (req, res) => {
      await tx(pool, async (db) => {
        const { rows } = await db.query("DELETE FROM reviews WHERE id = $1 RETURNING app_id", [req.params.id]);
        if (!rows[0]) throw new HttpError(404, "Review not found");
        await db.query(
          `UPDATE apps SET rating_sum = s.sum, rating_count = s.cnt
           FROM (SELECT COALESCE(SUM(rating), 0) AS sum, COUNT(*) AS cnt FROM reviews WHERE app_id = $1) s
           WHERE apps.id = $1`,
          [rows[0].app_id]
        );
      });
      res.json({ deleted: true });
    })
  );

  return router;
}

module.exports = { createAdminRouter };
