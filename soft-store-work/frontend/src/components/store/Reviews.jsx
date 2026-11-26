import React, { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Stars, StarInput } from "./Stars";

const when = (iso) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
};

const AVATAR_COLORS = ["#0b5345", "#5b2c6f", "#7b3f00", "#1b4f72", "#7d2a2a", "#34495e"];
const colorFor = (name) => AVATAR_COLORS[[...String(name || "A")].reduce((h, c) => h + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

function ReviewItem({ r }) {
  const [vote, setVote] = useState(null); // "up" | "down" | null (this session only)
  return (
    <article className="flex w-[300px] shrink-0 snap-start flex-col rounded-3xl bg-[#1c1c1f] p-4 sm:w-[340px]">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-base font-medium text-white" style={{ background: colorFor(r.author) }}>
          {(r.author || "A").trim().charAt(0).toUpperCase()}
        </div>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{r.author || "Anonymous"}{r.mine && <span className="ml-2 text-xs text-neutral-500">(you)</span>}</p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Stars value={r.rating} size="h-3 w-3" />
        <span className="text-xs text-neutral-400">{when(r.updatedAt || r.createdAt)}</span>
      </div>
      {r.body && <p className="mt-2 line-clamp-5 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-300">{r.body}</p>}
      <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-neutral-400">
        <span>Was this review helpful?</span>
        <span className="flex items-center gap-1">
          <button type="button" aria-label="Helpful" aria-pressed={vote === "up"} onClick={() => setVote(vote === "up" ? null : "up")} className={`rounded-full p-2 hover:bg-white/10 ${vote === "up" ? "text-[#a8c7fa]" : ""}`}><ThumbsUp className="h-4 w-4" /></button>
          <button type="button" aria-label="Not helpful" aria-pressed={vote === "down"} onClick={() => setVote(vote === "down" ? null : "down")} className={`rounded-full p-2 hover:bg-white/10 ${vote === "down" ? "text-[#a8c7fa]" : ""}`}><ThumbsDown className="h-4 w-4" /></button>
        </span>
      </div>
    </article>
  );
}

/** Write-a-review box. `existing` pre-fills when the visitor already reviewed. */
export function ReviewForm({ existing, onSubmit, submitting, error }) {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [body, setBody] = useState(existing?.body || "");
  const [author, setAuthor] = useState(existing?.author && existing.author !== "Anonymous" ? existing.author : "");
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return;
    setDone(false);
    const ok = await onSubmit({ rating, body: body.trim(), author: author.trim() });
    if (ok) setDone(true);
  };

  return (
    <form onSubmit={submit} className="rounded-3xl bg-[#1c1c1f] p-5">
      <h3 className="text-base font-semibold">{existing ? "Edit your review" : "Rate this app"}</h3>
      <p className="mt-1 text-xs text-neutral-500">Tell others what you think</p>
      <div className="mt-4"><StarInput value={rating} onChange={setRating} /></div>
      <input
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        maxLength={60}
        placeholder="Your name (optional)"
        className="mt-4 h-11 w-full rounded-xl bg-[#1b1b1d] px-4 text-sm outline-none ring-1 ring-white/[0.04] placeholder:text-neutral-500 focus:ring-white/20"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="Write a review (optional)"
        className="mt-3 w-full resize-none rounded-xl bg-[#1b1b1d] p-4 text-sm outline-none ring-1 ring-white/[0.04] placeholder:text-neutral-500 focus:ring-white/20"
      />
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {done && !error && <p className="mt-3 text-sm text-neutral-300">Thanks — your review was saved.</p>}
      <div className="mt-4 flex justify-end">
        <button
          disabled={!rating || submitting}
          className="rounded-full bg-[#a8c7fa] px-5 py-2 text-sm font-semibold text-[#062e6f] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Saving…" : existing ? "Update review" : "Post review"}
        </button>
      </div>
    </form>
  );
}

export function ReviewList({ reviews, hasMore, loadingMore, onMore }) {
  if (!reviews.length) {
    return <div className="rounded-3xl border border-dashed border-white/10 py-10 text-center text-sm text-neutral-500">No reviews yet — be the first to write one.</div>;
  }
  return (
    <div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {reviews.map((r) => <ReviewItem key={r.id} r={r} />)}
      </div>
      {hasMore && (
        <button onClick={onMore} disabled={loadingMore} className="mt-3 rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-[#a8c7fa] hover:bg-white/5 disabled:opacity-50">
          {loadingMore ? "Loading…" : "See more reviews"}
        </button>
      )}
    </div>
  );
}
