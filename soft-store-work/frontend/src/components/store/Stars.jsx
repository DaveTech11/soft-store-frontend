import React, { useState } from "react";
import { Star } from "lucide-react";

/** Read-only stars, supports fractions (4.6 fills 60% of the 5th star). */
export function Stars({ value = 0, size = "h-4 w-4" }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className={`relative inline-block ${size}`}>
            <Star className={`absolute inset-0 ${size} text-neutral-700`} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={`${size} fill-white text-white`} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Tap-to-rate stars. */
export function StarInput({ value, onChange, size = "h-9 w-9" }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          className="rounded-full p-0.5 transition hover:scale-110"
        >
          <Star className={`${size} ${i <= shown ? "fill-white text-white" : "text-neutral-600"}`} />
        </button>
      ))}
    </div>
  );
}
