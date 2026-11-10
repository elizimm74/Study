"use client";
// The report for an APP test, ordered by importance:
//   1. The answer: "X of 100 would start a trial", the honest range, the summary
//   2. Store rules (may be flagged) + fixes ranked by who they'd win back
//   3. Where people quit, screen by screen (with the screenshots)
//   4. A/B verdict (when there's a version B)
//   5. Paywall copy rewrites, why people said no, quotes, segments
// Every number is counted in code (stats); the advice text is written by Sonnet.
import { useState } from "react";
import type { AppRun } from "@/lib/app/pipeline";
import type { Range } from "@/lib/app/aggregate";
import { ChecksList } from "./PaywallEditor";
import { fileUrl } from "@/lib/urls";
import AskBox from "@/components/AskBox";
import ShareBox from "@/components/ShareBox";
import ActualBox from "@/components/ActualBox";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const rangeText = (r: Range) => (Math.round(r.low * 100) === Math.round(r.high * 100) ? pct(r.mid) : `${pct(r.low)}–${pct(r.high)}`);

export default function AppReport({ run, demo = false }: { run: AppRun; demo?: boolean }) {
  const stats = run.stats!;
  const advice = run.advice!;
  const middle = [...stats.converts].sort((a, b) => a - b)[Math.floor((stats.converts.length - 1) / 2)] ?? 0;
  const goal = stats.hasPaywall ? (run.profile.goal === "start a free trial" ? "start a trial or subscribe" : "subscribe") : "finish onboarding";
  const worst = [...stats.funnel].sort((a, b) => b.quit - a.quit)[0];
  const failed = run.checks.filter((c) => !c.ok);
  const [allQuotes, setAllQuotes] = useState(false);
  const fixes = advice.fixes;

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      {/* ---------- 1. The answer ---------- */}
      <section className="paper bleed py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <span className="t-label truncate">app test · {stats.samples} samples of {stats.perSample}</span>
            <span className="t-label shrink-0">report</span>
          </div>
          <div className="mt-8 grid gap-8 md:grid-cols-[auto_1fr] md:items-end md:gap-12">
            <div>
              <p className="flex items-end gap-2">
                <span className="t-number text-8xl text-accent sm:text-9xl">{middle}</span>
                <span className="t-number pb-2 text-3xl text-faint sm:text-4xl">/{stats.perSample}</span>
              </p>
              <p className="mt-2 text-lg font-medium">would {goal}</p>
              <p className="mt-1 text-sm text-muted">range across 3 crowds: {rangeText(stats.convert)}</p>
            </div>
            <div className="space-y-4">
              <p className="t-lead text-fg">{advice.summary}</p>
              <div className="flex flex-wrap gap-2">
                {worst?.quit > 0 && (
                  <span className="pill">
                    Most quit at screen {worst.n} ({worst.type}) · {pct(worst.quitPct)}
                  </span>
                )}
                {stats.hasPaywall && <span className="pill">Reached the paywall: {rangeText(stats.reachedPaywall)}</span>}
                {failed.some((c) => c.kind === "store rule") && <span className="pill pill-no">Store rules may be flagged</span>}
              </div>
            </div>
          </div>
          {stats.benchmark && (
            <p className="mt-8 border-t border-line pt-4 text-sm text-muted">
              <span className="font-medium text-fg">Reality check: </span>
              {stats.benchmark.note} <span className="text-faint">Source: {stats.benchmark.source}.</span>
            </p>
          )}
        </div>
      </section>

      {/* ---------- 2. Fixes ---------- */}
      <section>
        <p className="t-label">fix these first</p>
        <ol className="mt-4 divide-y divide-line border-y border-line">
          {fixes.map((f, i) => (
            <li key={f.title} className="grid gap-2 py-6 sm:grid-cols-[3rem_1fr_auto] sm:gap-6">
              <span className="t-label pt-1">0{i + 1}</span>
              <div className="min-w-0">
                <p className="t-h3">{f.title}</p>
                <p className="mt-2 text-muted">{f.problem}</p>
                <p className="mt-2">
                  <span className="font-medium">Do this: </span>
                  {f.change}
                </p>
                {f.screen > 0 && <p className="t-label mt-2">screen {f.screen}</p>}
              </div>
              {f.couldWin > 0 && (
                <div className="sm:text-right">
                  <p className="t-number text-3xl">+{f.atPaywall || f.couldWin}</p>
                  <p className="text-xs text-muted">{f.atPaywall ? "said no at the paywall" : "had this objection"}</p>
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- 3. Screen by screen ---------- */}
      <section>
        <p className="t-label">where people quit</p>
        <h2 className="t-h2 mt-2">Screen by screen</h2>
        <ol className="mt-6 flex gap-4 overflow-x-auto pb-4">
          {stats.funnel.map((s) => {
            const shot = run.settings.screens[s.n - 1];
            const heavy = s.quit > 0 && s === worst;
            return (
              <li key={s.n} className="w-32 shrink-0 sm:w-36">
                {demo ? (
                  // the example report has no real screenshots: draw a simple phone screen
                  <div
                    className={`flex aspect-[9/16] w-full flex-col rounded-lg border bg-white p-3 ${heavy ? "border-white ring-2 ring-white" : "border-line"}`}
                    role="img"
                    aria-label={`Example screen ${s.n}: ${s.type}`}
                  >
                    <span className="block h-2 w-3/4 rounded bg-[#1a2aa6]" />
                    <span className="mt-2 block h-1.5 w-1/2 rounded bg-[#dfe3f5]" />
                    <span className="mt-1.5 block h-1.5 w-2/3 rounded bg-[#dfe3f5]" />
                    <span className="mt-auto block h-5 w-full rounded bg-[#1a2aa6]" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fileUrl(run.screensPrefix, shot.file)}
                    alt={`Screen ${s.n}: ${s.title || s.type}`}
                    className={`aspect-[9/16] w-full rounded-lg border object-cover object-top ${heavy ? "border-white ring-2 ring-white" : "border-line"}`}
                  />
                )}
                <p className="t-label mt-2">
                  {s.n} · {s.type}
                </p>
                <p className="t-number mt-1 text-xl">{s.quit ? `−${pct(s.quitPct)}` : "0%"}</p>
                <p className="text-xs text-muted">
                  {s.quit} of {s.reached} quit
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ---------- 4. A/B ---------- */}
      {stats.ab && (
        <section className="card p-6 sm:p-8">
          <p className="t-label">paywall a/b · same customers saw both</p>
          <h2 className="t-h2 mt-2">
            {stats.ab.winner ? `Version ${stats.ab.winner} wins` : "Too close to call"}
            {stats.ab.winner && <span className="ml-2 align-middle text-base font-normal text-muted">({stats.ab.confidence})</span>}
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4">
            {(["A", "B"] as const).map((v) => (
              <div key={v} className={`rounded-xl border p-4 ${stats.ab!.winner === v ? "border-accent ring-1 ring-accent" : "border-line"}`}>
                <p className="t-label">version {v}</p>
                <p className="t-number mt-2 text-4xl">{rangeText(v === "A" ? stats.ab!.convertA : stats.ab!.convertB)}</p>
                <p className="text-sm text-muted">would {goal}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            Of {stats.ab.pairs} people who reached the paywall, {stats.ab.onlyB} said yes only to B and {stats.ab.onlyA} only to A. Chance this
            gap is luck: {stats.ab.pValue < 0.001 ? "under 0.1%" : pct(stats.ab.pValue)}.
            {!stats.ab.sameDirectionAllSamples && stats.ab.winner && " The 3 crowds didn't all agree, so treat it as a lean, not a sure thing."}
          </p>
        </section>
      )}

      {/* ---------- 5. Store rules + copy ---------- */}
      {stats.hasPaywall && (
        <section className="grid gap-8 md:grid-cols-2">
          <div className="card p-6">
            <h2 className="t-h3">Paywall checks</h2>
            <p className="mt-1 text-sm text-muted">Checked in code on the facts you confirmed. Reviewers decide, not us.</p>
            <div className="mt-4">
              <ChecksList checks={run.checks} />
            </div>
          </div>
          <div className="card p-6">
            <h2 className="t-h3">Rewritten paywall copy</h2>
            <p className="t-label mt-4">headline</p>
            <ul className="mt-2 space-y-2">
              {advice.paywallHeadlines.map((h) => (
                <li key={h} className="font-medium">
                  {h}
                </li>
              ))}
            </ul>
            <p className="t-label mt-6">button</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {advice.ctaOptions.map((c) => (
                <span key={c} className="pill">
                  {c}
                </span>
              ))}
            </div>
            <p className="t-label mt-6">under the button</p>
            <p className="mt-2 text-sm">{advice.trialLine}</p>
            <p className="t-label mt-6">onboarding</p>
            <p className="mt-2 text-sm">{advice.onboardingTip}</p>
          </div>
        </section>
      )}

      {/* ---------- 6. Why, quotes, segments ---------- */}
      <section>
        <p className="t-label">why people said no</p>
        <ul className="mt-4 space-y-4">
          {stats.objections.slice(0, 6).map((o) => (
            <li key={o.category}>
              <div className="flex justify-between gap-4 text-sm">
                <span className="font-medium">{o.category}</span>
                <span className="tabular-nums text-muted">{pct(o.pct)}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-line">
                <div className="h-2 rounded-full bg-fg" style={{ width: pct(o.pct) }} />
              </div>
              {o.examples[0] && <p className="mt-2 text-sm text-muted">“{o.examples[0]}”</p>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <p className="t-label">in their words</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {(allQuotes ? stats.allQuotes : stats.bestQuotes).map((q) => (
            <li key={q.personaId} className="card min-w-0 p-4">
              <p>“{q.quote}”</p>
              <p className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
                <span className="truncate">{q.label}</span>
                <span className={`pill ${q.converted ? "pill-buy" : "pill-no"}`}>{q.converted ? "yes" : q.decision === "close" ? "closed paywall" : "quit early"}</span>
              </p>
            </li>
          ))}
        </ul>
        <button onClick={() => setAllQuotes(!allQuotes)} className="btn btn-text mt-4">
          {allQuotes ? "Show fewer" : `Show all ${stats.allQuotes.length}`}
        </button>
      </section>

      <details className="card group">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-6 py-4 font-medium">Who said yes most / least</summary>
        <div className="grid gap-6 border-t border-line p-6 sm:grid-cols-2">
          {Object.entries(stats.segments).map(([name, rows]) => (
            <div key={name}>
              <p className="t-label">{name}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {rows.slice(0, 6).map((r) => (
                  <li key={r.value} className="flex justify-between gap-4">
                    <span className="truncate">{r.value}</span>
                    <span className="tabular-nums text-muted">
                      {pct(r.rate)} <span className="text-faint">(n={r.n})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      {/* free follow-up questions (and "something's wrong" fixes) */}
      {!demo && (
        <>
          <ShareBox testId={run.id} headline={`${middle} of ${stats.perSample} simulated customers would ${goal} in my app's onboarding + paywall`} />
          <AskBox testId={run.id} rerunHref="/app?kind=app" />
          <ActualBox testId={run.id} kind="app" />
        </>
      )}

      <p className="text-center text-xs text-faint">
        Simulated customers show buying intent, not real purchases. Cost of this test: ${run.totalCostUsd?.toFixed(3) ?? "?"}.
      </p>
    </div>
  );
}
