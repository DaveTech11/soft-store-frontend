// Multer instances (uploads are written to a temp file, then pushed to Telegram).
const os = require("os");
const multer = require("multer");
const { HttpError } = require("./http");

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 500);
const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_MB || 5);
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const anyFile = multer({ dest: os.tmpdir(), limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1 } });

const images = multer({
  dest: os.tmpdir(),
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) =>
    IMAGE_TYPES.has(file.mimetype) ? cb(null, true) : cb(new HttpError(400, "Only PNG, JPEG or WebP images are allowed")),
});

module.exports = { anyFile, images, MAX_UPLOAD_MB, MAX_IMAGE_MB };
