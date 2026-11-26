// Core file operations on top of the Telegram pool: store, stream, delete.
const crypto = require("crypto");
const fs = require("fs");

const UPLOAD_PARALLEL = Number(process.env.UPLOAD_PARALLEL || 3);

function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header || "");
  if (!m || (m[1] === "" && m[2] === "")) return null;
  let start, end;
  if (m[1] === "") {
    start = Math.max(size - Number(m[2]), 0);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start > end || start >= size) return "invalid";
  return { start, end };
}

// Read the temp file in chunk-size pieces, upload them (a few in parallel),
// return ordered chunk list + sha256 of the whole file.
async function uploadFromDisk(tg, filePath, fileName, size) {
  const total = Math.max(1, Math.ceil(size / tg.chunkSize));
  const hash = crypto.createHash("sha256");
  const chunks = new Array(total);
  const uploaded = [];
  const fh = await fs.promises.open(filePath, "r");
  try {
    const readChunk = async (i) => {
      const length = Math.min(tg.chunkSize, size - i * tg.chunkSize);
      const buf = Buffer.alloc(length);
      await fh.read(buf, 0, length, i * tg.chunkSize);
      return buf;
    };
    for (let i = 0; i < total; i++) hash.update(await readChunk(i));

    let next = 0;
    const worker = async () => {
      while (true) {
        const i = next++;
        if (i >= total) return;
        const buf = await readChunk(i);
        const partName = total === 1 ? fileName : `${fileName}.part${String(i + 1).padStart(4, "0")}`;
        const info = await tg.uploadChunk(buf, partName);
        chunks[i] = info;
        uploaded.push(info);
      }
    };
    await Promise.all(Array.from({ length: Math.min(UPLOAD_PARALLEL, total) }, worker));
  } catch (err) {
    uploaded.forEach((c) => tg.deleteChunk(c)); // roll back what reached Telegram
    throw err;
  } finally {
    await fh.close();
  }
  return { chunks, sha256: hash.digest("hex") };
}

// Upload a multer file to Telegram and record it in the files table.
async function storeFile(pool, tg, file, { kind = "file", appId = "default", version = null, notes = null } = {}) {
  const name = (file.originalname || "file").replace(/[\r\n"]/g, "_");
  const { chunks, sha256 } = await uploadFromDisk(tg, file.path, name, file.size);
  try {
    const { rows } = await pool.query(
      `INSERT INTO files (app_id, name, mime, size, sha256, version, notes, kind, chunks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [appId, name, file.mimetype || "application/octet-stream", file.size, sha256, version, notes, kind, JSON.stringify(chunks)]
    );
    return rows[0];
  } catch (err) {
    chunks.forEach((c) => tg.deleteChunk(c));
    throw err;
  }
}

// Delete file rows + their Telegram messages (messages are cleaned up in the background).
async function deleteFiles(pool, tg, ids) {
  ids = (ids || []).filter(Boolean);
  if (!ids.length) return;
  const { rows } = await pool.query("DELETE FROM files WHERE id = ANY($1::uuid[]) RETURNING chunks", [ids]);
  const chunks = rows.flatMap((r) => r.chunks);
  (async () => {
    for (const c of chunks) await tg.deleteChunk(c);
  })().catch(() => {});
}

// Stream a stored file to the client. Supports Range (resume) requests.
// opts.filename overrides the download name; opts.onFirstByte runs once per
// download (used for counters).
async function streamFile(tg, row, req, res, opts = {}) {
  const size = Number(row.size);
  const range = parseRange(req.header("range"), size);
  if (range === "invalid") {
    res.set("Content-Range", `bytes */${size}`);
    return res.status(416).end();
  }
  const start = range ? range.start : 0;
  const end = range ? range.end : size - 1;
  const name = opts.filename || row.name;
  const isImage = row.mime.startsWith("image/");

  res.status(range ? 206 : 200);
  res.set({
    "Content-Type": row.mime,
    "Content-Length": String(end - start + 1),
    "Accept-Ranges": "bytes",
    "Content-Disposition": `${isImage ? "inline" : "attachment"}; filename="${name.replace(/"/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    // file ids are immutable, so images can be cached forever
    "Cache-Control": isImage ? "public, max-age=31536000, immutable" : "public, max-age=3600",
  });
  if (range) res.set("Content-Range", `bytes ${start}-${end}/${size}`);

  if (start === 0 && opts.onFirstByte) Promise.resolve(opts.onFirstByte()).catch(() => {});

  try {
    const wanted = [];
    let offset = 0;
    for (const chunk of row.chunks) {
      const cStart = offset;
      const cEnd = offset + chunk.size - 1;
      offset += chunk.size;
      if (cEnd < start || cStart > end) continue;
      wanted.push({ chunk, from: Math.max(start, cStart) - cStart, to: Math.min(end, cEnd) - cStart });
    }
    let pending = wanted.length ? tg.downloadChunk(wanted[0].chunk) : null;
    for (let i = 0; i < wanted.length; i++) {
      const buf = await pending;
      pending = i + 1 < wanted.length ? tg.downloadChunk(wanted[i + 1].chunk) : null; // prefetch next
      pending?.catch(() => {});
      if (res.destroyed) return;
      const slice = buf.subarray(wanted[i].from, wanted[i].to + 1);
      if (!res.write(slice)) await new Promise((r) => res.once("drain", r).once("close", r));
    }
    res.end();
  } catch (err) {
    console.error("download failed:", err.message);
    res.destroy(err);
  }
}

module.exports = { storeFile, deleteFiles, streamFile };
