// Helpers for the built-in sample products on the Store page (they don't live
// in the backend). Gives them screenshots / ratings so their detail page looks
// complete, and keeps visitor reviews for them in this browser only.

const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// "25K+" -> 25000
export function parseDownloads(label) {
  const m = /([\d.]+)\s*([KMB]?)/i.exec(String(label || ""));
  if (!m) return 0;
  return Number(m[1]) * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2].toUpperCase()] || 1);
}

// Phone-shaped placeholder "screenshot" as an SVG data URI.
export function placeholderShot(name, initials, index) {
  const h = hash(name) % 360;
  const a = `hsl(${h} 45% 22%)`;
  const b = `hsl(${(h + 50) % 360} 55% 10%)`;
  const rows = [0, 1, 2, 3]
    .map((i) => `<rect x='28' y='${330 + i * 62}' width='${i % 2 ? 230 : 304}' height='44' rx='14' fill='white' fill-opacity='${0.1 - i * 0.012}'/>`)
    .join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='640' viewBox='0 0 360 640'>
<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs>
<rect width='360' height='640' fill='url(#g)'/>
<rect x='140' y='14' width='80' height='8' rx='4' fill='white' fill-opacity='0.25'/>
<circle cx='180' cy='190' r='62' fill='white' fill-opacity='0.92'/>
<text x='180' y='207' text-anchor='middle' font-family='Arial,sans-serif' font-size='46' font-weight='800' fill='#111'>${initials}</text>
<text x='180' y='290' text-anchor='middle' font-family='Arial,sans-serif' font-size='22' font-weight='700' fill='white'>${String(name).replace(/[<&]/g, "")}</text>
<text x='180' y='312' text-anchor='middle' font-family='Arial,sans-serif' font-size='12' fill='white' fill-opacity='0.5'>Preview ${index + 1}</text>
${rows}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// A plausible 1-5 star spread around the product's rating (sample only).
export function sampleHistogram(rating, downloadsLabel) {
  const r = Number(rating) || 4;
  const total = Math.max(20, Math.round(parseDownloads(downloadsLabel) * 0.04));
  const w = [1, 2, 3, 4, 5].map((k) => Math.exp(-Math.pow(k - r, 2) / 0.9));
  const sum = w.reduce((a, b) => a + b, 0);
  const hist = {};
  [1, 2, 3, 4, 5].forEach((k, i) => (hist[k] = Math.round((w[i] / sum) * total)));
  return { histogram: hist, count: Object.values(hist).reduce((a, b) => a + b, 0) };
}

const key = (id) => `softstore_demo_reviews_${id}`;

export function readDemoReviews(id) {
  try {
    return JSON.parse(localStorage.getItem(key(id)) || "[]");
  } catch {
    return [];
  }
}

export function saveDemoReview(id, { rating, body, author }) {
  const now = new Date().toISOString();
  const list = readDemoReviews(id).filter((r) => r.mine !== true);
  const review = { id: `local-${Date.now()}`, author: author || "You", rating, body, createdAt: now, updatedAt: now, mine: true };
  try {
    localStorage.setItem(key(id), JSON.stringify([review, ...list]));
  } catch {
    // storage unavailable — review just won't persist
  }
  return review;
}
