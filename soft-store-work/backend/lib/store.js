// Public, read-mostly "Play Store" API.
//
//   GET  /api/store/home                         featured + charts + categories
//   GET  /api/store/categories                   categories with app counts
//   GET  /api/store/apps                         search / browse
//        ?q=&category=&sort=top|new|rating|trending&limit=&offset=
//   GET  /api/store/apps/:pkg                    app details (+ rating histogram)
//   GET  /api/store/apps/:pkg/versions           version history
//   GET  /api/store/apps/:pkg/reviews            reviews (?limit=&cursor=)
//   POST /api/store/apps/:pkg/reviews            add/update review (x-device-id header)
//   GET  /api/store/apps/:pkg/download           latest APK
//   GET  /api/store/apps/:pkg/versions/:code/download   a specific APK
//   GET  /api/store/updates?packages=a.b:12,c.d:3       which installed apps have updates

const express = require("express");
const { HttpError, wrap, baseUrl, tx } = require("./http");
const { serializeApp, serializeReview } = require("./serialize");
const { streamFile } = require("./storage");

// published app joined with its latest version (apps without a version are hidden)
const APP_SELECT = `
  SELECT a.*, v.version_name, v.version_code, v.size AS v_size, v.changelog AS v_changelog,
         v.min_sdk AS v_min_sdk, v.sha256 AS v_sha256, v.created_at AS v_created_at
  FROM apps a JOIN app_versions v ON v.id = a.latest_version_id`;

const TRENDING = `COALESCE((SELECT SUM(d.count) FROM downloads_daily d WHERE d.app_id = a.id AND d.day > CURRENT_DATE - 7), 0)`;

const ORDERS = {
  top: "a.downloads DESC, a.created_at DESC",
  new: "v.created_at DESC",
  rating: "(a.rating_sum::float / NULLIF(a.rating_count, 0)) DESC NULLS LAST, a.rating_count DESC",
  trending: `${TRENDING} DESC, a.downloads DESC`,
};

const clamp = (v, min, max, def) => Math.min(Math.max(parseInt(v, 10) || def, min), max);
const escapeLike = (s) => s.replace(/[\\%_]/g, "\\$&");

// tiny in-memory limiter for write endpoints (per IP)
function limiter(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const arr = (hits.get(req.ip) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) return res.status(429).json({ message: "Too many requests, slow down" });
    arr.push(now);
    hits.set(req.ip, arr);
    if (hits.size > 10000) hits.clear();
    next();
  };
}

