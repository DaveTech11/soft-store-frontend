// Raw file API (the storage layer the store is built on).
//
//   POST   /api/files               (admin) multipart: file, appId?, version?, notes?
//   GET    /api/files               (admin) list, newest first: ?appId=&limit=&cursor=
//   GET    /api/files/:id           metadata
//   GET    /api/files/:id/download  streams the file (Range / resume supported)
//   DELETE /api/files/:id           (admin) removes the file + Telegram messages

const express = require("express");
const { HttpError, wrap, requireAdmin, cleanupUploads } = require("./http");
const { anyFile } = require("./uploads");
const { storeFile, deleteFiles, streamFile } = require("./storage");

const publicRow = (r) => ({
  id: r.id,
  appId: r.app_id,
  name: r.name,
  mime: r.mime,
  kind: r.kind,
  size: Number(r.size),
  sha256: r.sha256,
  version: r.version,
  notes: r.notes,
  downloads: Number(r.downloads),
  createdAt: r.created_at,
  downloadUrl: `/api/files/${r.id}/download`,
});

function createFilesRouter(pool, tg) {
  const router = express.Router();

  router.post(
    "/",
    requireAdmin,
    anyFile.single("file"),
    wrap(async (req, res) => {
      try {
        if (!req.file) throw new HttpError(400, 'Send the file in a multipart field named "file"');
        const { appId = "default", version = null, notes = null } = req.body;
        const row = await storeFile(pool, tg, req.file, { appId, version, notes });
        res.status(201).json(publicRow(row));
      } finally {
        cleanupUploads(req);
      }
    })
  );

  router.get(
    "/",
    requireAdmin,
    wrap(async (req, res) => {
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
      const params = [];
      const where = [];
      if (req.query.appId) {
        params.push(req.query.appId);
        where.push(`app_id = $${params.length}`);
      }
      if (req.query.cursor) {
        const [ts, id] = String(req.query.cursor).split("_");
        params.push(ts, id);
        where.push(`(created_at, id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`);
      }
      params.push(limit + 1);
      const { rows } = await pool.query(
        `SELECT * FROM files ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC, id DESC LIMIT $${params.length}`,
        params
      );
      const page = rows.slice(0, limit);
      const last = page[page.length - 1];
      res.json({
        items: page.map(publicRow),
        nextCursor: rows.length > limit ? `${last.created_at.toISOString()}_${last.id}` : null,
      });
    })
  );

  router.get(
    "/:id",
    wrap(async (req, res) => {
      const { rows } = await pool.query("SELECT * FROM files WHERE id = $1", [req.params.id]);
      if (!rows[0]) throw new HttpError(404, "Not found");
      res.json(publicRow(rows[0]));
    })
  );

  router.get(
    "/:id/download",
    wrap(async (req, res) => {
      const { rows } = await pool.query("SELECT * FROM files WHERE id = $1", [req.params.id]);
      if (!rows[0]) throw new HttpError(404, "Not found");
      const row = rows[0];
      // store images are served here too; only count real file downloads
      await streamFile(tg, row, req, res, {
        onFirstByte: row.kind === "image" ? null : () => pool.query("UPDATE files SET downloads = downloads + 1 WHERE id = $1", [row.id]),
      });
    })
  );

  router.delete(
    "/:id",
    requireAdmin,
    wrap(async (req, res) => {
      const { rowCount } = await pool.query("SELECT 1 FROM files WHERE id = $1", [req.params.id]);
      if (!rowCount) throw new HttpError(404, "Not found");
      const used = await pool.query(
        `SELECT 1 FROM app_versions WHERE file_id = $1
         UNION ALL SELECT 1 FROM apps WHERE icon_file = $1 OR feature_file = $1 OR screenshots ? $1::text LIMIT 1`,
        [req.params.id]
      );
      if (used.rowCount) throw new HttpError(409, "This file belongs to an app — delete it through /api/admin/apps instead");
      await deleteFiles(pool, tg, [req.params.id]);
      res.json({ deleted: true });
    })
  );

  return router;
}

module.exports = { createFilesRouter };
