import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/** Horizontal screenshot strip + full-screen viewer (arrows / swipe / Esc). */
export default function Screenshots({ shots = [], name = "App" }) {
  const [open, setOpen] = useState(null); // index or null
  const rail = useRef(null);

  const move = useCallback((dir) => setOpen((i) => (i === null ? i : (i + dir + shots.length) % shots.length)), [shots.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, move]);

  if (!shots.length) return null;
  const scroll = (dir) => rail.current?.scrollBy({ left: dir * 360, behavior: "smooth" });

  return (
    <div className="relative">
      <div ref={rail} className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shots.map((src, i) => (
          <button
            key={i}
            onClick={() => setOpen(i)}
            className="h-[300px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111113] transition hover:border-white/20 sm:h-[360px]"
          >
            <img src={src} alt={`${name} screenshot ${i + 1}`} loading="lazy" className="h-full w-auto object-cover" />
          </button>
        ))}
      </div>
      {shots.length > 2 && (
        <>
          <button onClick={() => scroll(-1)} aria-label="Scroll left" className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/70 p-2 text-white backdrop-blur hover:bg-black md:block"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={() => scroll(1)} aria-label="Scroll right" className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/70 p-2 text-white backdrop-blur hover:bg-black md:block"><ChevronRight className="h-5 w-5" /></button>
        </>
      )}

      {open !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setOpen(null)}>
          <button onClick={() => setOpen(null)} aria-label="Close" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 hover:bg-white/20"><X className="h-5 w-5" /></button>
          {shots.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); move(-1); }} aria-label="Previous" className="absolute left-3 rounded-full bg-white/10 p-3 hover:bg-white/20"><ChevronLeft className="h-6 w-6" /></button>
              <button onClick={(e) => { e.stopPropagation(); move(1); }} aria-label="Next" className="absolute right-3 rounded-full bg-white/10 p-3 hover:bg-white/20"><ChevronRight className="h-6 w-6" /></button>
            </>
          )}
          <img src={shots[open]} alt={`${name} screenshot ${open + 1}`} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-full rounded-2xl object-contain" />
          <span className="absolute bottom-4 rounded-full bg-white/10 px-3 py-1 text-xs text-neutral-300">{open + 1} / {shots.length}</span>
        </div>
      )}
    </div>
  );
}
