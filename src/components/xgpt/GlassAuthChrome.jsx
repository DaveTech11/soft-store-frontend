import React from "react";

/**
 * Full-bleed dark backdrop with faceted "shattered glass" shard lines and a
 * soft rim glow, matching the reference mock (black background, angular
 * white hairline facets, glowing card edges).
 */
export function GlassBackdrop() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-black">
      {/* base radial glow behind the card */}
      <div
        className="absolute left-1/2 top-1/2 h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 70%)" }}
      />

      {/* faceted shard linework, left side */}
      <svg
        className="absolute -left-24 -top-16 h-[80%] w-[55%] opacity-[0.35]"
        viewBox="0 0 500 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g stroke="url(#shardStroke)" strokeWidth="1">
          <path d="M20 40 L180 10 L260 160 L140 220 L20 40Z" />
          <path d="M180 10 L340 60 L260 160 Z" />
          <path d="M140 220 L260 160 L330 300 L190 360 Z" />
          <path d="M20 40 L140 220 L60 380 L-40 260 Z" />
          <path d="M330 300 L430 260 L470 420 L360 460 L190 360 Z" />
          <path d="M60 380 L190 360 L220 520 L90 560 Z" />
          <path d="M220 520 L360 460 L400 620 L260 680 Z" />
          <path d="M90 560 L220 520 L260 680 L120 720 Z" />
        </g>
        <defs>
          <linearGradient id="shardStroke" x1="0" y1="0" x2="500" y2="800" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>

      {/* faceted shard linework, right side (mirrored) */}
      <svg
        className="absolute -right-24 -bottom-16 h-[80%] w-[55%] opacity-[0.35] scale-x-[-1]"
        viewBox="0 0 500 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g stroke="url(#shardStroke2)" strokeWidth="1">
          <path d="M20 40 L180 10 L260 160 L140 220 L20 40Z" />
          <path d="M180 10 L340 60 L260 160 Z" />
          <path d="M140 220 L260 160 L330 300 L190 360 Z" />
          <path d="M20 40 L140 220 L60 380 L-40 260 Z" />
          <path d="M330 300 L430 260 L470 420 L360 460 L190 360 Z" />
          <path d="M60 380 L190 360 L220 520 L90 560 Z" />
          <path d="M220 520 L360 460 L400 620 L260 680 Z" />
          <path d="M90 560 L220 520 L260 680 L120 720 Z" />
        </g>
        <defs>
          <linearGradient id="shardStroke2" x1="0" y1="0" x2="500" y2="800" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>

      {/* faint reflective floor */}
      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{ background: "linear-gradient(to top, rgba(255,255,255,0.04), rgba(255,255,255,0))" }}
      />
    </div>
  );
}

/** The X-mark + wordmark used at the top of the auth card. */
export function BrandMark({ className = "" }) {
  return (
    <div className={`text-center ${className}`}>
      <svg width="56" height="56" viewBox="0 0 56 56" className="mx-auto mb-3" aria-hidden="true">
        <defs>
          <linearGradient id="xmark" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#8a8a8a" />
          </linearGradient>
        </defs>
        <path d="M4 6 L26 28 L4 50" stroke="url(#xmark)" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M52 6 L30 28 L52 50" stroke="url(#xmark)" strokeWidth="6" fill="none" strokeLinecap="round" />
      </svg>
      <div className="text-[26px] font-bold tracking-[0.35em] text-white">SOFT STORE</div>
      <div className="mt-1 text-[10px] tracking-[0.25em] text-white/40">
        YOUR SHOP. YOUR STYLE. YOUR STORE.
      </div>
    </div>
  );
}

/** The glass card shell that hosts the auth form. */
export function GlassCard({ children, className = "" }) {
  return (
    <div
      className={`relative rounded-[28px] border border-white/10 bg-white/[0.03] p-8 shadow-[0_0_60px_-15px_rgba(255,255,255,0.15)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}
