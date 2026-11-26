import React from "react";
import { Stars } from "./Stars";

const fmt = (n) => Number(n || 0).toLocaleString();

/** Play-Store style: big average on the left, thin 5→1 distribution bars on the right. */
export default function RatingSummary({ average, count, histogram }) {
  const rows = [5, 4, 3, 2, 1].map((star) => ({ star, n: histogram?.[star] || 0 }));
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="flex items-center gap-6">
      <div className="shrink-0">
        <p className="text-[56px] font-normal leading-none tracking-tight">{count ? Number(average).toFixed(1) : "–"}</p>
        <div className="mt-2"><Stars value={average} size="h-3.5 w-3.5" /></div>
        <p className="mt-1.5 text-xs text-neutral-400">{fmt(count)} {count === 1 ? "review" : "reviews"}</p>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {rows.map(({ star, n }) => (
          <div key={star} className="flex items-center gap-3">
            <span className="w-2 text-xs text-neutral-300">{star}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#1f3256]" title={`${fmt(n)} ratings`}>
              <div className="h-full rounded-full bg-[#a8c7fa]" style={{ width: `${(n / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