async function listApps(pool, base, query) {
  const params = [];
  const where = [`a.status = 'published'`];
  let order = ORDERS.top;

  if (query.category) {
    params.push(String(query.category).toLowerCase());
    where.push(`a.category = $${params.length}`);
  }
  if (query.featured === "1" || query.featured === "true") where.push("a.featured = TRUE");

  const q = String(query.q || "").trim().slice(0, 100);
  if (q) {
    params.push(`%${escapeLike(q)}%`);
    const like = `$${params.length}`;
    params.push(q.toLowerCase());
    const exact = `$${params.length}`;
    where.push(
      `(a.title ILIKE ${like} OR a.package_name ILIKE ${like} OR a.short_description ILIKE ${like} OR a.developer ILIKE ${like} OR ${exact} = ANY(a.tags))`
    );
    if (!ORDERS[query.sort]) {
      params.push(`${escapeLike(q)}%`);
      order = `(a.title ILIKE $${params.length}) DESC, a.downloads DESC`; // title prefix matches first
    }
  }
  if (ORDERS[query.sort]) order = ORDERS[query.sort];

  const limit = clamp(query.limit, 1, 50, 20);
  const offset = clamp(query.offset, 0, 100000, 0);
  params.push(limit + 1, offset);
  const { rows } = await pool.query(
    `${APP_SELECT} WHERE ${where.join(" AND ")} ORDER BY ${order}, a.id LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const page = rows.slice(0, limit);
  return {
    items: page.map((r) => serializeApp(r, base)),
    nextOffset: rows.length > limit ? offset + limit : null,
  };
}

function createStoreRouter(pool, tg) {
  const router = express.Router();

  router.get(
    "/home",
    wrap(async (req, res) => {
      const base = baseUrl(req);
      const [featured, top, trending, fresh, categories] = await Promise.all([
        listApps(pool, base, { featured: "1", limit: 10 }),
        listApps(pool, base, { sort: "top", limit: 10 }),
        listApps(pool, base, { sort: "trending", limit: 10 }),
        listApps(pool, base, { sort: "new", limit: 10 }),
        pool.query(
          `SELECT a.category, COUNT(*)::int AS count FROM apps a
           WHERE a.status = 'published' AND a.latest_version_id IS NOT NULL GROUP BY a.category ORDER BY count DESC`
        ),
      ]);
      res.set("Cache-Control", "public, max-age=60");
      res.json({
        featured: featured.items,
        topCharts: top.items,
        trending: trending.items,
        newAndUpdated: fresh.items,
        categories: categories.rows,
      });
    })
  );

  router.get(
    "/categories",
    wrap(async (_req, res) => {
      const { rows } = await pool.query(
        `SELECT a.category, COUNT(*)::int AS count FROM apps a
         WHERE a.status = 'published' AND a.latest_version_id IS NOT NULL GROUP BY a.category ORDER BY count DESC`
      );
      res.set("Cache-Control", "public, max-age=300");
      res.json(rows);
    })
  );

  router.get(
    "/apps",
    wrap(async (req, res) => {
      res.json(await listApps(pool, baseUrl(req), req.query));
    })
  );

  router.get(
    "/apps/:pkg",
    wrap(async (req, res) => {
      const { rows } = await pool.query(`${APP_SELECT} WHERE a.package_name = $1 AND a.status = 'published'`, [req.params.pkg]);
      if (!rows[0]) throw new HttpError(404, "App not found");
      const hist = await pool.query("SELECT rating, COUNT(*)::int AS n FROM reviews WHERE app_id = $1 GROUP BY rating", [rows[0].id]);
      const app = serializeApp(rows[0], baseUrl(req), { detail: true });
      app.rating.histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      hist.rows.forEach((h) => (app.rating.histogram[h.rating] = h.n));
      res.json(app);
    })
  );

  router.get(
    "/apps/:pkg/versions",
    wrap(async (req, res) => {
      const { rows } = await pool.query(
        `SELECT v.* FROM app_versions v JOIN apps a ON a.id = v.app_id
         WHERE a.package_name = $1 AND a.status = 'published' ORDER BY v.version_code DESC LIMIT 100`,
        [req.params.pkg]
      );
      const base = baseUrl(req);
      res.json(
        rows.map((v) => ({
          versionName: v.version_name,
          versionCode: v.version_code,
          changelog: v.changelog,
          minSdk: v.min_sdk,
          size: Number(v.size),
          sha256: v.sha256,
          createdAt: v.created_at,
          downloadUrl: `${base}/api/store/apps/${req.params.pkg}/versions/${v.version_code}/download`,
        }))
      );
    })
  );

  router.get(
    "/apps/:pkg/reviews",
    wrap(async (req, res) => {
      const app = await pool.query("SELECT id FROM apps WHERE package_name = $1 AND status = 'published'", [req.params.pkg]);
      if (!app.rows[0]) throw new HttpError(404, "App not found");
      const limit = clamp(req.query.limit, 1, 50, 20);
      const params = [app.rows[0].id];
      let cursor = "";
      if (req.query.cursor) {
        const [ts, id] = String(req.query.cursor).split("_");
        params.push(ts, id);
        cursor = `AND (created_at, id) < ($2::timestamptz, $3::uuid)`;
      }
      params.push(limit + 1);
      const { rows } = await pool.query(
        `SELECT * FROM reviews WHERE app_id = $1 ${cursor} ORDER BY created_at DESC, id DESC LIMIT $${params.length}`,
        params
      );
      const page = rows.slice(0, limit);
      const last = page[page.length - 1];
      res.json({
        items: page.map(serializeReview),
        nextCursor: rows.length > limit ? `${last.created_at.toISOString()}_${last.id}` : null,
      });
    })
  );

  router.post(
    "/apps/:pkg/reviews",
    limiter(10, 60 * 1000),
    wrap(async (req, res) => {
      const deviceId = String(req.header("x-device-id") || "");
      if (deviceId.length < 8 || deviceId.length > 128) throw new HttpError(400, "x-device-id header (8-128 chars) is required");
      const rating = Number(req.body?.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, "rating must be an integer from 1 to 5");
      const body = String(req.body?.body || "").trim().slice(0, 2000);
      const author = String(req.body?.author || "Anonymous").trim().slice(0, 60) || "Anonymous";

      const review = await tx(pool, async (db) => {
        const app = await db.query("SELECT id FROM apps WHERE package_name = $1 AND status = 'published'", [req.params.pkg]);
        if (!app.rows[0]) throw new HttpError(404, "App not found");
        const appId = app.rows[0].id;
        const { rows } = await db.query(
          `INSERT INTO reviews (app_id, device_id, author, rating, body) VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (app_id, device_id) DO UPDATE
             SET rating = EXCLUDED.rating, body = EXCLUDED.body, author = EXCLUDED.author, updated_at = NOW()
           RETURNING *`,
          [appId, deviceId, author, rating, body]
        );
        await db.query(
          `UPDATE apps SET rating_sum = s.sum, rating_count = s.cnt
           FROM (SELECT COALESCE(SUM(rating), 0) AS sum, COUNT(*) AS cnt FROM reviews WHERE app_id = $1) s
           WHERE apps.id = $1`,
          [appId]
        );
        return rows[0];
      });
      res.status(201).json(serializeReview(review));
    })
  );

  // ---- downloads ----
  async function sendApk(req, res, versionCode) {
    const params = [req.params.pkg];
    let versionClause = "v.id = a.latest_version_id";
    if (versionCode !== undefined) {
      params.push(versionCode);
      versionClause = "v.version_code = $2";
    }
    const { rows } = await pool.query(
      `SELECT f.*, a.id AS app_uuid, a.package_name, v.version_name
       FROM apps a JOIN app_versions v ON v.app_id = a.id JOIN files f ON f.id = v.file_id
       WHERE a.package_name = $1 AND a.status = 'published' AND ${versionClause}`,
      params
    );
    const row = rows[0];
    if (!row) throw new HttpError(404, "Not found");
    await streamFile(tg, row, req, res, {
      filename: `${row.package_name}-${row.version_name}.apk`,
      onFirstByte: () =>
        Promise.all([
          pool.query("UPDATE files SET downloads = downloads + 1 WHERE id = $1", [row.id]),
          pool.query("UPDATE apps SET downloads = downloads + 1 WHERE id = $1", [row.app_uuid]),
          pool.query(
            `INSERT INTO downloads_daily (app_id, day, count) VALUES ($1, CURRENT_DATE, 1)
             ON CONFLICT (app_id, day) DO UPDATE SET count = downloads_daily.count + 1`,
            [row.app_uuid]
          ),
        ]),
    });
  }

  router.get("/apps/:pkg/download", wrap((req, res) => sendApk(req, res)));
  router.get(
    "/apps/:pkg/versions/:code/download",
    wrap((req, res) => {
      const code = parseInt(req.params.code, 10);
      if (!Number.isInteger(code)) throw new HttpError(404, "Not found");
      return sendApk(req, res, code);
    })
  );

  // ---- update check: what the installed-apps screen calls ----
  router.get(
    "/updates",
    wrap(async (req, res) => {
      const installed = {};
      String(req.query.packages || "")
        .split(",")
        .slice(0, 200)
        .forEach((pair) => {
          const [pkg, code] = pair.trim().split(":");
          if (pkg && Number.isInteger(Number(code))) installed[pkg] = Number(code);
        });
      const pkgs = Object.keys(installed);
      if (!pkgs.length) return res.json({ updates: [] });
      const { rows } = await pool.query(`${APP_SELECT} WHERE a.package_name = ANY($1) AND a.status = 'published'`, [pkgs]);
      const base = baseUrl(req);
      res.json({
        updates: rows
          .filter((r) => r.version_code > installed[r.package_name])
          .map((r) => ({ ...serializeApp(r, base), installedVersionCode: installed[r.package_name] })),
      });
    })
  );

  return router;
}

module.exports = { createStoreRouter };
