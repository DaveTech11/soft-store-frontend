// Soft Store backend — stores the app-download config (MediaFire link,
// version, changelog, iOS availability, download count) in Postgres so
// every visitor's browser sees the same thing, instead of each browser
// keeping its own local copy.
//
// Required env vars:
//   DATABASE_URL  - Postgres connection string (Render provides this)
//   ADMIN_KEY     - secret required in the `x-admin-key` header to save
//                   changes (reading is public, writing is not)
//
// Endpoints:
//   GET  /api/app-config/:id   -> returns the config (creates a default
//                                 row the first time a given :id is read)
//   PUT  /api/app-config/:id   -> merges the request body into the config
//                                 (requires x-admin-key header)
//   GET  /health               -> "ok", for Render's health checks
//
// Telegram file storage + Play-Store-style catalog (needs TELEGRAM_BOT_TOKENS
// + TELEGRAM_CHAT_IDS):
//   /api/files   raw file storage      (lib/files.js)
//   /api/store   public store API      (lib/store.js)
//   /api/admin   developer-console API (lib/admin.js)

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const { fromEnv } = require("./lib/telegram");
const { createFilesRouter } = require("./lib/files");
const { createStoreRouter } = require("./lib/store");
const { createAdminRouter } = require("./lib/admin");
const { ensureSchema } = require("./lib/schema");

const app = express();
app.set("trust proxy", 1); // correct client IP + https URLs behind Render/Heroku/etc.
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("render.com") ? { rejectUnauthorized: false } : undefined,
});

const DEFAULT_CONFIG = {
  apkUrl: "https://www.mediafire.com/file/REPLACE_ME/SoftStore.apk/file",
  version: "v1.0.0",
  sizeLabel: "— MB",
  changelog: [
    { version: "v1.0.0", date: "2026", notes: ["First public release of the Soft Store Android app."] },
  ],
  iosAvailable: false,
  iosUrl: "",
  downloadCount: 0,
  updatedAt: null,
};

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_config (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ
    )
  `);
}

// Telegram-backed file storage (optional: only enabled when bot tokens +
// channel ids are configured, so the old config-only setup keeps working).
const telegram = fromEnv();
if (telegram) {
  app.use("/api/files", createFilesRouter(pool, telegram));
  app.use("/api/store", createStoreRouter(pool, telegram));
  app.use("/api/admin", createAdminRouter(pool, telegram));
} else {
  console.warn("TELEGRAM_BOT_TOKENS / TELEGRAM_CHAT_IDS not set — /api/files is disabled");
}

app.get("/health", (_req, res) => res.send("ok"));

app.get("/api/app-config/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query("SELECT data FROM app_config WHERE id = $1", [id]);
    if (existing.rows.length > 0) {
      return res.json(existing.rows[0].data);
    }
    // first time this id is requested — seed it with the defaults
    await pool.query(
      "INSERT INTO app_config (id, data, updated_at) VALUES ($1, $2, NULL) ON CONFLICT (id) DO NOTHING",
      [id, DEFAULT_CONFIG]
    );
    return res.json(DEFAULT_CONFIG);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load config" });
  }
});

app.put("/api/app-config/:id", async (req, res) => {
  try {
    if (!process.env.ADMIN_KEY || req.header("x-admin-key") !== process.env.ADMIN_KEY) {
      return res.status(401).json({ message: "Missing or invalid x-admin-key header" });
    }
    const { id } = req.params;
    const existing = await pool.query("SELECT data FROM app_config WHERE id = $1", [id]);
    const current = existing.rows[0]?.data || DEFAULT_CONFIG;
    const next = { ...current, ...req.body, updatedAt: new Date().toISOString() };
    await pool.query(
      `INSERT INTO app_config (id, data, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
      [id, next]
    );
    res.json(next);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save config" });
  }
});

// ---- Frontend (single-host setup) ------------------------------------
// The React app is built into ../frontend/dist and served from this same
// server, so one deploy hosts both the website and the API.
// Unknown /api/* paths return JSON 404s; every other path falls back to
// index.html so client-side routes (/app/xyz, /admin ...) work on refresh.
const DIST = process.env.FRONTEND_DIST || path.join(__dirname, "..", "frontend", "dist");
app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));
if (fs.existsSync(path.join(DIST, "index.html"))) {
  app.use(
    express.static(DIST, {
      index: false,
      setHeaders: (res, file) => {
        // Vite fingerprints files in /assets, so they can be cached for a year
        if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      },
    })
  );
  app.get("*", (_req, res) => {
    res.set("Cache-Control", "no-cache");
    res.sendFile(path.join(DIST, "index.html"));
  });
} else {
  console.warn(`Frontend build not found at ${DIST} — serving the API only (run "npm run build")`);
}

// JSON errors (multer limits, bad JSON, wrong image type...)
app.use((err, _req, res, _next) => {
  if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: "File is too large" });
  if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") return res.status(400).json({ message: "Too many files or wrong field name" });
  if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON body" });
  console.error(err);
  res.status(500).json({ message: "Something went wrong" });
});

const PORT = process.env.PORT || 3000;
ensureTable()
  .then(() => (telegram ? ensureSchema(pool) : null))
  .then(() => {
    app.listen(PORT, () => console.log(`Soft Store listening on ${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to set up database table:", err);
    process.exit(1);
  });
