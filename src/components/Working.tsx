"use client";
// The "we're reading it" screen, shared by website and app tests.
// One compact screen (no scrolling): on the left the title, a live checklist
// and a real progress bar; on the right the bots animation.
import { useEffect, useState } from "react";
import BotRush from "./landing/BotRush";

export default function Working({
  label, // small line on top, e.g. "rork.com"
  title,
  lines, // the checklist, lit up one by one
  expectSeconds = 25, // how long it usually takes (the bar is an estimate)
}: {
  label: string;
  title: string;
  lines: string[];
  expectSeconds?: number;
}) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  // Eases toward 92% and waits there until the real result arrives.
  const progress = Math.min(0.92, 1 - Math.exp(-seconds / (expectSeconds * 0.6)));
  const active = Math.min(lines.length - 1, Math.floor((seconds / expectSeconds) * lines.length));

  return (
    <section className="grid items-center gap-8 md:grid-cols-[1fr_1.15fr] md:gap-12 xl:-mx-24" aria-live="polite">
      <div className="min-w-0">
        <p className="t-label flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />
          <span className="truncate">{label}</span>
          <span className="shrink-0">· {seconds}s</span>
        </p>
        <h1 className="t-h2 mt-4">{title}</h1>
        <p className="mt-2 text-muted">Usually {Math.round(expectSeconds * 0.6)}–{expectSeconds + 5} seconds. You can leave this tab open.</p>

        <ol className="mt-8 space-y-4">
          {lines.map((l, i) => (
            <li key={l} className={`flex items-center gap-4 text-sm transition-colors duration-300 ${i <= active ? "text-fg" : "text-faint"}`}>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  i < active ? "border-fg bg-fg text-bg" : i === active ? "border-fg" : "border-line-strong"
                }`}
                aria-hidden
              >
                {i < active ? (
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                    <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : i === active ? (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fg" />
                ) : null}
              </span>
              {l}
            </li>
          ))}
        </ol>

        <div className="mt-8 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-fg transition-[width] duration-1000 ease-out" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      {/* the animation: hidden on small phones so the checklist fits on one screen */}
      <div className="hidden min-w-0 sm:block">
        <BotRush live={{ progress, label }} />
      </div>
    </section>
  );
}
