import React from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";

export function AppIcon({ app, size = "h-16 w-16", radius = "rounded-[18px]", text = "text-lg" }) {
  return app.icon ? (
    <img src={app.icon} alt="" loading="lazy" decoding="async" className={`${size} ${radius} shrink-0 object-cover shadow-lg`} />
  ) : (
    <div className={`grid ${size} ${radius} shrink-0 place-items-center bg-gradient-to-br from-white to-neutral-400 ${text} font-black text-black shadow-lg`}>{app.initials}</div>
  );
}

/** Grid / list card (Apps + Search pages). */
export default function AppCard({ app }) {
  return (
    <Link
      to={`/app/${encodeURIComponent(app.id)}`}
      className="flex min-w-0 gap-3 rounded-2xl border border-white/[0.08] bg-[#111113] p-3 transition hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-[#151517]"
    >
      <AppIcon app={app} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold">{app.name}</h3>
        <p className="truncate text-xs text-neutral-500">{app.category}</p>
        <div className="mt-1.5 flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-0.5 font-medium"><Star className="h-3 w-3 fill-current" /> {app.rating ? Number(app.rating).toFixed(1) : "–"}</span>
          <span className="text-neutral-600">•</span>
          <span className="text-neutral-500">{app.downloads}</span>
        </div>
        {app.desc && <p className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-500">{app.desc}</p>}
      </div>
    </Link>
  );
}
