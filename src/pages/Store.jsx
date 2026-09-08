import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, Home, Gamepad2, Grid3X3, BookOpen, Download, Crown, User,
  Star, MoreVertical, ArrowRight, Smartphone, ShieldCheck, Zap, Code2,
  Menu, X
} from "lucide-react";

const products = [
  { id:1, name:"Soft Store", category:"Apps", rating:"4.8", downloads:"10K+", price:"Free", icon:"SS", badge:"Editor's choice", desc:"Your modern app marketplace." },
  { id:2, name:"Vortyx AI", category:"AI & Tools", rating:"4.9", downloads:"25K+", price:"Free", icon:"VX", badge:"Popular", desc:"AI tools built for creators." },
  { id:3, name:"xGPT", category:"Productivity", rating:"4.7", downloads:"18K+", price:"Free", icon:"xG", badge:"Trending", desc:"Write, code and create with AI." },
  { id:4, name:"Code Studio", category:"Development", rating:"4.8", downloads:"8K+", price:"Free", icon:"CS", badge:"New", desc:"A lightweight developer toolkit." },
  { id:5, name:"Media Hub", category:"Entertainment", rating:"4.5", downloads:"12K+", price:"Free", icon:"MH", badge:"Popular", desc:"Discover your next favorite media." },
  { id:6, name:"File Vault", category:"Tools", rating:"4.6", downloads:"7K+", price:"$2.99", icon:"FV", badge:"Premium", desc:"Keep your important files organized." },
  { id:7, name:"AI Writer", category:"Productivity", rating:"4.8", downloads:"31K+", price:"Free", icon:"AW", badge:"Top rated", desc:"Create clean content in seconds." },
  { id:8, name:"Dev Tools", category:"Development", rating:"4.7", downloads:"6K+", price:"$1.99", icon:"DT", badge:"Featured", desc:"Useful utilities for developers." },
];

const categories = [
  ["Apps", Smartphone], ["Games", Gamepad2], ["AI & Tools", Zap],
  ["Productivity", BookOpen], ["Development", Code2], ["Tools", Grid3X3]
];

