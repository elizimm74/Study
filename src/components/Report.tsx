"use client";
// The report page. Every section reads from run.stats (calculated in code)
// or run.advice (written by Sonnet).
import { useState } from "react";
import type { Run } from "@/lib/pipeline";
import type { QuoteItem } from "@/lib/aggregate";
import JourneyView from "@/components/JourneyView";

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function Report({ run }: { run: Run }) {
  const stats = run.stats!;
  const advice = run.advice!;
  const top = stats.objections[0];

  return (
    <div className="space-y-10">
      {/* ---------- Headline score ---------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500 truncate">{run.url}</p>
        <p className="mt-2 text-4xl font-bold tracking-tight">
          {stats.buy} of {stats.total} would {run.profile?.goal ?? "buy"}
        </p>
        {top && (
          <p className="mt-1 text-slate-600">
            Biggest blocker: <span className="font-medium text-slate-900">{top.category}</span> (
            {pct(top.pctOfNonBuyers)} of non-buyers)
          </p>
        )}
        <VerdictBar buy={stats.buy} maybe={stats.maybe} no={stats.no} goal={run.profile?.goal ?? "buy"} />
        <p className="mt-4 text-slate-700">{advice.summary}</p>
        {run.totalCostUsd !== undefined && (
          <p className="mt-3 text-xs text-slate-400">Run cost: ${run.totalCostUsd.toFixed(4)}</p>
        )}
      </section>

      {/* ---------- Milestone 3: product test + reviews ---------- */}
      {run.journey && run.journey.steps.length > 0 && (
        <Section title="Product test" subtitle="An AI explorer used the product like a first-time user. Click a step to see that screen.">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <JourneyView runId={run.id} journey={run.journey} />
          </div>
        </Section>
      )}
      {run.reputation && (
        <Section title="What people say online">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <p className="text-slate-700">{run.reputation.summary}</p>
            {run.reputation.found && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="font-medium text-emerald-700">Praise</p>
                  <ul className="list-disc pl-5 text-slate-600">
                    {run.reputation.praise.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-rose-700">Complaints</p>
                  <ul className="list-disc pl-5 text-slate-600">
                    {run.reputation.complaints.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
              </div>
            )}
            {run.reputation.sources.length > 0 && (
              <p className="text-xs text-slate-400">
                Sources:{" "}
                {run.reputation.sources.map((src, i) => (
                  <span key={src.url}>
                    {i > 0 && " · "}
                    <a href={src.url} target="_blank" rel="noreferrer" className="underline hover:text-slate-600">
                      {src.title.slice(0, 50)}
                    </a>
                  </span>
                ))}
              </p>
            )}
          </div>
        </Section>
      )}

      {/* ---------- Ranked fixes ---------- */}
      <Section title="Ranked fixes" subtitle="Sorted by how many 'maybe' personas each fix speaks to. Counts come from the real objections, not AI guesses.">
        <ol className="space-y-3">
          {advice.fixes.map((f, i) => (
            <li key={i} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">
                  {i + 1}. {f.title}
                </p>
                <p className="text-sm text-emerald-700">
                  could flip {f.likelyFlip} maybe{f.likelyFlip === 1 ? "" : "s"} · addresses {f.couldFlip} non-buyers
                </p>
              </div>
              <p className="mt-1 text-sm text-slate-600">{f.problem}</p>
              <p className="mt-2 text-sm">
                <span className="font-medium">Change:</span> {f.change}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {f.step} · {f.addresses.join(", ")}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ---------- Rewritten copy ---------- */}
      <Section title="Rewritten copy">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Headline options</p>
            <ul className="mt-1 space-y-1">
              {advice.headlineOptions.map((h, i) => (
                <li key={i} className="text-lg font-semibold">“{h}”</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Subheadline</p>
            <p>{advice.subheadline}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Pricing blurb</p>
            <p>{advice.pricingCopy}</p>
          </div>
        </div>
      </Section>

      <div className="grid gap-10 md:grid-cols-2">
        {/* ---------- Funnel ---------- */}
        <Section title="Where they dropped off">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            {stats.funnel.map((f) => (
              <div key={f.step}>
                <div className="flex justify-between text-sm">
                  <span className="capitalize">
                    {f.step === "hero" ? "Landing page" : f.step === "product" ? "Trying the product" : f.step}
                  </span>
                  <span className="text-slate-500">
                    {f.reached} reached{f.lost ? ` · ${f.lost} left here` : ""}
                  </span>
                </div>
                <div className="mt-1 h-3 rounded bg-slate-100">
                  <div
                    className={`h-3 rounded ${f.step === "converted" ? "bg-emerald-600" : "bg-indigo-500"}`}
                    style={{ width: pct(f.reached / Math.max(1, stats.total)) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ---------- Objections ---------- */}
        <Section title="Top objections" subtitle="Share of non-buyers">
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
            {stats.objections.map((o) => (
              <details key={o.category} className="group">
                <summary className="cursor-pointer list-none">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{o.category}</span>
                    <span className="text-slate-500">
                      {pct(o.pctOfNonBuyers)} · {o.count}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded bg-slate-100">
                    <div className="h-2 rounded bg-rose-400" style={{ width: pct(o.pctOfNonBuyers) }} />
                  </div>
                </summary>
                <ul className="mt-2 mb-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {o.examples.slice(0, 4).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </details>
            ))}
            <p className="pt-1 text-xs text-slate-400">Click a row to read examples.</p>
          </div>
        </Section>
      </div>

      {/* ---------- Segment heatmap ---------- */}
      <Section title="Buy rate by segment" subtitle="Darker = more buyers. n = how many personas were in that group.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(stats.segments).map(([name, rows]) => (
            <div key={name} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-2 text-sm font-medium capitalize">{name}</p>
              <div className="space-y-1">
                {rows.map((r) => (
                  <div key={r.value} className="flex items-center gap-2 text-xs">
                    <span className="w-28 truncate text-slate-600" title={r.value}>
                      {r.value}
                    </span>
                    <span
                      className="flex-1 rounded px-2 py-1 text-right font-medium"
                      style={heat(r.buyRate)}
                    >
                      {pct(r.buyRate)}
                    </span>
                    <span className="w-10 text-right text-slate-400">n={r.n}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- Quotes ---------- */}
      <Quotes best={stats.bestQuotes} all={stats.allQuotes} />
    </div>
  );
}

// Green shade: 0% = very light, 50%+ = darkest.
function heat(rate: number): React.CSSProperties {
  const t = Math.min(1, rate / 0.5);
  return {
    background: `rgba(5, 150, 105, ${0.08 + t * 0.85})`,
    color: t > 0.5 ? "white" : "#064e3b",
  };
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
        <span><span className="text-emerald-600">●</span> would {goal} {buy}</span>
        <span><span className="text-amber-400">●</span> maybe {maybe}</span>
        <span><span className="text-slate-300">●</span> no {no}</span>
      </div>
    </div>
  );
}

function Quotes({ best, all }: { best: QuoteItem[]; all: QuoteItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<"all" | QuoteItem["verdict"]>("all");
  const list = showAll ? all.filter((q) => filter === "all" || q.verdict === filter) : best;

  return (
    <Section title={showAll ? `All quotes (${list.length})` : "Best quotes"}>
      <div className="mb-3 flex flex-wrap gap-2">
        <button onClick={() => setShowAll(!showAll)} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm">
          {showAll ? "Show best 10" : `Browse all ${all.length}`}
        </button>
        {showAll &&
          (["all", "buy", "maybe", "no"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-sm border ${filter === f ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-300"}`}
            >
              {f}
            </button>
          ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((q) => (
          <figure key={q.personaId} className="rounded-xl border border-slate-200 bg-white p-4">
            <blockquote className="text-slate-800">“{q.quote}”</blockquote>
            <figcaption className="mt-2 flex justify-between text-xs text-slate-500">
              <span>{q.label}</span>
              <span className={q.verdict === "buy" ? "text-emerald-700" : q.verdict === "maybe" ? "text-amber-700" : "text-slate-500"}>
                {q.verdict}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      {subtitle && <p className="mb-3 text-sm text-slate-500">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </section>
  );
}
