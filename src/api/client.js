const STORAGE = {
  users: "xgpt_users",
  currentUser: "xgpt_current_user",
  conversations: "xgpt_conversations",
  messages: "xgpt_messages",
  codeFiles: "xgpt_code_files",
};

function read(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const now = () => new Date().toISOString();

function entityStore(key) {
  return {
    async list() {
      return read(key).sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || "")));
    },
    async filter(filters = {}) {
      return read(key).filter(item => Object.entries(filters).every(([k, v]) => item[k] === v))
        .sort((a, b) => String(a.created_date || "").localeCompare(String(b.created_date || "")));
    },
    async create(data) {
      const item = { id: uid(), created_date: now(), updated_date: now(), ...data };
      const items = read(key); items.unshift(item); write(key, items); return item;
    },
    async update(id, data) {
      const items = read(key);
      const item = items.find(x => x.id === id);
      if (!item) throw new Error("Item not found");
      Object.assign(item, data, { updated_date: now() });
      write(key, items); return item;
    },
    async delete(id) { write(key, read(key).filter(x => x.id !== id)); },
    async deleteMany(filters = {}) {
      const matches = Object.keys(filters).length
        ? read(key).filter(item => Object.entries(filters).every(([k,v]) => item[k] === v))
        : read(key);
      const ids = new Set(matches.map(x => x.id));
      write(key, read(key).filter(x => !ids.has(x.id)));
    },
  };
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!response.ok) {
    const error = new Error(data.message || data.error || `Request failed (${response.status})`);
    error.status = response.status; throw error;
  }
  return data;
}

const auth = {
  async me() {
    const local = read(STORAGE.currentUser, null);
    if (local) return local;
    try {
      const data = await request("/api/auth/me");
      if (data?.user) { write(STORAGE.currentUser, data.user); return data.user; }
      return null;
    } catch { throw Object.assign(new Error("Not authenticated"), { status: 401 }); }
  },
  async isAuthenticated() {
    try { await this.me(); return true; } catch { return false; }
  },
  async loginViaEmailPassword(email, password) {
    try {
      const data = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      const user = data.user || data;
      write(STORAGE.currentUser, user);
      return user;
    } catch (error) {
      const users = read(STORAGE.users);
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (!user) throw (error.status === 404 || error.status >= 500 || !error.status) ? new Error("No account found. Please sign up first or check your server.") : error;
      const safe = { ...user }; delete safe.password;
      write(STORAGE.currentUser, safe); return safe;
    }
  },
  async register({ email, password, name }) {
    try {
      const data = await request("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) });
      const user = data.user || data;
      write(STORAGE.currentUser, user); return user;
    } catch (error) {
      if (error.status && error.status < 500 && error.status !== 404) throw error;
      const users = read(STORAGE.users);
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) throw new Error("An account with this email already exists.");
      const user = { id: uid(), email: email.trim(), password, name: name?.trim() || "", role: "user", created_date: now() };
      users.push(user); write(STORAGE.users, users);
      const safe = { ...user }; delete safe.password;
      write(STORAGE.currentUser, safe); return safe;
    }
  },
  async verifyOtp() { return this.me(); },
  async resendOtp() { return true; },
  setToken() {},
  async loginWithProvider(provider, returnTo = "/") {
    window.location.href = `/api/auth/${provider}?returnTo=${encodeURIComponent(returnTo)}`;
  },
  async resetPasswordRequest(email) {
    try { return await request("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }); }
    catch (e) { if (e.status === 404) return { ok: true }; throw e; }
  },
  async resetPassword(payload) {
    try { return await request("/api/auth/reset-password", { method: "POST", body: JSON.stringify(payload) }); }
    catch (e) { if (e.status === 404) return { ok: true }; throw e; }
  },
  async updateMe(data) {
    const current = await this.me();
    const updated = { ...current, ...data };
    write(STORAGE.currentUser, updated);
    const users = read(STORAGE.users);
    const index = users.findIndex(u => u.id === current.id);
    if (index >= 0) users[index] = { ...users[index], ...data }; write(STORAGE.users, users);
    return updated;
  },
  async logout() { localStorage.removeItem(STORAGE.currentUser); },
};

const entities = {
  CodeFile: entityStore(STORAGE.codeFiles),
  Conversation: entityStore(STORAGE.conversations),
  Message: entityStore(STORAGE.messages),
  Subscription: entityStore("xgpt_subscriptions"),
  User: entityStore(STORAGE.users),
  Feedback: entityStore("xgpt_feedback"),
};

const functions = {
  async invoke(name, payload = {}) {
    try { return { data: await request(`/api/functions/${encodeURIComponent(name)}`, { method: "POST", body: JSON.stringify(payload) }) }; }
    catch (error) {
      if (error.status === 404) {
        throw new Error(`The ${name} service is not configured. Add your server endpoint at /api/functions/${name}.`);
      }
      throw error;
    }
  },
};

const integrations = {
  Core: {
    async UploadFile({ file }) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ file_url: reader.result });
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.readAsDataURL(file);
      });
    },
  },
};

export const api = { auth, entities, functions, integrations };
