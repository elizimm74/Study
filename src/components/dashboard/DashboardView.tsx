"use client";
// The dashboard screen. It only DISPLAYS data it is given (src/app/dashboard/page.tsx loads it).
// Layout: a personal header on the blue page (greeting + one sentence about YOUR latest result),
// then a white workspace with five tabs so each view is short and focused instead of one endless page.
import { useEffect, useState } from "react";
import Link from "next/link";
import MindsSection from "./MindsSection";
import PlaybookSection, { PlayCard } from "./PlaybookSection";
import InviteCard from "./InviteCard";
import { PLAYS } from "@/lib/playbook";
import type { Analysis, DashboardData } from "@/lib/dashboard";

const TABS = [
  ["overview", "Overview"],
  ["tests", "Tests"],
  ["fixes", "Fixes"],
  ["minds", "Customer minds"],
  ["playbook", "Playbook"],
] as const;
type TabId = (typeof TABS)[number][0];

const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// A tiny trend line of your scores, oldest to newest (plain SVG, no chart library).
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <p className="text-xs text-faint">Run one more test to see a trend.</p>;
  const w = 160,
    h = 44,
    max = Math.max(...values, 1),
    min = Math.min(...values, 0);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 8) + 4, h - 6 - ((v - min) / (max - min || 1)) * (h - 12)]);
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Score trend: ${values.join(", ")}`}>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="4" fill="var(--accent)" />
    </svg>
  );
}

function Delta({ n }: { n: number | null }) {
  if (n === null || n === 0) return <span className="text-xs text-faint">{n === 0 ? "no change" : "first test"}</span>;
  return <span className={`pill ${n > 0 ? "pill-buy" : "pill-no"}`}>{n > 0 ? "▲" : "▼"} {Math.abs(n)} pts</span>;
}

function Stat({ label, children, note }: { label: string; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-subtle p-5">
      <p className="t-label">{label}</p>
      <div className="mt-2">{children}</div>
      {note && <p className="mt-1 text-sm text-muted">{note}</p>}
    </div>
  );
}

export default function DashboardView({ data }: { data: DashboardData }) {
  const [tab, setTab] = useState<TabId>("overview");
  const [hello, setHello] = useState("Welcome back");
  useEffect(() => {
    const h = new Date().getHours();
    setHello(h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
    const fromHash = window.location.hash.slice(1) as TabId;
    if (TABS.some(([id]) => id === fromHash)) setTab(fromHash);
  }, []);
  const pick = (id: TabId) => {
    setTab(id);
    try {
      history.replaceState(null, "", `#${id}`);
    } catch {
      // not important
    }
  };

  const { plan } = data;
  const done = data.analyses.filter((a) => a.status === "done");
  const latest: Analysis | undefined = done[0];
  const trend = done.filter((a) => a.pct !== null && a.kind === latest?.kind && a.label === latest?.label).map((a) => a.pct!).reverse();
  const topFix = data.fixes[0];
  const topBlocker = data.blockers[0];

  // One personal sentence under the greeting, built only from this person's own results.
  const summary = !latest
    ? "Your first test is free. Paste a site or drop in your app screens and see what simulated customers say."
    : `${latest.label} ${latest.delta === null ? "scored" : latest.delta > 0 ? "improved to" : latest.delta < 0 ? "dropped to" : "held at"} ${latest.score} of ${latest.total} in your latest test.` +
      (latest.blocker ? ` The biggest blocker was “${latest.blocker}”.` : "");

  return (
    <div className="mx-auto max-w-6xl">
      {/* ---------- personal header ---------- */}
      <header className="flex flex-wrap items-end justify-between gap-6 pb-10">
        <div className="max-w-2xl">
          <p className="t-label">{plan.unlimited ? "admin" : `${plan.plan} plan`} · dashboard</p>
          <h1 className="t-h1 mt-3">
            {hello}, {data.name}.
          </h1>
          <p className="t-lead mt-3 text-white/85">{summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/onboarding" className="btn btn-primary h-12 px-6">
            New website test
          </Link>
          <Link href="/onboarding?kind=app" className="btn h-12 border border-white/40 px-6 text-white hover:bg-white/10">
            New app test
          </Link>
        </div>
      </header>

      {/* ---------- workspace ---------- */}
      <div className="paper px-5 py-6 sm:px-8 sm:py-8">
        <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-line pb-3" role="tablist" aria-label="Dashboard views">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => pick(id)}
              className={`min-h-11 shrink-0 rounded-lg px-4 text-sm font-medium transition-colors ${tab === id ? "bg-accent text-accent-fg" : "text-muted hover:bg-subtle hover:text-fg"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="pt-8" role="tabpanel">
          {/* ===== OVERVIEW ===== */}
          {tab === "overview" && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <Stat label="latest score" note={latest ? `would ${latest.goal ?? "convert"}` : "no tests yet"}>
                  <p className="flex items-end gap-1">
                    <span className="t-number text-5xl text-accent">{latest ? latest.score : "–"}</span>
                    {latest && <span className="t-number pb-1 text-lg text-faint">/{latest.total}</span>}
                  </p>
                </Stat>
                <Stat label="vs last test" note={latest ? latest.label : undefined}>
                  <div className="flex h-12 items-center">{latest ? <Delta n={latest.delta} /> : <span className="text-faint">–</span>}</div>
                </Stat>
                <Stat label="tests left" note={plan.unlimited ? "Admin account" : `${plan.used} used`}>
                  <p className="t-number text-5xl">{plan.unlimited ? "∞" : plan.left}</p>
                </Stat>
                <Stat
                  label="customers per test"
                  note={
                    plan.customers >= 100 ? (
                      "Full size"
                    ) : (
                      <a href="#invite" className="underline">Unlock 100 with invites</a>
                    )
                  }
                >
                  <p className="t-number text-5xl">{plan.customers}</p>
                </Stat>
              </div>

              <div className="grid gap-6 lg:grid-cols-5">
                {/* latest result */}
                <section className="rounded-xl border border-line p-6 lg:col-span-3" aria-label="Latest result">
                  <p className="t-label">your latest result</p>
                  {latest ? (
                    <>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h2 className="t-h2">{latest.label}</h2>
                          <p className="mt-1 text-sm text-muted">{date(latest.created_at)} · {latest.kind}</p>
                        </div>
                        <Sparkline values={trend} />
                      </div>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-subtle p-4">
                          <p className="t-label">biggest blocker</p>
                          <p className="mt-1 font-medium first-letter:uppercase">{topBlocker?.category ?? latest.blocker ?? "None found"}</p>
                          {topBlocker && <p className="mt-1 text-sm text-muted">#1 in {topBlocker.tests} of your recent tests</p>}
                        </div>
                        <div className="rounded-lg bg-subtle p-4">
                          <p className="t-label">best next fix</p>
                          <p className="mt-1 font-medium">{topFix ? topFix.title : "No fixes yet"}</p>
                          {topFix && topFix.wins > 0 && <p className="mt-1 text-sm text-muted">could win back {topFix.wins} customers</p>}
                        </div>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Link href={`/run/${latest.id}`} className="btn btn-primary h-11 px-5">Open report</Link>
                        <Link href={`/run/${latest.id}#share`} className="btn btn-secondary h-11 px-5">Send this score</Link>
                        <Link href={latest.kind === "app" ? "/onboarding?kind=app" : `/app?url=${encodeURIComponent(latest.url)}`} className="btn btn-text h-11">Test again</Link>
                      </div>
                    </>
                  ) : (
                    <div className="mt-3">
                      <h2 className="t-h2">Run your first test</h2>
                      <p className="mt-2 text-muted">It takes about a minute. You get a score, what stopped people, and ranked fixes.</p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Link href="/onboarding" className="btn btn-primary h-11 px-5">Test my website</Link>
                        <Link href="/example" className="btn btn-secondary h-11 px-5">See an example report</Link>
                      </div>
                    </div>
                  )}
                </section>

                {/* next move */}
                <section className="rounded-xl border border-line p-6 lg:col-span-2" aria-label="Next move">
                  <p className="t-label">try this next</p>
                  <div className="mt-3 space-y-3">
                    {(data.moves.length ? data.moves.slice(0, 2) : [PLAYS.find((p) => p.area === "web")!]).map((p) => (
                      <PlayCard key={p.id} play={p} />
                    ))}
                  </div>
                  <button type="button" className="btn btn-text mt-2 h-10 text-sm" onClick={() => pick("playbook")}>See the full playbook</button>
                </section>
              </div>

              {!plan.unlimited && plan.plan === "free" && <InviteCard plan={plan} />}
            </div>
          )}

          {/* ===== TESTS ===== */}
          {tab === "tests" && (
            <section aria-label="All tests">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="t-h2">Your tests</h2>
                <Link href="/tests" className="text-sm underline">Open the full list</Link>
              </div>
              {data.analyses.length === 0 ? (
                <p className="mt-4 text-muted">No tests yet. Your first one is free.</p>
              ) : (
                <ul className="mt-5 divide-y divide-line rounded-xl border border-line">
                  {data.analyses.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 sm:px-6">
                      <div className="min-w-0 flex-1 basis-48">
                        <p className="truncate font-medium">{a.label}</p>
                        <p className="text-xs text-faint">{date(a.created_at)} · {a.kind}{a.blocker ? ` · blocker: ${a.blocker}` : ""}</p>
                      </div>
                      {a.status === "done" ? (
                        <>
                          <p className="t-number text-3xl text-accent">{a.score}<span className="text-base text-faint">/{a.total}</span></p>
                          <Delta n={a.delta} />
                          <Link href={`/run/${a.id}`} className="btn btn-secondary h-10 px-4 text-sm">Open</Link>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-muted">{a.status === "error" ? "Failed, not counted" : "Running…"}</span>
                          <Link href={`/run/${a.id}`} className="btn btn-secondary h-10 px-4 text-sm">{a.status === "error" ? "Details" : "Watch"}</Link>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* ===== FIXES ===== */}
          {tab === "fixes" && (
            <section aria-label="Fixes">
              <h2 className="t-h2">Your fix queue</h2>
              <p className="mt-1 text-muted">From your latest tests, biggest win-back first.</p>
              {done.length === 0 ? (
                <p className="mt-4 text-muted">Run a test and your fixes show up here.</p>
              ) : (
                <div className="mt-6 grid gap-6 lg:grid-cols-5">
                  <ol className="divide-y divide-line rounded-xl border border-line lg:col-span-3">
                    {data.fixes.length === 0 && <li className="p-5 text-sm text-muted">No fixes yet.</li>}
                    {data.fixes.map((f, i) => (
                      <li key={f.title} className="flex items-start gap-4 p-5">
                        <span className="t-label pt-1">0{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <Link href={`/run/${f.testId}`} className="font-medium hover:underline">{f.title}</Link>
                          {f.change && <p className="mt-1 text-sm text-muted">{f.change}</p>}
                          <p className="mt-1 text-xs text-faint">from {f.from}</p>
                        </div>
                        {f.wins > 0 && <span className="t-number shrink-0 text-2xl text-accent">+{f.wins}</span>}
                      </li>
                    ))}
                  </ol>
                  <div className="rounded-xl border border-line p-5 lg:col-span-2">
                    <h3 className="t-h3">What keeps blocking people</h3>
                    <p className="mt-1 text-sm text-muted">The #1 reason, across your latest {Math.min(10, done.length)} tests.</p>
                    <ul className="mt-4 space-y-4">
                      {data.blockers.slice(0, 5).map((b) => (
                        <li key={b.category}>
                          <div className="flex justify-between gap-4 text-sm">
                            <span className="font-medium first-letter:uppercase">{b.category}</span>
                            <span className="tabular-nums text-muted">{b.tests} of {Math.min(10, done.length)}</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-raised">
                            <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.round(b.share * 100)}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ===== MINDS ===== */}
          {tab === "minds" && (
            <section aria-label="Customer minds">
              <h2 className="t-h2">Customer minds</h2>
              <p className="mt-1 text-muted">Who tests your product. Pick a ready-made mind or build your own.</p>
              <div className="mt-6">
                <MindsSection minds={data.minds} />
              </div>
            </section>
          )}

          {/* ===== PLAYBOOK ===== */}
          {tab === "playbook" && (
            <section aria-label="Playbook">
              <h2 className="t-h2">What&apos;s working right now</h2>
              <p className="mt-1 text-muted">Apps and high conversion, with the evidence behind each play.</p>
              <div className="mt-6">
                <PlaybookSection trends={data.trends} />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
