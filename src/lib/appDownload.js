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

const CONFIG_ENDPOINT = "/api/app-config/soft-store-download";
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
    const res = await fetch(CONFIG_ENDPOINT, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      const merged = { ...DEFAULT_CONFIG, ...(data.config || data) };
      writeLocal(merged); // keep a local mirror as an offline fallback
      return merged;
    }
    throw new Error(`status ${res.status}`);
  } catch {
    return readLocal();
  }
}

/** Merges `patch` into the config and saves it (backend first, local fallback). */
export async function saveAppConfig(patch) {
  const current = await getAppConfig();
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  try {
    const res = await fetch(CONFIG_ENDPOINT, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch {
    // no backend endpoint yet — that's fine, local mirror below still works
  }
  writeLocal(next);
  return next;
}

/** Call whenever someone starts a download (button click or QR scan). */
export async function incrementDownloadCount() {
  const current = await getAppConfig();
  return (await saveAppConfig({ downloadCount: (current.downloadCount || 0) + 1 })).downloadCount;
}

export function isValidMediaFireUrl(url) {
  try {
    const parsed = new URL(url);
    return /(^|\.)mediafire\.com$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}
