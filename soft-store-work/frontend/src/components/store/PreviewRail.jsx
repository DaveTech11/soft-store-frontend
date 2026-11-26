import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { loadApps } from "@/lib/catalog";
import { AppIcon } from "./AppCard";

const img = "h-full w-full object-cover";

// Clear, uncropped-feeling preview: banner if the developer uploaded one,
// otherwise the first two screenshots side by side.
function Preview({ app }) {
  if (app.banner) return <img src={app.banner} alt="" loading="lazy" decoding="async" className={img} />;
  if (app.shots.length >= 2) {
    return (
      <div className="grid h-full grid-cols-2 gap-px bg-white/10">
        {app.shots.slice(0, 2).map((s, i) => <img key={i} src={s} alt="" loading="lazy" decoding="async" className={`${img} object-top`} />)}
      </div>
    );
  }
  if (app.shots.length === 1) return <img src={app.shots[0]} alt="" loading="lazy" decoding="async" className={`${img} object-top`} />;
  return <div className="grid h-full place-items-center bg-gradient-to-br from-[#26262b] to-[#0e0e10] text-6xl font-black text-white/20">{app.initials}</div>;
}

function PreviewCard({ app }) {
  return (
    <Link
      to={`/app/${encodeURIComponent(app.id)}`}
      className="group w-[290px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111113] transition hover:border-white/[0.18] sm:w-[330px]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#0b0b0c]">
        <div className="h-full w-full transition duration-500 group-hover:scale-[1.03]"><Preview app={app} /></div>
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.06]" />
      </div>
      <div className="flex items-center gap-3 p-3">
        <AppIcon app={app} size="h-12 w-12" radius="rounded-[14px]" text="text-base" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{app.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-neutral-500">
            <span>{app.category}</span><span className="text-neutral-700">•</span>
            <span className="flex items-center gap-0.5 text-neutral-300"><Star className="h-3 w-3 fill-current" />{app.rating ? Number(app.rating).toFixed(1) : "–"}</span>
          </p>
        </div>
        <span className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black">Install</span>
      </div>
    </Link>
  );
}

export default function PreviewRail({ demo = [] }) {
  const rail = useRef(null);
  const { data, isLoading } = useQuery({ queryKey: ["home-preview"], queryFn: () => loadApps({ sort: "new", limit: 10 }, demo), staleTime: 60_000 });
  const scroll = (dir) => rail.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  const items = data?.items || [];

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold">Fresh from developers</h2>
          <p className="mt-1 text-xs text-neutral-500">A first look at the newest apps</p>
        </div>
        <Link to="/apps" className="flex items-center gap-1 text-sm font-medium text-neutral-300 hover:text-white">See all <ArrowRight className="h-4 w-4" /></Link>
      </div>
      <div className="relative">
        <div ref={rail} className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {isLoading
            ? [0, 1, 2].map((i) => <div key={i} className="h-[260px] w-[290px] shrink-0 animate-pulse rounded-2xl bg-white/[0.04] sm:w-[330px]" />)
            : items.map((app) => <PreviewCard key={app.id} app={app} />)}
        </div>
        {items.length > 2 && (
          <>
            <button onClick={() => scroll(-1)} aria-label="Scroll left" className="absolute left-2 top-[90px] hidden rounded-full bg-black/70 p-2 text-white backdrop-blur hover:bg-black md:block"><ChevronLeft className="h-5 w-5" /></button>
            <button onClick={() => scroll(1)} aria-label="Scroll right" className="absolute right-2 top-[90px] hidden rounded-full bg-black/70 p-2 text-white backdrop-blur hover:bg-black md:block"><ChevronRight className="h-5 w-5" /></button>
          </>
        )}
      </div>
    </section>
  );
}
