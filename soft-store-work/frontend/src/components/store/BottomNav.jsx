import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Search, Settings } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Home", Icon: Home, match: (p) => p === "/" },
  { to: "/apps", label: "Apps", Icon: LayoutGrid, match: (p) => p === "/apps" || p.startsWith("/app/") },
  { to: "/search", label: "Search", Icon: Search, match: (p) => p.startsWith("/search") },
  { to: "/settings", label: "Settings", Icon: Settings, match: (p) => p.startsWith("/settings") },
];

// Only on the store-style screens (not login, chat, admin...).
const visible = (p) => ["/", "/apps", "/search", "/settings", "/premium"].includes(p) || p.startsWith("/app/");

export default function BottomNav() {
  const { pathname } = useLocation();
  if (!visible(pathname)) return null;
  return (
    <>
      <div aria-hidden className="h-24 lg:h-28" /> {/* keeps page content clear of the bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0d0d0f]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:inset-x-auto lg:bottom-6 lg:left-1/2 lg:w-full lg:max-w-md lg:-translate-x-1/2 lg:rounded-full lg:border lg:pb-0 lg:shadow-2xl lg:shadow-black/60"
      >
        <ul className="flex items-center justify-around px-2 py-2">
          {ITEMS.map(({ to, label, Icon, match }) => {
            const active = match(pathname);
            return (
              <li key={to} className="flex-1">
                <Link to={to} aria-current={active ? "page" : undefined} className="group flex flex-col items-center gap-1 py-1">
                  <span className={`grid h-8 w-14 place-items-center rounded-full transition ${active ? "bg-white text-black" : "text-neutral-500 group-hover:bg-white/5 group-hover:text-white"}`}>
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                  </span>
                  <span className={`text-[11px] font-medium ${active ? "text-white" : "text-neutral-500"}`}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
