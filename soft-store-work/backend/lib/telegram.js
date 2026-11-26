// Telegram storage pool.
//
// Why a pool: one bot is limited to ~30 messages/second and one channel to
// ~20 messages/minute-ish bursts. To hold thousands of files we spread the
// load over several bots and several private channels.
//
// Why chunks: the public Bot API lets bots UPLOAD up to 50 MB but only
// DOWNLOAD up to 20 MB per file. So every file is split into <=19 MiB parts,
// each part stored as its own Telegram document, and re-assembled on download.
// (If you run your own Bot API server these limits disappear, but chunking
// still works there.)
//
// IMPORTANT: a Telegram file_id only works with the bot that uploaded it, so
// we store the bot id next to every chunk.

const API = "https://api.telegram.org";
const CHUNK_SIZE = 19 * 1024 * 1024;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class TelegramPool {
  constructor(tokens, chatIds) {
    if (!tokens.length) throw new Error("TELEGRAM_BOT_TOKENS is empty");
    if (!chatIds.length) throw new Error("TELEGRAM_CHAT_IDS is empty");
    this.bots = tokens.map((token) => ({ token, id: token.split(":")[0] }));
    this.chatIds = chatIds;
    this.rr = 0;
    this.pathCache = new Map(); // `${botId}:${fileId}` -> { path, expires }
  }

  get chunkSize() {
    return CHUNK_SIZE;
  }

  botById(id) {
    const bot = this.bots.find((b) => b.id === String(id));
    if (!bot) throw new Error(`Bot ${id} is no longer configured (needed to read this file)`);
    return bot;
  }

  // round-robin over (bot, channel) so load is spread evenly
  next() {
    const n = this.rr++;
    return {
      bot: this.bots[n % this.bots.length],
      chatId: this.chatIds[Math.floor(n / this.bots.length) % this.chatIds.length],
    };
  }

  async #request(bot, method, makeBody, { retries = 6 } = {}) {
    let lastErr;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch(`${API}/bot${bot.token}/${method}`, {
          method: "POST",
          body: makeBody(), // rebuilt each attempt (streams/FormData can't be reused)
        });
        const json = await res.json().catch(() => null);
        if (json?.ok) return json.result;
        const code = json?.error_code ?? res.status;
        const desc = json?.description || `HTTP ${res.status}`;
        lastErr = new Error(`Telegram ${method} failed: ${desc}`);
        if (code === 429) {
          const wait = (json?.parameters?.retry_after ?? 5) * 1000 + 250;
          await sleep(wait);
          continue;
        }
        if (code >= 500) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
        lastErr.fatal = true; // 4xx other than 429: not retryable
        throw lastErr;
      } catch (err) {
        if (err.fatal) throw err;
        lastErr = err; // network error: retry
        await sleep(500 * 2 ** attempt);
      }
    }
    throw lastErr || new Error(`Telegram ${method} failed`);
  }

  // Upload one buffer as a document; returns what we need to fetch it later.
  async uploadChunk(buffer, filename) {
    const { bot, chatId } = this.next();
    const result = await this.#request(bot, "sendDocument", () => {
      const form = new FormData();
      form.append("chat_id", chatId);
      form.append("disable_notification", "true");
      form.append("document", new Blob([buffer]), filename);
      return form;
    });
    return {
      botId: bot.id,
      chatId,
      messageId: result.message_id,
      fileId: result.document.file_id,
      size: buffer.length,
    };
  }

  async #filePath(bot, fileId) {
    const key = `${bot.id}:${fileId}`;
    const hit = this.pathCache.get(key);
    if (hit && hit.expires > Date.now()) return hit.path;
    const result = await this.#request(bot, "getFile", () => {
      const form = new FormData();
      form.append("file_id", fileId);
      return form;
    });
    // Telegram says paths stay valid for at least 1 hour; cache for 50 min.
    this.pathCache.set(key, { path: result.file_path, expires: Date.now() + 50 * 60 * 1000 });
    if (this.pathCache.size > 5000) this.pathCache.delete(this.pathCache.keys().next().value);
    return result.file_path;
  }

  async downloadChunk(chunk) {
    const bot = this.botById(chunk.botId);
    for (let attempt = 0; attempt < 3; attempt++) {
      const path = await this.#filePath(bot, chunk.fileId);
      const res = await fetch(`${API}/file/bot${bot.token}/${path}`);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      this.pathCache.delete(`${bot.id}:${chunk.fileId}`); // path may have expired
      await sleep(400 * 2 ** attempt);
    }
    throw new Error("Failed to download chunk from Telegram");
  }

  async deleteChunk(chunk) {
    try {
      const bot = this.botById(chunk.botId);
      await this.#request(
        bot,
        "deleteMessage",
        () => {
          const form = new FormData();
          form.append("chat_id", chunk.chatId);
          form.append("message_id", String(chunk.messageId));
          return form;
        },
        { retries: 3 }
      );
      return true;
    } catch (err) {
      console.warn("deleteMessage failed:", err.message);
      return false;
    }
  }
}

function fromEnv() {
  const split = (v) => (v || "").split(",").map((s) => s.trim()).filter(Boolean);
  const tokens = split(process.env.TELEGRAM_BOT_TOKENS || process.env.TELEGRAM_BOT_TOKEN);
  const chats = split(process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID);
  if (!tokens.length || !chats.length) return null;
  return new TelegramPool(tokens, chats);
}

module.exports = { TelegramPool, fromEnv, CHUNK_SIZE };
