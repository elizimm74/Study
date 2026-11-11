"use client";
// "What's working right now": the playbook for apps and websites, the published benchmarks,
// and (once there are enough tests) anonymous patterns from Crawler itself.
// Every play says what kind of evidence is behind it. Nothing here is live data unless it says so.
import { useState } from "react";
import Link from "next/link";
import { BENCHMARKS, BENCHMARKS_REVIEWED, PLAYS, type Evidence, type Play } from "@/lib/playbook";
import type { Trends } from "@/lib/dashboard";

const EVIDENCE: Record<Evidence, { label: string; hint: string }> = {
  "store policy": { label: "store rule", hint: "Apple or Google asks for this" },
  "published research": { label: "research", hint: "Backed by a published study or report" },
  "practitioner advice": { label: "practitioner advice", hint: "Widely repeated, but no single study to point at" },
};

export function PlayCard({ play, open = false }: { play: Play; open?: boolean }) {
  return (
    <details open={open} className="card group">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
        <span className="font-medium">{play.title}</span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="pill" title={EVIDENCE[play.evidence].hint}>
            {EVIDENCE[play.evidence].label}
          </span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform duration-200 group-open:rotate-180" aria-hidden>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div className="space-y-3 border-t border-line px-5 py-4 text-sm">
        <p>
          <span className="font-medium">Why: </span>
          {play.why}
        </p>
        <p>
          <span className="font-medium">Do this: </span>
          {play.how}
        </p>
        {play.source && (
          <p className="text-xs text-faint">
            Source:{" "}
            {play.source.url ? (
              <a href={play.source.url} target="_blank" rel="noreferrer" className="underline">
                {play.source.label}
              </a>
            ) : (
              play.source.label
            )}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link href={play.area === "app" ? "/tools/paywall-checker" : "/onboarding"} className="btn btn-secondary h-9 px-4 text-sm">
            {play.area === "app" ? "Check my paywall" : "Test my page"}
          </Link>
          {play.fixes.length > 0 && <span className="text-xs text-faint">helps with: {play.fixes.join(", ")}</span>}
        </div>
      </div>
    </details>
  );
}

export default function PlaybookSection({ trends }: { trends: Trends | null }) {
  const [tab, setTab] = useState<"app" | "web">("app");
  const plays = PLAYS.filter((p) => p.area === tab);
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        {BENCHMARKS.map((b) => (
          <div key={b.label} className="card p-5">
            <p className="t-label">{b.label}</p>
            <p className="t-number mt-2 text-5xl text-accent">{b.value}</p>
            <p className="mt-1 text-sm">{b.note}</p>
            <p className="mt-2 text-xs text-faint">{b.source}</p>
          </div>
        ))}
      </div>

      <div>
        <div role="group" aria-label="Playbook area" className="flex flex-wrap gap-2">
          {(
            [
              ["app", "Apps: onboarding + paywall"],
              ["web", "Websites: landing + signup"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className="chip" aria-pressed={tab === k}>
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {plays.map((p, i) => (
            <PlayCard key={p.id} play={p} open={i === 0} />
          ))}
        </div>
        <p className="mt-4 text-sm text-fg/70">
          Curated from published research and store policy, reviewed {BENCHMARKS_REVIEWED}. It&apos;s a starting point, not a promise: test it on
          your own product.
        </p>
      </div>

      <div className="card p-6">
        <p className="t-label">from crawler tests · anonymous</p>
        {trends?.enough ? (
          <>
            <h3 className="t-h3 mt-2">What blocks people most, across {trends.tests} tests</h3>
            <ul className="mt-4 space-y-3">
              {trends.blockers.map((b) => (
                <li key={b.category}>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="font-medium first-letter:uppercase">{b.category}</span>
                    <span className="tabular-nums text-muted">{b.pct}% of tests</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-raised">
                    <div className="h-2 rounded-full bg-fg" style={{ width: `${b.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-faint">Share of tests where this was the #1 reason people said no. Simulated customers, so this is buying intent, not real purchases.</p>
          </>
        ) : (
          <>
            <h3 className="t-h3 mt-2">Not enough tests yet to show a pattern</h3>
            <p className="mt-2 text-sm text-muted">
              Crawler has {trends?.tests ?? 0} finished tests so far. We show patterns from real Crawler tests once there are {trends?.needed ?? 30}, so
              nobody can pick out one person&apos;s test, and so a handful of tests can&apos;t pass for a trend.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
