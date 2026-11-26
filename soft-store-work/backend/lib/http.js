// Small shared HTTP helpers.
const crypto = require("crypto");
const fs = require("fs");

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Express 4 doesn't catch rejected promises, so wrap every async handler.
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });
    if (err.code === "22P02") return res.status(404).json({ message: "Not found" }); // bad uuid
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  });

function isAdmin(req) {
  const key = process.env.ADMIN_KEY;
  const given = req.header("x-admin-key");
  if (!key || !given) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ message: "Missing or invalid x-admin-key header" });
  next();
}

// Public base URL used to build absolute links (icons, downloads...).
const baseUrl = (req) => (process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");

// Remove multer temp files.
function cleanupUploads(req) {
  const list = [];
  if (req.file) list.push(req.file);
  if (Array.isArray(req.files)) list.push(...req.files);
  else if (req.files) Object.values(req.files).forEach((a) => list.push(...a));
  list.forEach((f) => fs.promises.unlink(f.path).catch(() => {}));
}

async function tx(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { HttpError, wrap, isAdmin, requireAdmin, baseUrl, cleanupUploads, tx };
