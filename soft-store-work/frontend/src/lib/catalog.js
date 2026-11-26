// Turns backend catalog apps and the built-in sample products into one card
// shape, and loads lists with a graceful fallback to the samples when the
// catalog is empty or unreachable.
import { fetchApps } from "@/api/store";
import { placeholderShot } from "@/lib/demoApps";

const cap = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);

export function fromBackend(a) {
  return {
    id: a.packageName, name: a.title, category: cap(a.category), rating: a.rating?.average || 0, downloads: a.downloadsLabel,
    icon: a.icon, initials: a.title.slice(0, 2).toUpperCase(), banner: a.featureGraphic || null, shots: a.screenshots || [],
    desc: a.shortDescription, source: "backend",
  };
}

export function fromDemo(p) {
  return {
    id: String(p.id), name: p.name, category: p.category, rating: Number(p.rating), downloads: p.downloads, icon: null,
    initials: p.icon, banner: null, shots: [0, 1].map((i) => placeholderShot(p.name, p.icon, i)), desc: p.desc, price: p.price, source: "demo",
  };
}

function demoFilter(demo, { q, category }) {
  const needle = String(q || "").toLowerCase();
  return demo.filter(
    (p) =>
      (!category || p.category.toLowerCase() === String(category).toLowerCase()) &&
      (!needle || `${p.name} ${p.category} ${p.desc}`.toLowerCase().includes(needle))
  );
}

/** params: { q, category, sort, limit, offset } -> { items, nextOffset, source } */
export async function loadApps(params, demo = []) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""));
  try {
    const data = await fetchApps(clean);
    if (data.items?.length || Number(params.offset) > 0) {
      return { items: data.items.map(fromBackend), nextOffset: data.nextOffset ?? null, source: "backend" };
    }
  } catch {
    // backend unreachable — fall through to the samples
  }
  return { items: demoFilter(demo, params).map(fromDemo), nextOffset: null, source: "demo" };
}
