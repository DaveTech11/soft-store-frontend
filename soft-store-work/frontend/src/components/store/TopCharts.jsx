import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { fetchApps } from "@/api/store";
import { parseDownloads } from "@/lib/demoApps";

const TABS = [
  { key: "top", label: "Top free" },
  { key: "trending", label: "Trending" },
  { key: "rating", label: "Top rated" },
];

const cap = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);

// Live charts from the backend catalog; falls back to the sample products
// when the catalog is empty or unreachable so the section is never blank.
function demoChart(tab, demo) {
  const items = demo.map((p) => ({
    id: String(p.id), name: p.name, category: p.category, rating: Number(p.rating), downloads: p.downloads,
    icon: null, initials: p.icon, downloadCount: parseDownloads(p.downloads), badge: p.badge, price: p.price,
  }));
  if (tab === "rating") return items.sort((a, b) => b.rating - a.rating || b.downloadCount - a.downloadCount);
  if (tab === "trending") {
    const hot = { Trending: 0, New: 1, Popular: 2, Featured: 3 };
    return items.sort((a, b) => (hot[a.badge] ?? 9) - (hot[b.badge] ?? 9) || b.downloadCount - a.downloadCount);
  }
  return items.filter((i) => i.price === "Free").sort((a, b) => b.downloadCount - a.downloadCount);
}

async function loadChart(tab, demo) {
  try {
    const data = await fetchApps({ sort: tab, limit: 10 });
    if (data.items?.length) {
      return data.items.map((a) => ({
        id: a.packageName, name: a.title, category: cap(a.category), rating: a.rating.average, downloads: a.downloadsLabel,
        icon: a.icon, initials: a.title.slice(0, 2).toUpperCase(),
      }));
    }
  } catch {
    // backend unreachable — use samples below
  }
  return demoChart(tab, demo).slice(0, 10);
}

function Row({ rank, item }) {
  return (
    <Link
      to={`/app/${encodeURIComponent(item.id)}`}
      className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#111113] p-3 transition hover:border-white/[0.16] hover:bg-[#151517]"
    >
      <span className="w-6 shrink-0 text-center text-lg font-semibold text-neutral-500">{rank}</span>
      {item.icon ? (
        <img src={item.icon} alt="" className="h-14 w-14 shrink-0 rounded-[16px] object-cover" loading="lazy" />
      ) : (
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[16px] bg-gradient-to-br from-white to-neutral-400 font-black text-black">{item.initials}</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{item.name}</p>
        <p className="truncate text-xs text-neutral-500">{item.category}</p>
        <div className="mt-1 flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-0.5 font-medium"><Star className="h-3 w-3 fill-current" /> {item.rating ? Number(item.rating).toFixed(1) : "–"}</span>
          <span className="text-neutral-600">•</span>
          <span className="text-neutral-500">{item.downloads}</span>
        </div>
      </div>
    </Link>
  );
}

export default function TopCharts({ demo = [] }) {
  const [tab, setTab] = useState("top");
  const { data, isLoading } = useQuery({ queryKey: ["top-charts", tab], queryFn: () => loadChart(tab, demo), staleTime: 60_000 });

  return (
    <section className="mt-10">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Top charts</h2>
        <p className="mt-1 text-xs text-neutral-500">The most downloaded and best loved right now</p>
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${tab === t.key ? "bg-white text-black" : "bg-white/[0.06] text-neutral-300 hover:bg-white/10"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[82px] animate-pulse rounded-2xl bg-white/[0.04]" />)}</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">{(data || []).map((item, i) => <Row key={item.id} rank={i + 1} item={item} />)}</div>
      )}
    </section>
  );
}
