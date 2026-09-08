// ---------------------------------------------------------------------------
// Everything about the "download the app" experience — the MediaFire link,
// version/size labels, changelog, iOS availability, and a download counter —
// lives in one config object so the Admin dashboard can edit all of it
// without touching code.
//
// It tries a real backend endpoint first (PATH below) and falls back to the
// browser's local storage if that endpoint doesn't exist yet (404) or the
// request fails for any other reason (offline, no backend at all, etc). The
// moment you add a matching endpoint on your server, every visitor's browser
// starts sharing the same config automatically — nothing else needs to
// change.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Everything about the "download the app" experience — the MediaFire link,
// version/size labels, changelog, iOS availability, and a download counter —
// lives in one config object so the Admin dashboard can edit all of it
// without touching code.
//
// It's backed by a small live server (soft-store-backend, on Render) with
// its own Postgres database, so every visitor sees the same config. If that
// server is ever unreachable, it falls back to this browser's local storage
// so the page still works.
// ---------------------------------------------------------------------------

const BACKEND_URL = "https://soft-store-backend.onrender.com";
const CONFIG_ENDPOINT = `${BACKEND_URL}/api/app-config/soft-store-download`;
// Set in the frontend's environment (e.g. .env: VITE_ADMIN_KEY=...) — only
// needed for saving from the Admin dashboard; reading is public.
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || "";
const LOCAL_STORAGE_KEY = "softstore_app_config";

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

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    // ignore malformed/blocked storage
  }
  return { ...DEFAULT_CONFIG };
}

function writeLocal(config) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage errors (private browsing, quota, etc)
  }
}

/** Loads the current app-download config (MediaFire link, version, changelog, etc). */
export async function getAppConfig() {
  try {
    const res = await fetch(CONFIG_ENDPOINT);
    if (res.ok) {
      const data = await res.json();
      const merged = { ...DEFAULT_CONFIG, ...data };
      writeLocal(merged); // keep a local mirror in case the server is briefly unreachable
      return merged;
    }
    throw new Error(`status ${res.status}`);
  } catch {
    return readLocal();
  }
}

/**
 * Merges `patch` into the config and saves it to the live backend.
 * Throws if the save is rejected (e.g. wrong admin key) so the Admin UI can
 * surface that — it only silently falls back to local storage when the
 * server itself is unreachable.
 */
export async function saveAppConfig(patch) {
  const current = await getAppConfig();
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  try {
    const res = await fetch(CONFIG_ENDPOINT, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const saved = await res.json();
      writeLocal(saved);
      return saved;
    }
    if (res.status === 401) {
      throw new Error("Save rejected: missing or wrong admin key (set VITE_ADMIN_KEY).");
    }
    throw new Error(`Save failed (status ${res.status})`);
  } catch (err) {
    if (err.message?.startsWith("Save rejected") || err.message?.startsWith("Save failed")) throw err;
    // network-level failure (server unreachable) — fall back to local so the UI still works
    writeLocal(next);
    return next;
  }
}

/** Call whenever someone starts a download (button click or QR scan). */
export async function incrementDownloadCount() {
  const current = await getAppConfig();
  try {
    return (await saveAppConfig({ downloadCount: (current.downloadCount || 0) + 1 })).downloadCount;
  } catch {
    // counting a download should never block or break the actual download
    return current.downloadCount || 0;
  }
}

export function isValidMediaFireUrl(url) {
  try {
    const parsed = new URL(url);
    return /(^|\.)mediafire\.com$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}
