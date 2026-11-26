import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, ChevronDown, Download, ExternalLink, Globe, Lock, MoreVertical, Share2, Star } from "lucide-react";
import { fetchApp, fetchReviews, postReview } from "@/api/store";
import { placeholderShot, readDemoReviews, sampleHistogram, saveDemoReview } from "@/lib/demoApps";
import { products } from "./Store";
import Screenshots from "@/components/store/Screenshots";
import RatingSummary from "@/components/store/RatingSummary";
import { ReviewForm, ReviewList } from "@/components/store/Reviews";
import { AppIcon } from "@/components/store/AppCard";
import { loadApps } from "@/lib/catalog";

const isPackage = (id) => id.includes(".");
const MY_REVIEW_KEY = (id) => `softstore_my_review_${id}`;
const readMine = (id) => { try { return JSON.parse(localStorage.getItem(MY_REVIEW_KEY(id)) || "null"); } catch { return null; } };

// One view-model for both real catalog apps and the built-in sample products.
async function loadApp(id) {
  if (isPackage(id)) {
    const a = await fetchApp(id);
    return {
      source: "backend", id, name: a.title, initials: a.title.slice(0, 2).toUpperCase(), icon: a.icon,
      category: a.category, developer: a.developer, shortDesc: a.shortDescription, description: a.description,
      rating: a.rating, downloads: a.downloadsLabel, contentRating: a.contentRating,
      size: a.latestVersion?.sizeLabel, version: a.latestVersion?.versionName, updatedAt: a.latestVersion?.updatedAt || a.updatedAt,
      whatsNew: a.latestVersion?.changelog, screenshots: a.screenshots || [], installUrl: a.downloadUrl,
      website: a.website, privacyPolicyUrl: a.privacyPolicyUrl, tags: Array.isArray(a.tags) ? a.tags : [],
    };
  }
  const p = products.find((x) => String(x.id) === String(id));
  if (!p) throw Object.assign(new Error("not found"), { status: 404 });
  const sample = sampleHistogram(p.rating, p.downloads);
  return {
    source: "demo", id: String(p.id), name: p.name, initials: p.icon, icon: null, category: p.category, developer: "Soft Store",
    shortDesc: p.desc, description: `${p.desc}\n\nThis is a sample listing. Publish the app from the Soft Store admin to show real downloads, screenshots and ratings here.`,
    rating: { average: Number(p.rating), count: sample.count, histogram: sample.histogram }, downloads: p.downloads, contentRating: "Everyone",
    screenshots: [0, 1, 2, 3].map((i) => placeholderShot(p.name, p.icon, i)), installUrl: null, price: p.price, badge: p.badge,
  };
}

const ACCENT = "bg-[#a8c7fa] text-[#062e6f]";
const WISH_KEY = "softstore_wishlist";
const readWish = () => { try { return JSON.parse(localStorage.getItem(WISH_KEY) || "[]"); } catch { return []; } };
const when = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); } catch { return ""; } };

function Stat({ top, bottom }) {
  return (
    <div className="min-w-[96px] flex-1 px-3 text-center first:pl-0 last:pr-0">
      <div className="flex h-6 items-center justify-center gap-1 text-sm font-medium">{top}</div>
      <div className="mt-1 text-xs text-neutral-400">{bottom}</div>
    </div>
  );
}

// Section title with the round arrow button Play uses.
function SectionTitle({ children, onArrow, open, label }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xl font-medium tracking-tight">{children}</h2>
      {onArrow && (
        <button type="button" onClick={onArrow} aria-label={label} className="grid h-11 w-11 place-items-center rounded-full bg-[#2a2a2d] text-neutral-200 hover:bg-[#35353a]">
          {open === undefined ? <ArrowRight className="h-5 w-5" /> : <ChevronDown className={`h-5 w-5 transition ${open ? "rotate-180" : ""}`} />}
        </button>
      )}
    </div>
  );
}

const Chip = ({ children }) => <span className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-neutral-200">{children}</span>;

