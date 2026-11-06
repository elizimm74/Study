"use client";
// The landing page's main visual: an example report that looks and works like
// the real product. The filter tabs really filter the 25 customer cards.
import { useState } from "react";
import { EXAMPLE_BLOCKER, EXAMPLE_FIXES, EXAMPLE_PERSONAS, EXAMPLE_SITE, countVerdicts, type Verdict } from "./example";

const LABEL: Record<Verdict, string> = { buy: "Buy", maybe: "Maybe", no: "No" };

export default function ProductPreview() {
  const [filter, setFilter] = useState<"all" | Verdict>("all");
  const counts = countVerdicts(EXAMPLE_PERSONAS);
  const total = EXAMPLE_PERSONAS.length;
  const shown = filter === "all" ? EXAMPLE_PERSONAS : EXAMPLE_PERSONAS.filter((p) => p.verdict === filter);

  return (
    <div className="card-raised overflow-hidden">
      {/* Window bar */}
      <div className="flex h-12 items-center gap-4 border-b border-line bg-subtle px-4">
        <div className="hidden gap-2 sm:flex" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        </div>
        <span className="t-label truncate">crawler.app/report/{EXAMPLE_SITE.split(".")[0]}</span>
        <span className="t-label ml-auto flex shrink-0 items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          done · 1m 54s
        </span>
      </div>

      <div className="grid lg:grid-cols-[22rem_1fr]">
        {/* ---------- Left: the scorecard ---------- */}
        <aside className="space-y-8 border-b border-line p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <div>
            <p className="t-label">{EXAMPLE_SITE}</p>
            <p className="mt-4 flex items-end gap-2">
              <span className="t-number text-8xl text-accent">{counts.buy}</span>
              <span className="t-number pb-2 text-3xl text-faint">/{total}</span>
            </p>
            <p className="mt-2 font-medium">would buy</p>
            <VerdictBar {...counts} total={total} />
            <dl className="mt-4 space-y-2 text-sm">
              <Legend swatch="bg-accent" label="Buy" n={counts.buy} />
              <Legend swatch="bg-fg" label="Maybe" n={counts.maybe} />
              <Legend swatch="bg-line-strong" label="No" n={counts.no} />
            </dl>
          </div>

          <div className="border-t border-line pt-6">
            <p className="t-label">biggest blocker</p>
            <p className="mt-2 font-medium">{EXAMPLE_BLOCKER.text}</p>
            <p className="text-sm text-muted">{EXAMPLE_BLOCKER.detail}</p>
          </div>

          <div className="border-t border-line pt-6">
            <p className="t-label">fix first</p>
            <ol className="mt-4 space-y-4">
              {EXAMPLE_FIXES.map((f, i) => (
                <li key={f.title} className="flex gap-4">
                  <span className="t-label pt-0.5">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{f.title}</p>
                    <p className="text-sm text-muted">{f.detail}</p>
                  </div>
                  <span className="text-sm font-medium text-accent-ink tabular-nums" title={`wins back about ${f.win} people`}>
                    +{f.win}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        {/* ---------- Right: the 25 customers ---------- */}
        <section className="min-w-0 p-4 sm:p-6" aria-label="Customer verdicts">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex overflow-hidden rounded-lg border border-line" role="group" aria-label="Filter by verdict">
              {(["all", "buy", "maybe", "no"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={`min-h-11 border-line px-4 text-sm transition-colors [&:not(:first-child)]:border-l ${
                    filter === f ? "bg-raised font-medium text-fg" : "text-muted hover:text-fg"
                  }`}
                >
                  {f === "all" ? "All" : LABEL[f]} <span className="tabular-nums text-faint">{f === "all" ? total : counts[f]}</span>
                </button>
              ))}
            </div>
            <span className="t-label hidden sm:block">{shown.length} customers</span>
          </div>

          <div className="relative mt-4">
            <ul
              tabIndex={0}
              aria-label="Customer cards (scrollable)"
              className="grid max-h-[32rem] gap-2 lg:max-h-[42rem] overflow-y-auto rounded-lg pb-12 sm:grid-cols-2"
            >
              {shown.map((p) => (
                <li key={p.name + p.age} className="rounded-lg border border-line bg-bg p-4">
                  <div className="flex items-start gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-medium text-muted" aria-hidden>
                      {p.name[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {p.name}, {p.age}
                      </p>
                      <p className="text-xs text-faint">
                        {p.role} · {p.device}
                      </p>
                    </div>
                    <span className={`pill pill-${p.verdict}`}>{LABEL[p.verdict]}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted">“{p.quote}”</p>
                </li>
              ))}
            </ul>
            {/* fade at the bottom so it's clear the list scrolls */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-bg to-transparent" aria-hidden />
          </div>
        </section>
      </div>
    </div>
  );
}

function VerdictBar({ buy, maybe, no, total }: { buy: number; maybe: number; no: number; total: number }) {
  const w = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="mt-6 flex h-2 gap-1" role="img" aria-label={`${buy} buy, ${maybe} maybe, ${no} no`}>
      <span className="rounded-full bg-accent" style={{ width: w(buy) }} />
      <span className="rounded-full bg-fg" style={{ width: w(maybe) }} />
      <span className="rounded-full bg-line-strong" style={{ width: w(no) }} />
    </div>
  );
}

function Legend({ swatch, label, n }: { swatch: string; label: string; n: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-sm ${swatch}`} aria-hidden />
      <dt className="text-muted">{label}</dt>
      <dd className="ml-auto tabular-nums">{n}</dd>
    </div>
  );
}