function ProductCard({ product }) {
  return (
    <div className="group min-w-0 rounded-2xl border border-white/[0.08] bg-[#111113] p-3 transition hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-[#151517]">
      <div className="flex gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[18px] bg-gradient-to-br from-white to-neutral-400 text-lg font-black text-black shadow-lg">
          {product.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold text-white">{product.name}</h3>
            <button className="shrink-0 rounded-full p-1 text-neutral-500 hover:bg-white/5 hover:text-white"><MoreVertical className="h-4 w-4"/></button>
          </div>
          <p className="truncate text-xs text-neutral-500">{product.category}</p>
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <span className="flex items-center gap-0.5 font-medium text-white"><Star className="h-3 w-3 fill-current"/> {product.rating}</span>
            <span className="text-neutral-600">•</span>
            <span className="text-neutral-500">{product.downloads}</span>
          </div>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-5 text-neutral-500">{product.desc}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-neutral-300">{product.price}</span>
        <button className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition hover:bg-neutral-200">
          {product.price === "Free" ? "Get" : "Buy"}
        </button>
      </div>
    </div>
  );
}

export default function Store() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [mobileNav, setMobileNav] = useState(false);

  const filtered = useMemo(() => products.filter(p =>
    (category === "All" || p.category === category) &&
    `${p.name} ${p.category} ${p.desc}`.toLowerCase().includes(query.toLowerCase())
  ), [query, category]);

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-4 px-4 lg:px-8">
          <button onClick={() => setMobileNav(!mobileNav)} className="rounded-full p-2 text-neutral-400 hover:bg-white/5 lg:hidden">
            {mobileNav ? <X/> : <Menu/>}
          </button>
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-sm font-black text-black">SS</div>
            <span className="text-lg font-semibold tracking-tight">Soft Store</span>
          </Link>
          <div className="mx-auto hidden w-full max-w-2xl md:block">
            <label className="flex h-11 items-center gap-3 rounded-full bg-[#1b1b1d] px-4 text-neutral-400 ring-1 ring-white/[0.04] focus-within:ring-white/20">
              <Search className="h-5 w-5 shrink-0"/>
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search apps, games, tools and more" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"/>
            </label>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Link to="/premium" className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 sm:flex"><Crown className="h-4 w-4"/> Premium</Link>
            <Link to="/download" className="hidden rounded-full p-2 text-neutral-400 hover:bg-white/5 sm:block"><Download className="h-5 w-5"/></Link>
            <Link to="/settings" className="rounded-full p-2 text-neutral-400 hover:bg-white/5"><User className="h-5 w-5"/></Link>
          </div>
        </div>
        <div className="px-4 pb-3 md:hidden">
          <label className="flex h-11 items-center gap-3 rounded-full bg-[#1b1b1d] px-4 text-neutral-400">
            <Search className="h-5 w-5"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search Soft Store" className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"/>
          </label>
        </div>
      </header>

      {mobileNav && <div className="fixed inset-x-0 top-[117px] z-30 border-b border-white/10 bg-[#0d0d0f] p-4 lg:hidden">
        <div className="grid grid-cols-2 gap-2">
          {[["Home", Home, "/"],["Premium", Crown, "/premium"],["Downloads", Download, "/download"],["Settings", User, "/settings"]].map(([n,I,to])=>
            <Link key={n} to={to} onClick={()=>setMobileNav(false)} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 text-sm text-neutral-300"><I className="h-4 w-4"/>{n}</Link>
          )}
        </div>
      </div>}

      <div className="mx-auto flex max-w-[1500px]">
        <aside className="hidden w-60 shrink-0 border-r border-white/[0.08] px-4 py-6 lg:block">
          <nav className="space-y-1">
            <Link to="/" className="flex items-center gap-3 rounded-full bg-white/[0.1] px-4 py-3 text-sm font-medium"><Home className="h-5 w-5"/> Home</Link>
            <button className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-sm text-neutral-400 hover:bg-white/5 hover:text-white"><Grid3X3 className="h-5 w-5"/> Apps</button>
            <button className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-sm text-neutral-400 hover:bg-white/5 hover:text-white"><Gamepad2 className="h-5 w-5"/> Games</button>
            <Link to="/download" className="flex items-center gap-3 rounded-full px-4 py-3 text-sm text-neutral-400 hover:bg-white/5 hover:text-white"><Download className="h-5 w-5"/> Downloads</Link>
            <Link to="/premium" className="flex items-center gap-3 rounded-full px-4 py-3 text-sm text-neutral-400 hover:bg-white/5 hover:text-white"><Crown className="h-5 w-5"/> Premium</Link>
          </nav>
          <div className="my-6 border-t border-white/[0.08]"/>
          <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-600">Explore</p>
          <nav className="space-y-1">
            <Link to="/codex" className="flex items-center gap-3 rounded-full px-4 py-3 text-sm text-neutral-400 hover:bg-white/5 hover:text-white"><Code2 className="h-5 w-5"/> Code</Link>
            <Link to="/settings" className="flex items-center gap-3 rounded-full px-4 py-3 text-sm text-neutral-400 hover:bg-white/5 hover:text-white"><User className="h-5 w-5"/> Account</Link>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10">
          <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#1a1a1d] via-[#111113] to-[#0b0b0c] p-6 sm:p-8 lg:p-10">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-neutral-300"><ShieldCheck className="h-3.5 w-3.5"/> Safe & curated software</span>
              <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Discover apps made for you.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-400 sm:text-base">Explore apps, tools, AI products and digital downloads in one simple marketplace.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={()=>document.getElementById("apps")?.scrollIntoView({behavior:"smooth"})} className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black">Explore store <ArrowRight className="h-4 w-4"/></button>
                <Link to="/download" className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-neutral-200 hover:bg-white/5">Get Soft Store</Link>
              </div>
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Browse categories</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <button onClick={()=>setCategory("All")} className={`rounded-2xl border p-4 text-left transition ${category==="All" ? "border-white/20 bg-white/10" : "border-white/[0.07] bg-[#111113] hover:bg-white/5"}`}>
                <Grid3X3 className="h-5 w-5"/><p className="mt-3 text-sm font-medium">All</p>
              </button>
              {categories.map(([name, Icon])=><button key={name} onClick={()=>setCategory(name)} className={`rounded-2xl border p-4 text-left transition ${category===name ? "border-white/20 bg-white/10" : "border-white/[0.07] bg-[#111113] hover:bg-white/5"}`}><Icon className="h-5 w-5 text-neutral-300"/><p className="mt-3 text-sm font-medium">{name}</p></button>)}
            </div>
          </section>

          <section id="apps" className="mt-10">
            <div className="mb-4 flex items-end justify-between">
              <div><h2 className="text-xl font-semibold">{category === "All" ? "Recommended for you" : category}</h2><p className="mt-1 text-xs text-neutral-500">{filtered.length} apps available</p></div>
              <button className="flex items-center gap-1 text-sm font-medium text-neutral-300 hover:text-white">See all <ArrowRight className="h-4 w-4"/></button>
            </div>
            {filtered.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map(p=><ProductCard key={p.id} product={p}/>)}</div> :
              <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-sm text-neutral-500">No products match your search.</div>}
          </section>

          <section className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-[#111113] p-6">
              <Zap className="h-6 w-6"/><h3 className="mt-4 text-lg font-semibold">Trending now</h3><p className="mt-1 text-sm text-neutral-500">Popular tools and apps people are getting today.</p>
              <button className="mt-5 flex items-center gap-2 text-sm font-semibold">Explore trending <ArrowRight className="h-4 w-4"/></button>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#111113] p-6">
              <Crown className="h-6 w-6"/><h3 className="mt-4 text-lg font-semibold">Go Premium</h3><p className="mt-1 text-sm text-neutral-500">Unlock premium products and more Soft Store features.</p>
              <Link to="/premium" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">View plans <ArrowRight className="h-4 w-4"/></Link>
            </div>
          </section>

          <footer className="mt-14 border-t border-white/[0.08] py-8 text-xs text-neutral-600">
            <div className="flex flex-wrap items-center justify-between gap-4"><span>© 2026 Soft Store</span><div className="flex gap-4"><Link to="/settings" className="hover:text-neutral-300">Settings</Link><Link to="/premium" className="hover:text-neutral-300">Premium</Link><Link to="/download" className="hover:text-neutral-300">Download</Link></div></div>
          </footer>
        </main>
      </div>
    </div>
  );
}
