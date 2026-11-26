import React, { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/api/store";
import { loadApps } from "@/lib/catalog";
import PageShell from "@/components/store/PageShell";
import AppCard from "@/components/store/AppCard";
import { products } from "./Store";

const cap = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);

export default function Apps() {
  const [category, setCategory] = useState("");

  const cats = useQuery({
    queryKey: ["categories"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      try {
        const rows = await fetchCategories();
        if (rows.length) return rows.map((r) => r.category);
      } catch {
        // fall back to the sample categories
      }
      return [...new Set(products.map((p) => p.category.toLowerCase()))];
    },
  });

  const list = useInfiniteQuery({
    queryKey: ["apps", category],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => loadApps({ category, sort: "top", limit: 12, offset: pageParam }, products),
    getNextPageParam: (last) => last.nextOffset ?? undefined,
  });
  const items = (list.data?.pages || []).flatMap((p) => p.items);

  const chip = (active) => `shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${active ? "bg-white text-black" : "bg-white/[0.06] text-neutral-300 hover:bg-white/10"}`;

  return (
    <PageShell title="Apps">
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button onClick={() => setCategory("")} className={chip(!category)}>All</button>
        {(cats.data || []).map((c) => <button key={c} onClick={() => setCategory(c)} className={chip(category === c)}>{cap(c)}</button>)}
      </div>

      {list.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-[120px] animate-pulse rounded-2xl bg-white/[0.04]" />)}</div>
      ) : items.length ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map((a) => <AppCard key={a.id} app={a} />)}</div>
          {list.hasNextPage && (
            <div className="mt-6 text-center">
              <button onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage} className="rounded-full border border-white/10 px-6 py-2.5 text-sm font-medium text-neutral-200 hover:bg-white/5 disabled:opacity-50">
                {list.isFetchingNextPage ? "Loading…" : "Show more"}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-sm text-neutral-500">No apps in this category yet.</div>
      )}
    </PageShell>
  );
}
