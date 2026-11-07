"use client";
// Three white claw scratches (crawler → claws). Each scratch is a thin crescent
// that's "drawn" from top to bottom when the page opens, one after another,
// like something just clawed through the page.
//
// How the drawing works: each crescent is hidden behind a mask; the mask is a
// thick line along the same curve whose dash slides into view (CSS animation
// "claw-draw" in globals.css). People who turn off animations see them finished.
// They wait until they scroll into view, so claws lower on the page aren't
// already finished before anyone sees them.
import { useEffect, useId, useRef, useState } from "react";

// One scratch: the crescent shape (fill) and its center line (for the mask).
const SCRATCHES = [
  {
    shape: "M28 6 C 50 60, 58 140, 40 214 C 86 142, 80 58, 28 6 Z",
    line: "M28 6 C 62 60, 70 140, 46 214",
  },
  {
    shape: "M80 0 C 102 60, 110 146, 92 224 C 136 148, 130 56, 80 0 Z",
    line: "M80 0 C 114 58, 122 146, 98 224",
  },
  {
    shape: "M132 14 C 150 66, 156 140, 140 206 C 180 140, 176 64, 132 14 Z",
    line: "M132 14 C 162 66, 168 140, 146 206",
  },
];

export default function Claws({ className = "", delay = 0 }: { className?: string; delay?: number }) {
  // unique ids, so several sets of claws on one page don't share masks
  const id = useId().replace(/:/g, "");
  const ref = useRef<SVGSVGElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <svg ref={ref} viewBox="0 0 184 230" className={`rotate-[16deg] ${className}`} fill="#ffffff" aria-hidden>
      <defs>
        {SCRATCHES.map((s, i) => (
          <mask key={i} id={`claw-${id}-${i}`} maskUnits="userSpaceOnUse">
            <path
              d={s.line}
              fill="none"
              stroke="#ffffff"
              strokeWidth="44"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset="1"
              className={seen ? "claw-draw" : undefined}
              style={{ animationDelay: `${delay + i * 0.12}s` }}
            />
          </mask>
        ))}
      </defs>
      {SCRATCHES.map((s, i) => (
        <path key={i} d={s.shape} mask={`url(#claw-${id}-${i})`} />
      ))}
    </svg>
  );
}
