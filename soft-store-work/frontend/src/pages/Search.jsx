import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, X } from "lucide-react";
import { loadApps } from "@/lib/catalog";
import PageShell from "@/components/store/PageShell";
import AppCard from "@/components/store/AppCard";
import { products } from "./Store";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get("q") || "");
  const [q, setQ] = useState(text.trim());

  // debounce typing, and keep ?q= in the URL so Back works
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(text.trim());
      setParams(text.trim() ? { q: text.trim() } : {}, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [text, setParams]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", q],
    queryFn: () => loadApps(q ? { q, limit: 24 } : { sort: "top", limit: 8 }, products),
    staleTime: 30_000,
  });
  const items = data?.items || [];

  return (
    <PageShell title="Search">
      <label className="flex h-12 items-center gap-3 rounded-full bg-[#1b1b1d] px-5 text-neutral-400 ring-1 ring-white/[0.04] focus-within:ring-white/20">
        <SearchIcon className="h-5 w-5 shrink-0" />
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search apps, games, tools and more"
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
        />
        {text && <button onClick={() => setText("")} aria-label="Clear" className="rounded-full p-1 hover:bg-white/10"><X className="h-4 w-4" /></button>}
      </label>

      <h2 className="mb-4 mt-8 text-lg font-semibold">{q ? `Results for “${q}”` : "Popular right now"}</h2>

      {items.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map((a) => <AppCard key={a.id} app={a} />)}</div>
      ) : isFetching ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-[120px] animate-pulse rounded-2xl bg-white/[0.04]" />)}</div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-sm text-neutral-500">No apps found. Try a different search.</div>
      )}
    </PageShell>
  );
}
