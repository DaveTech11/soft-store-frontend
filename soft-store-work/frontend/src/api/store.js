// Talks to the Soft Store backend's Play-Store-style catalog (/api/store).
// Nothing here changes the existing app-config / download logic.

// Same origin by default (the backend serves this site). Set VITE_API_URL only if the API lives elsewhere.
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

async function get(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw Object.assign(new Error(`Request failed (${res.status})`), { status: res.status });
  return res.json();
}

// One anonymous id per browser — the backend allows one review per device per app.
export function getDeviceId() {
  const KEY = "softstore_device_id";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-device`;
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anonymous-device-id";
  }
}

export const fetchApps = (params) => get(`/api/store/apps?${new URLSearchParams(params)}`);
export const fetchApp = (pkg) => get(`/api/store/apps/${encodeURIComponent(pkg)}`);
export const fetchReviews = (pkg, cursor) =>
  get(`/api/store/apps/${encodeURIComponent(pkg)}/reviews?limit=10${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);

export async function postReview(pkg, { rating, body, author }) {
  const res = await fetch(`${API_BASE}/api/store/apps/${encodeURIComponent(pkg)}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-device-id": getDeviceId() },
    body: JSON.stringify({ rating, body, author }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Could not post review (${res.status})`);
  return data;
}

export const fetchCategories = () => get("/api/store/categories");
