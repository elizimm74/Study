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

const pct = (x: number) => `${Math.round(x * 100)}%`;
const STEP_NAMES: Record<string, string> = {
  hero: "the landing page",
  pricing: "pricing",
  product: "trying the product",
  signup: "signup",
  converted: "converted",
};

export default function Report({ run }: { run: Run }) {
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
    <div className="space-y-6">
      {/* ---------- 1. The answer ---------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="truncate text-sm text-slate-500">{run.url}</p>
        <p className="mt-2 text-4xl font-bold tracking-tight">
          {stats.buy} of {stats.total} would {goal}
        </p>
        <VerdictBar buy={stats.buy} maybe={stats.maybe} no={stats.no} goal={goal} />
        <p className="mt-4 text-slate-700">{firstSentence(advice.summary)}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {top && (
            <Chip tone="rose">
              Biggest blocker: {top.category} ({pct(top.pctOfNonBuyers)} of no&apos;s)
            </Chip>
          )}
          {run.journey && run.journey.steps.length > 0 && (
            <Chip tone={run.journey.status === "completed" ? "emerald" : "amber"}>
              Product test: {run.journey.status === "completed" ? "worked" : run.journey.status}
            </Chip>
          )}
        </div>
      </section>

      {/* ---------- 2. Fix these first ---------- */}
      <section>
        <h2 className="mb-2 text-lg font-semibold">Fix these first</h2>
        <ol className="space-y-2">
          {shownFixes.map((f, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-xs font-medium text-emerald-700">
                    could win {f.likelyFlip} of the {stats.maybe} maybes
                  </p>
                </div>
                <p className="mt-1 text-sm text-slate-600">{f.change}</p>
              </div>
            </li>
          ))}
        </ol>
        {fixes.length > 3 && (
          <button onClick={() => setMoreFixes(!moreFixes)} className="mt-2 text-sm text-indigo-700 hover:underline">
            {moreFixes ? "Show fewer" : `Show ${fixes.length - 3} more fix${fixes.length - 3 === 1 ? "" : "es"}`}
          </button>
        )}
      </section>

      {/* ---------- 3. Quick facts ---------- */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Fact label="Liked it most" value={best ? best.value : "-"} detail={best ? `${best.dimension} · ${pct(best.buyRate)} would ${goal}` : "Not enough data"} />
        <Fact label="Liked it least" value={worst ? worst.value : "-"} detail={worst ? `${worst.dimension} · ${pct(worst.buyRate)} would ${goal}` : "Not enough data"} />
        <Fact
          label="Most people left at"
          value={worstStep && worstStep.lost > 0 ? STEP_NAMES[worstStep.step] : "-"}
          detail={worstStep && worstStep.lost > 0 ? `${worstStep.lost} of ${stats.total} gave up there` : ""}
        />
      </section>

      {/* ---------- 4. Details, folded away ---------- */}
      <div className="space-y-2">
        {run.journey && run.journey.steps.length > 0 && (
          <Fold title="Product test" hint={`${run.journey.steps.length} steps · ${run.journey.status}`}>
            <JourneyView runId={run.id} journey={run.journey} />
          </Fold>
        )}

        <Fold title="Why people said no" hint={`${stats.objections.length} reasons`}>
          <div className="space-y-3">
            {stats.objections.slice(0, 5).map((o) => (
              <div key={o.category}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium capitalize">{o.category}</span>
                  <span className="text-slate-500">{pct(o.pctOfNonBuyers)}</span>
                </div>
                <div className="mt-1 h-2 rounded bg-slate-100">
                  <div className="h-2 rounded bg-rose-400" style={{ width: pct(o.pctOfNonBuyers) }} />
                </div>
                {o.examples[0] && <p className="mt-1 text-xs text-slate-500">“{o.examples[0]}”</p>}
              </div>
            ))}
          </div>
        </Fold>

        <Fold title="Where they dropped off" hint={worstStep ? `most at ${STEP_NAMES[worstStep.step]}` : ""}>
          <div className="space-y-2">
            {stats.funnel.map((f) => (
              <div key={f.step}>
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{f.step === "converted" ? `Would ${goal}` : STEP_NAMES[f.step]}</span>
                  <span className="text-slate-500">
                    {f.reached}
                    {f.lost ? ` · ${f.lost} left` : ""}
                  </span>
                </div>
                <div className="mt-1 h-2.5 rounded bg-slate-100">
                  <div
                    className={`h-2.5 rounded ${f.step === "converted" ? "bg-emerald-600" : "bg-indigo-500"}`}
                    style={{ width: pct(f.reached / Math.max(1, stats.total)) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Fold>

        <Fold title="Rewritten copy" hint="new headline + pricing text">
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Headline</p>
              <p className="text-lg font-semibold">“{advice.headlineOptions[0]}”</p>
              {advice.headlineOptions.slice(1).map((h, i) => (
                <p key={i} className="text-slate-600">
                  or “{h}”
                </p>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Subheadline</p>
              <p>{advice.subheadline}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Pricing</p>
              <p>{advice.pricingCopy}</p>
            </div>
          </div>
        </Fold>

        <Fold title="Who liked it" hint="by age, budget, device...">
          <AllSegments segments={stats.segments} goal={goal} />
        </Fold>

        {run.reputation && (
          <Fold title="What people say online" hint={run.reputation.found ? "real reviews" : "no reviews found"}>
            <div className="space-y-2 text-sm">
              <p className="text-slate-700">{run.reputation.summary}</p>
              {run.reputation.found && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <List title="Praise" tone="text-emerald-700" items={run.reputation.praise} />
                  <List title="Complaints" tone="text-rose-700" items={run.reputation.complaints} />
                </div>
              )}
              {run.reputation.sources.length > 0 && (
                <p className="text-xs text-slate-400">
                  Sources:{" "}
                  {run.reputation.sources.slice(0, 5).map((src, i) => (
                    <span key={src.url}>
                      {i > 0 && " · "}
                      <a href={src.url} target="_blank" rel="noreferrer" className="underline hover:text-slate-600">
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
      </div>

      {run.totalCostUsd !== undefined && <p className="text-center text-xs text-slate-400">Run cost: ${run.totalCostUsd.toFixed(4)}</p>}
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(segments)
        .filter(([, rows]) => rows.length > 1) // skip segments where everyone is the same
        .map(([name, rows]) => (
          <div key={name}>
            <p className="mb-1 text-xs font-medium uppercase text-slate-400">{name}</p>
            {[...rows]
              .sort((a, b) => b.buyRate - a.buyRate)
              .slice(0, 5)
              .map((r) => (
                <div key={r.value} className="flex items-center gap-2 text-xs" title={`${r.n} personas`}>
                  <span className="w-28 truncate text-slate-600">{r.value}</span>
                  <span className="flex-1 rounded px-2 py-0.5 text-right font-medium" style={heat(r.buyRate)}>
                    {pct(r.buyRate)}
                  </span>
                </div>
              ))}
          </div>
        ))}
      <p className="text-xs text-slate-400 sm:col-span-2 lg:col-span-3">% = share who would {goal}. Darker = more.</p>
    </div>
  );
}

// Green shade: 0% = very light, 50%+ = darkest.
function heat(rate: number): React.CSSProperties {
  const t = Math.min(1, rate / 0.5);
  return { background: `rgba(5, 150, 105, ${0.08 + t * 0.85})`, color: t > 0.5 ? "white" : "#064e3b" };
}

function VerdictBar({ buy, maybe, no, goal }: { buy: number; maybe: number; no: number; goal: string }) {
  const total = Math.max(1, buy + maybe + no);
  return (
    <div className="mt-4">
      <div className="flex h-3 overflow-hidden rounded-full">
        <div className="bg-emerald-600" style={{ width: pct(buy / total) }} />
        <div className="bg-amber-400" style={{ width: pct(maybe / total) }} />
        <div className="bg-slate-300" style={{ width: pct(no / total) }} />
      </div>
      <div className="mt-1 flex gap-4 text-xs text-slate-500">
        <span>
          <span className="text-emerald-600">●</span> would {goal} {buy}
        </span>
        <span>
          <span className="text-amber-400">●</span> maybe {maybe}
        </span>
        <span>
          <span className="text-slate-300">●</span> no {no}
        </span>
      </div>
    </div>
  );
}

function Chip({ tone, children }: { tone: "rose" | "slate" | "emerald" | "amber"; children: React.ReactNode }) {
  const cls = {
    rose: "bg-rose-50 text-rose-800",
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-800",
    amber: "bg-amber-50 text-amber-800",
  }[tone];
  return <span className={`rounded-full px-2.5 py-1 font-medium ${cls}`}>{children}</span>;
}

function Fact({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
      <p className="mt-1 truncate font-semibold capitalize" title={value}>
        {value}
      </p>
      <p className="text-xs text-slate-500">{detail}</p>
    </div>
  );
}

// A section you click to open. Keeps the page short.
function Fold({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
        <span className="font-medium">{title}</span>
        <span className="flex items-center gap-2 text-xs text-slate-400">
          {hint}
          <span className="transition-transform group-open:rotate-90">›</span>
        </span>
      </summary>
      <div className="border-t border-slate-100 p-4">{children}</div>
    </details>
  );
}

function List({ title, tone, items }: { title: string; tone: string; items: string[] }) {
  return (
    <div>
      <p className={`font-medium ${tone}`}>{title}</p>
      <ul className="list-disc pl-5 text-slate-600">
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
          <figure key={q.personaId} className="rounded-lg bg-slate-50 p-3">
            <blockquote className="text-sm text-slate-800">“{q.quote}”</blockquote>
            <figcaption className="mt-1 flex justify-between text-xs text-slate-500">
              <span>{q.label}</span>
              <span className={q.verdict === "buy" ? "text-emerald-700" : q.verdict === "maybe" ? "text-amber-700" : "text-slate-500"}>
                {verdictLabel(q.verdict)}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => setShowAll(!showAll)} className="rounded-full border border-slate-300 px-3 py-1 text-xs">
          {showAll ? "Show fewer" : `Browse all ${all.length}`}
        </button>
        {showAll &&
          (["all", "buy", "maybe", "no"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs ${filter === f ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300"}`}
            >
              {f === "all" ? "all" : verdictLabel(f)}
            </button>
          ))}
      </div>
    </div>
  );
}
