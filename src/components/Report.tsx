"use client";
// The report page, ordered by importance:
//   1. The answer: score + one-sentence summary
//   2. Fix these first: the top 3 fixes
//   3. Three quick facts: where people left, who liked it most / least
//   4. Everything else, folded away (click to open), most useful first
// Every number comes from run.stats (calculated in code); the advice text
// comes from run.advice (written by Sonnet).
import { useState } from "react";
import type { Run } from "@/lib/pipeline";
import type { QuoteItem, SegmentRow } from "@/lib/aggregate";
import JourneyView from "@/components/JourneyView";
import AskBox from "@/components/AskBox";
import ShareBox from "@/components/ShareBox";
import ActualBox from "@/components/ActualBox";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const STEP_NAMES: Record<string, string> = {
  hero: "the landing page",
  pricing: "pricing",
  product: "trying the product",
  signup: "signup",
  converted: "converted",
};

export default function Report({ run, demo = false }: { run: Run & { filesPrefix: string }; demo?: boolean }) {
  const stats = run.stats!;
  const advice = run.advice!;
  const goal = run.profile?.goal ?? "buy";
  const top = stats.objections[0];
  const worstStep = [...stats.funnel].filter((f) => f.step !== "converted").sort((a, b) => b.lost - a.lost)[0];
  const { best, worst } = extremeSegments(stats.segments, stats.total);
  const [moreFixes, setMoreFixes] = useState(false);
  const fixes = advice.fixes.filter((f) => f.couldFlip > 0);
  const shownFixes = moreFixes ? fixes : fixes.slice(0, 3);

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      {/* ---------- 1. The answer, on a full-width torn paper strip ---------- */}
      <section className="paper bleed py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <span className="t-label truncate">{run.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
            <span className="t-label shrink-0">report</span>
          </div>
          <div className="mt-8 grid gap-8 md:grid-cols-[auto_1fr] md:items-end md:gap-12">
            <div>
              <p className="flex items-end gap-2">
                <span className="t-number text-8xl text-accent sm:text-9xl">{stats.buy}</span>
                <span className="t-number pb-2 text-3xl text-faint sm:text-4xl">/{stats.total}</span>
              </p>
              <p className="mt-2 text-lg font-medium">would {goal}</p>
            </div>
            <div className="space-y-4">
              <p className="t-lead text-fg">{firstSentence(advice.summary)}</p>
              <div className="flex flex-wrap gap-2">
                {top && (
                  <span className="pill">
                    Biggest blocker: {top.category} · {pct(top.pctOfNonBuyers)}
                  </span>
                )}
                {run.journey && run.journey.steps.length > 0 && (
                  <span className="pill">Product test: {run.journey.status === "completed" ? "worked" : run.journey.status}</span>
                )}
              </div>
            </div>
          </div>
          <VerdictBar buy={stats.buy} maybe={stats.maybe} no={stats.no} goal={goal} />
        </div>
      </section>

      {/* ---------- 2. Fix these first ---------- */}
      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="t-h2">Fix these first</h2>
          <span className="t-label hidden sm:inline">ranked by people won back</span>
        </div>
        <ol className="mt-6 border-b border-line">
          {shownFixes.map((f, i) => (
            <li key={i} className="grid grid-cols-[2rem_1fr_auto] gap-4 border-t border-line py-6">
              <span className="t-label pt-1">0{i + 1}</span>
              <div className="min-w-0">
                <p className="t-h3">{f.title}</p>
                <p className="mt-1 text-muted">{f.change}</p>
              </div>
              <p className="text-right">
                <span className="t-number block text-3xl text-accent-ink">+{f.likelyFlip}</span>
                <span className="text-xs text-faint">of {stats.maybe} maybes</span>
              </p>
            </li>
          ))}
        </ol>
        {fixes.length > 3 && (
          <button onClick={() => setMoreFixes(!moreFixes)} className="btn btn-text mt-2 -ml-3">
            {moreFixes ? "Show fewer" : `Show ${fixes.length - 3} more fix${fixes.length - 3 === 1 ? "" : "es"}`}
          </button>
        )}
      </section>

      {/* ---------- 3. Quick facts: one card, split by lines ---------- */}
      <section className="card grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Fact label="Liked it most" value={best ? best.value : "-"} detail={best ? `${best.dimension} · ${pct(best.buyRate)} would ${goal}` : "Not enough data"} />
        <Fact label="Liked it least" value={worst ? worst.value : "-"} detail={worst ? `${worst.dimension} · ${pct(worst.buyRate)} would ${goal}` : "Not enough data"} />
        <Fact
          label="Most people left at"
          value={worstStep && worstStep.lost > 0 ? STEP_NAMES[worstStep.step] : "-"}
          detail={worstStep && worstStep.lost > 0 ? `${worstStep.lost} of ${stats.total} gave up there` : ""}
        />
      </section>

      {/* ---------- 4. Details, folded away ---------- */}
      <section className="border-t border-line">
        {run.journey && run.journey.steps.length > 0 && (
          <Fold title="Product test" hint={`${run.journey.steps.length} steps · ${run.journey.status}`}>
            <JourneyView filesPrefix={run.filesPrefix} journey={run.journey} />
          </Fold>
        )}

        <Fold title="Why people said no" hint={`${stats.objections.length} reasons`}>
          <div className="space-y-6">
            {stats.objections.slice(0, 5).map((o) => (
              <div key={o.category}>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="font-medium first-letter:uppercase">{o.category}</span>
                  <span className="tabular-nums text-muted">{pct(o.pctOfNonBuyers)}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-raised">
                  <div className="h-1.5 rounded-full bg-fg" style={{ width: pct(o.pctOfNonBuyers) }} />
                </div>
                {o.examples[0] && <p className="mt-2 text-sm text-muted">“{o.examples[0]}”</p>}
              </div>
            ))}
          </div>
        </Fold>

        <Fold title="Where they dropped off" hint={worstStep ? `most at ${STEP_NAMES[worstStep.step]}` : ""}>
          <div className="space-y-4">
            {stats.funnel.map((f) => (
              <div key={f.step}>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="first-letter:uppercase">{f.step === "converted" ? `Would ${goal}` : STEP_NAMES[f.step]}</span>
                  <span className="tabular-nums text-muted">
                    {f.reached}
                    {f.lost ? ` · ${f.lost} left` : ""}
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-raised">
                  <div
                    className={`h-1.5 rounded-full ${f.step === "converted" ? "bg-accent" : "bg-fg"}`}
                    style={{ width: pct(f.reached / Math.max(1, stats.total)) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Fold>

        <Fold title="Rewritten copy" hint="new headline + pricing text">
          <dl className="space-y-6">
            <div>
              <dt className="t-label">Headline</dt>
              <dd className="t-h3 mt-2">“{advice.headlineOptions[0]}”</dd>
              {advice.headlineOptions.slice(1).map((h, i) => (
                <dd key={i} className="text-muted">
                  or “{h}”
                </dd>
              ))}
            </div>
            <div>
              <dt className="t-label">Subheadline</dt>
              <dd className="mt-2">{advice.subheadline}</dd>
            </div>
            <div>
              <dt className="t-label">Pricing</dt>
              <dd className="mt-2">{advice.pricingCopy}</dd>
            </div>
          </dl>
        </Fold>

        <Fold title="Who liked it" hint="by age, budget, device">
          <AllSegments segments={stats.segments} goal={goal} />
        </Fold>

        {run.reputation && (
          <Fold title="What people say online" hint={run.reputation.found ? "real reviews" : "no reviews found"}>
            <div className="space-y-4 text-sm">
              <p className="text-muted">{run.reputation.summary}</p>
              {run.reputation.found && (
                <div className="grid gap-6 sm:grid-cols-2">
                  <List title="Praise" items={run.reputation.praise} />
                  <List title="Complaints" items={run.reputation.complaints} />
                </div>
              )}
              {run.reputation.sources.length > 0 && (
                <p className="text-faint">
                  Sources:{" "}
                  {run.reputation.sources.slice(0, 5).map((src, i) => (
                    <span key={src.url}>
                      {i > 0 && " · "}
                      <a href={src.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-fg">
                        {src.title.slice(0, 40)}
                      </a>
                    </span>
                  ))}
                </p>
              )}
            </div>
          </Fold>
        )}

        <Fold title="What they said" hint={`${stats.allQuotes.length} quotes`}>
          <Quotes best={stats.bestQuotes} all={stats.allQuotes} goal={goal} />
        </Fold>
      </section>

      {/* free follow-up questions (and "something's wrong" fixes) */}
      {!demo && (
        <>
          <ShareBox testId={run.id} headline={`${stats.buy} of ${stats.total} simulated customers would ${goal} on ${run.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "")}`} />
          <AskBox testId={run.id} rerunHref={`/app?url=${encodeURIComponent(run.url)}`} />
          <ActualBox testId={run.id} kind="website" />
        </>
      )}

      {run.totalCostUsd !== undefined && <p className="t-label">run cost ${run.totalCostUsd.toFixed(4)}</p>}
    </div>
  );
}

// ---------- helpers ----------

// The summary can be long; the top card shows only its first sentence.
function firstSentence(text: string) {
  const m = text.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : text).trim();
}

// The single best and worst group across all segments (ignoring tiny groups
// and segments where everyone is the same, e.g. all "female").
function extremeSegments(segments: Record<string, SegmentRow[]>, total: number) {
  const minSize = Math.max(5, Math.round(total * 0.08));
  const rows = Object.entries(segments)
    .filter(([, list]) => list.length > 1)
    .flatMap(([dimension, list]) => list.filter((r) => r.n >= minSize).map((r) => ({ ...r, dimension })));
  if (rows.length < 2) return { best: undefined, worst: undefined };
  const sorted = [...rows].sort((a, b) => b.buyRate - a.buyRate || b.n - a.n);
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}

function AllSegments({ segments, goal }: { segments: Record<string, SegmentRow[]>; goal: string }) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(segments)
        .filter(([, rows]) => rows.length > 1) // skip segments where everyone is the same
        .map(([name, rows]) => (
          <div key={name}>
            <p className="t-label mb-2">{name}</p>
            {[...rows]
              .sort((a, b) => b.buyRate - a.buyRate)
              .slice(0, 5)
              .map((r) => (
                <div key={r.value} className="flex items-center gap-2 py-0.5 text-sm" title={`${r.n} personas`}>
                  <span className="w-32 truncate text-muted">{r.value}</span>
                  <span className="flex-1 rounded px-2 py-0.5 text-right tabular-nums" style={heat(r.buyRate)}>
                    {pct(r.buyRate)}
                  </span>
                </div>
              ))}
          </div>
        ))}
      <p className="text-sm text-faint sm:col-span-2 lg:col-span-3">% = share who would {goal}. Stronger color = more.</p>
    </div>
  );
}

// Accent shade: 0% = faint, 50%+ = full accent. Text stays readable in light and dark.
function heat(rate: number): React.CSSProperties {
  const t = Math.min(1, rate / 0.5);
  return {
    background: `color-mix(in oklab, var(--accent) ${Math.round(8 + t * 92)}%, transparent)`,
    color: t > 0.6 ? "var(--accent-fg)" : "var(--fg)",
  };
}

function VerdictBar({ buy, maybe, no, goal }: { buy: number; maybe: number; no: number; goal: string }) {
  const total = Math.max(1, buy + maybe + no);
  return (
    <div className="mt-8 border-t border-line pt-6">
      <div className="flex h-2 gap-1" role="img" aria-label={`${buy} would ${goal}, ${maybe} maybe, ${no} no`}>
        <div className="rounded-full bg-accent" style={{ width: pct(buy / total) }} />
        <div className="rounded-full bg-fg" style={{ width: pct(maybe / total) }} />
        <div className="rounded-full bg-line-strong" style={{ width: pct(no / total) }} />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Key swatch="bg-accent" label={`Would ${goal}`} n={buy} />
        <Key swatch="bg-fg" label="Maybe" n={maybe} />
        <Key swatch="bg-line-strong" label="No" n={no} />
      </div>
    </div>
  );
}

function Key({ swatch, label, n }: { swatch: string; label: string; n: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-sm ${swatch}`} aria-hidden />
      <span className="text-muted">{label}</span>
      <span className="tabular-nums">{n}</span>
    </span>
  );
}

function Fact({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 p-6">
      <p className="t-label">{label}</p>
      <p className="t-h3 mt-2 line-clamp-2 first-letter:uppercase" title={value}>
        {value}
      </p>
      <p className="mt-1 text-sm text-muted">{detail}</p>
    </div>
  );
}

// A section you click to open. Keeps the page short.
function Fold({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-line">
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4">
        <span className="t-h3">{title}</span>
        <span className="flex items-center gap-4 text-faint">
          <span className="hidden text-sm sm:inline">{hint}</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform duration-200 group-open:rotate-180" aria-hidden>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div className="pb-8 pt-2">{children}</div>
    </details>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-muted">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

function Quotes({ best, all, goal }: { best: QuoteItem[]; all: QuoteItem[]; goal: string }) {
  // "buy" is the internal name; show the site's real goal, e.g. "would join the waitlist".
  const verdictLabel = (v: QuoteItem["verdict"]) => (v === "buy" ? `would ${goal}` : v);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<"all" | QuoteItem["verdict"]>("all");
  // Short version: 2 positive, 2 maybe, 2 negative.
  const short = (["buy", "maybe", "no"] as const).flatMap((v) => best.filter((q) => q.verdict === v).slice(0, 2));
  const list = showAll ? all.filter((q) => filter === "all" || q.verdict === filter) : short;

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((q) => (
          <figure key={q.personaId} className="min-w-0 rounded-lg border border-line p-4">
            <blockquote className="text-sm">“{q.quote}”</blockquote>
            <figcaption className="mt-2 flex items-center justify-between gap-2 text-xs text-faint">
              <span className="truncate">{q.label}</span>
              <span className={`pill pill-${q.verdict}`}>{verdictLabel(q.verdict)}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => setShowAll(!showAll)} className="btn btn-ghost text-sm">
          {showAll ? "Show fewer" : `Browse all ${all.length}`}
        </button>
        {showAll &&
          (["all", "buy", "maybe", "no"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className="chip"
            >
              {f === "all" ? "all" : verdictLabel(f)}
            </button>
          ))}
      </div>
    </div>
  );
}