function SimilarApps({ app }) {
  const { data } = useQuery({
    queryKey: ["similar", app.id],
    queryFn: () => loadApps({ category: app.category, sort: "top", limit: 12 }, products),
    staleTime: 60_000,
  });
  const items = (data?.items || []).filter((x) => String(x.id) !== String(app.id)).slice(0, 10);
  if (!items.length) return null;
  return (
    <section className="mt-10">
      <SectionTitle>Similar apps</SectionTitle>
      <div className="-mx-4 mt-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((x) => (
          <Link key={x.id} to={`/app/${encodeURIComponent(x.id)}`} className="w-[100px] shrink-0 snap-start sm:w-[110px]">
            <AppIcon app={x} size="h-[100px] w-[100px] sm:h-[110px] sm:w-[110px]" radius="rounded-[22px]" text="text-2xl" />
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-neutral-200">{x.name}</p>
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#1c1c1f] px-2 py-0.5 text-xs text-neutral-300">{x.rating ? Number(x.rating).toFixed(1) : "–"} <Star className="h-3 w-3 fill-[#a8c7fa] text-[#a8c7fa]" /></p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function AppDetail() {
  const { id: rawId } = useParams();
  const id = decodeURIComponent(rawId || "");
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [mine, setMine] = useState(() => readMine(id));
  const [wished, setWished] = useState(() => readWish().includes(id));
  const [toast, setToast] = useState("");

  const appQ = useQuery({ queryKey: ["app", id], queryFn: () => loadApp(id), retry: false });
  const app = appQ.data;

  const reviewsQ = useInfiniteQuery({
    queryKey: ["reviews", id],
    enabled: app?.source === "backend",
    initialPageParam: undefined,
    queryFn: ({ pageParam }) => fetchReviews(id, pageParam),
    getNextPageParam: (last) => last.nextCursor || undefined,
  });

  const [demoReviews, setDemoReviews] = useState(() => readDemoReviews(id));
  const reviews = useMemo(
    () => (app?.source === "backend" ? (reviewsQ.data?.pages || []).flatMap((p) => p.items) : demoReviews),
    [app?.source, reviewsQ.data, demoReviews]
  );

  const submit = useMutation({
    mutationFn: async (payload) => {
      if (app.source === "backend") return postReview(id, payload);
      const r = saveDemoReview(id, payload);
      setDemoReviews(readDemoReviews(id));
      return r;
    },
    onSuccess: (review, payload) => {
      const remembered = { rating: payload.rating, body: payload.body, author: payload.author };
      try { localStorage.setItem(MY_REVIEW_KEY(id), JSON.stringify(remembered)); } catch { /* ignore */ }
      setMine(remembered);
      if (app.source === "backend") {
        qc.invalidateQueries({ queryKey: ["reviews", id] });
        qc.invalidateQueries({ queryKey: ["app", id] });
      }
    },
  });

  const say = (t) => { setToast(t); setTimeout(() => setToast(""), 2200); };
  const toggleWish = () => {
    const list = readWish();
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    try { localStorage.setItem(WISH_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setWished(next.includes(id));
    say(next.includes(id) ? "Added to wishlist" : "Removed from wishlist");
  };
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: app?.name, url }); return; }
      await navigator.clipboard.writeText(url);
      say("Link copied");
    } catch { /* cancelled */ }
  };

  if (appQ.isLoading) {
    return <Shell><div className="space-y-4"><div className="h-28 animate-pulse rounded-3xl bg-white/[0.04]" /><div className="h-72 animate-pulse rounded-3xl bg-white/[0.04]" /></div></Shell>;
  }
  if (appQ.isError || !app) {
    return (
      <Shell>
        <div className="rounded-3xl border border-dashed border-white/10 py-20 text-center">
          <p className="text-lg font-semibold">App not found</p>
          <p className="mt-1 text-sm text-neutral-500">It may have been removed or isn’t published yet.</p>
          <Link to="/" className={`mt-5 inline-block rounded-full px-5 py-2 text-sm font-semibold ${ACCENT}`}>Back to store</Link>
        </div>
      </Shell>
    );
  }

  const paid = app.price && app.price !== "Free";
  const long = (app.description || "").length > 200;
  const desc = expanded || !long ? app.description : `${app.description.slice(0, 200).trimEnd()}…`;
  const hasSupport = app.website || app.privacyPolicyUrl;
  const installBtn = "flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition hover:brightness-110";

  return (
    <Shell
      right={
        <>
          <button onClick={toggleWish} aria-label={wished ? "Remove from wishlist" : "Add to wishlist"} className="rounded-full p-2.5 text-neutral-200 hover:bg-white/10">
            {wished ? <BookmarkCheck className="h-6 w-6 text-[#a8c7fa]" /> : <Bookmark className="h-6 w-6" />}
          </button>
          <button onClick={share} aria-label="Share" className="rounded-full p-2.5 text-neutral-200 hover:bg-white/10"><MoreVertical className="h-6 w-6" /></button>
        </>
      }
    >
      <header className="flex items-start gap-4">
        <AppIcon app={app} size="h-[72px] w-[72px] sm:h-24 sm:w-24" radius="rounded-[20px] sm:rounded-[26px]" text="text-2xl" />
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-medium leading-7 tracking-tight sm:text-3xl sm:leading-9">{app.name}</h1>
          <p className="mt-0.5 truncate text-sm font-medium text-[#a8c7fa]">{app.developer || "Soft Store"}</p>
          <p className="mt-0.5 truncate text-xs capitalize text-neutral-400">{app.category}{paid ? ` · ${app.price}` : " · Free"}</p>
        </div>
      </header>

      <div className="mt-6 flex items-center divide-x divide-white/10 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Stat
          top={<>{app.rating.count ? Number(app.rating.average).toFixed(1) : "–"} <Star className="h-3.5 w-3.5 fill-current" /></>}
          bottom={`${Number(app.rating.count).toLocaleString()} reviews`}
        />
        {app.size && <Stat top={app.size} bottom="Size" />}
        <Stat top={app.downloads} bottom="Downloads" />
        <Stat top={<span className="grid h-5 min-w-5 place-items-center rounded border border-neutral-400 px-1 text-[10px]">{String(app.contentRating || "E").slice(0, 3)}</span>} bottom={`Rated for ${app.contentRating || "Everyone"}`} />
      </div>

      <div className="mt-5">
        {app.installUrl ? (
          <a href={app.installUrl} className={`${installBtn} ${ACCENT}`}>
            <Download className="h-4 w-4" /> Install
          </a>
        ) : (
          <Link to="/download" className={`${installBtn} ${ACCENT}`}>
            {paid ? `Buy · ${app.price}` : "Install"}
          </Link>
        )}
        <div className="mt-3 flex items-center gap-2">
          <button onClick={share} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[#a8c7fa] hover:bg-white/5"><Share2 className="h-4 w-4" /> Share</button>
          <button onClick={toggleWish} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[#a8c7fa] hover:bg-white/5">
            {wished ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />} {wished ? "On your wishlist" : "Add to wishlist"}
          </button>
        </div>
      </div>

      <section className="mt-6"><Screenshots shots={app.screenshots} name={app.name} /></section>

      <section className="mt-8">
        <SectionTitle onArrow={() => setExpanded(!expanded)} open={expanded} label={expanded ? "Show less" : "Read more"}>About this app</SectionTitle>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-300">{desc || app.shortDesc}</p>
        {app.updatedAt && (
          <p className="mt-4 text-xs text-neutral-400">Updated on <span className="text-neutral-200">{when(app.updatedAt)}</span>{app.version ? <> · Version <span className="text-neutral-200">{app.version}</span></> : null}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {app.category && <Chip>{app.category}</Chip>}
          {app.tags?.slice(0, 6).map((t) => <Chip key={t}>{t}</Chip>)}
        </div>
        {app.whatsNew && expanded && (
          <div className="mt-5 rounded-3xl bg-[#1c1c1f] p-4">
            <p className="text-sm font-medium">What’s new{app.version ? ` · ${app.version}` : ""}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-300">{app.whatsNew}</p>
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionTitle>Data safety</SectionTitle>
        <p className="mt-3 text-sm leading-6 text-neutral-300">Safety starts with understanding how developers collect and share your data. Data privacy and security practices may vary based on your use, region, and age.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-3xl bg-[#1c1c1f] p-4">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-neutral-300" />
            <p className="text-sm leading-6 text-neutral-300">{app.source === "backend" ? "The developer hasn’t shared data safety details for this app yet." : "Sample listing — no data safety details."}</p>
          </div>
          {app.privacyPolicyUrl && (
            <a href={app.privacyPolicyUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-3xl bg-[#1c1c1f] p-4 hover:bg-[#232327]">
              <span className="text-sm font-medium">See the developer’s privacy policy</span><ExternalLink className="h-4 w-4 shrink-0 text-neutral-400" />
            </a>
          )}
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle>Ratings and reviews</SectionTitle>
        {app.source === "demo" && <p className="mt-1 text-xs text-neutral-500">Sample rating spread for this demo listing. Reviews you write are saved in this browser only.</p>}
        <div className="mt-5">
          <RatingSummary average={app.rating.average} count={app.rating.count} histogram={app.rating.histogram} />
        </div>

        <div className="mt-6">
          <ReviewList reviews={reviews} hasMore={!!reviewsQ.hasNextPage} loadingMore={reviewsQ.isFetchingNextPage} onMore={() => reviewsQ.fetchNextPage()} />
        </div>

        <div className="mt-5">
          <ReviewForm
            key={id}
            existing={mine}
            submitting={submit.isPending}
            error={submit.error?.message}
            onSubmit={async (payload) => { try { await submit.mutateAsync(payload); return true; } catch { return false; } }}
          />
        </div>
      </section>

      {hasSupport && (
        <section className="mt-10">
          <SectionTitle onArrow={() => setSupportOpen(!supportOpen)} open={supportOpen} label="App support">App support</SectionTitle>
          {supportOpen && (
            <div className="mt-3 divide-y divide-white/10 rounded-3xl bg-[#1c1c1f]">
              {app.website && <a href={app.website} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 text-sm hover:bg-white/5"><Globe className="h-5 w-5 text-neutral-400" /> Website</a>}
              {app.privacyPolicyUrl && <a href={app.privacyPolicyUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 text-sm hover:bg-white/5"><Lock className="h-5 w-5 text-neutral-400" /> Privacy policy</a>}
            </div>
          )}
        </section>
      )}

      <SimilarApps app={app} />

      {toast && <div role="status" className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#e3e3e6] px-5 py-2.5 text-sm font-medium text-black shadow-xl">{toast}</div>}
    </Shell>
  );
}

function Shell({ children, right }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <header className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-2">
          <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))} aria-label="Back" className="rounded-full p-2.5 text-neutral-200 hover:bg-white/10"><ArrowLeft className="h-6 w-6" /></button>
          <div className="ml-auto flex items-center">{right}</div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-10 pt-2">{children}</main>
    </div>
  );
}
