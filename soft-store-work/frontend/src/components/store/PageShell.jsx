import React from "react";
import { Link } from "react-router-dom";

/** Simple top bar + container used by the Apps and Search pages. */
export default function PageShell({ title, children }) {
  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center gap-3 px-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-sm font-black text-black">SS</div>
            <span className="text-lg font-semibold tracking-tight">Soft Store</span>
          </Link>
          <span className="text-neutral-700">/</span>
          <h1 className="text-base font-medium text-neutral-300">{title}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}
