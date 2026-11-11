"use client";
// The dashboard screen. It only DISPLAYS data it is given (src/app/dashboard/page.tsx loads it),
// so it can be previewed with made-up data. Sections can be switched off and on ("Customize"),
// remembered in this browser only.
import { useEffect, useState } from "react";
import Link from "next/link";
import MindsSection from "./MindsSection";
import PlaybookSection, { PlayCard } from "./PlaybookSection";
import InviteCard from "./InviteCard";
import { PLAYS } from "@/lib/playbook";
import type { DashboardData } from "@/lib/dashboard";

const SECTIONS = [
  ["recent", "Recent analyses"],
  ["moves", "Next best moves"],
  ["minds", "Customer minds"],
  ["working", "What's working now"],
] as const;
type SectionId = (typeof SECTIONS)[number][0];
const STORAGE = "crawler-dashboard-hidden";

const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export default function DashboardView({ data }: { data: DashboardData }) {
  const [hidden, setHidden] = useState<SectionId[]>([]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) ?? "[]");
      if (Array.isArray(saved)) setHidden(saved.filter((s) => SECTIONS.some(([id]) => id === s)));
    } catch {
      // storage blocked: everything just stays visible
    }
  }, []);
  const toggle = (id: SectionId) => {
    const next = hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id];
    setHidden(next);
    try {
      localStorage.setItem(STORAGE, JSON.stringify(next));
    } catch {
      // not saved, still works for this visit
    }
  };
  const show = (id: SectionId) => !hidden.includes(id);
  const { plan } = data;
  const done = data.analyses.filter((a) => a.status === "done");

  return (
    <div className="mx-auto max-w-5xl space-y-16">
      {/* ---------- header ---------- */}
      <header className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="t-label">dashboard</p>
            <h1 className="t-h1 mt-3">Welcome back, {data.name}.</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/onboarding" className="btn btn-primary h-12 px-6">
              New website test
            </Link>
            <Link href="/onboarding?kind=app" className="btn btn-secondary h-12 px-6">
              New app test
            </Link>
          </div>
        </div>

        <dl className="card grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-5">
            <dt className="t-label">tests left</dt>
            <dd className="t-number mt-2 text-4xl">{plan.unlimited ? "Unlimited" : plan.left}</dd>
            <dd className="mt-1 text-sm text-muted">{plan.unlimited ? "Admin account" : `${plan.used} used · ${plan.plan} plan`}</dd>
          </div>
          <div className="p-5">
            <dt className="t-label">customers per test</dt>
            <dd className="t-number mt-2 text-4xl">{plan.customers}</dd>
            <dd className="mt-1 text-sm text-muted">
              {plan.customers >= 100 ? "Full size" : (
                <>
                  Starter size.{" "}
                  <a href="#invite" className="underline">
                    Unlock 100
                  </a>
                </>
              )}
            </dd>
          </div>
          <div className="p-5">
            <dt className="t-label">more tests</dt>
            <dd className="mt-2 font-medium">Packs are coming soon</dd>
            <dd className="mt-1 text-sm text-muted">
              <Link href="/pricing" className="underline">
                See pricing
              </Link>{" "}
              ·{" "}
              <Link href="/tools/paywall-checker" className="underline">
                Free paywall checker
              </Link>
            </dd>
          </div>
        </dl>

        {!plan.unlimited && plan.plan === "free" && <InviteCard plan={plan} />}

        <details className="text-sm">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-1 text-fg/80 hover:text-fg">
            <span aria-hidden>⚙</span> Customize this dashboard
          </summary>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Show or hide sections">
            {SECTIONS.map(([id, label]) => (
              <button key={id} type="button" className="chip" aria-pressed={show(id)} onClick={() => toggle(id)}>
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-fg/70">Saved in this browser only.</p>
        </details>
      </header>

      {/* ---------- recent analyses ---------- */}
      {show("recent") && (
        <section aria-labelledby="recent-title">
          <p className="t-label">your work</p>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="recent-title" className="t-h2 mt-2">
              Recent analyses
            </h2>
            <Link href="/tests" className="text-sm underline">
              See all tests
            </Link>
          </div>
          {data.analyses.length === 0 ? (
            <div className="card mt-6 p-8">
              <p className="t-h3">No analyses yet</p>
              <p className="mt-1 text-muted">Your first test is free. Paste a site or drop in your app screens and see what simulated customers say.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/onboarding" className="btn btn-primary">
                  Run my first test
                </Link>
                <Link href="/example" className="btn btn-secondary">
                  See an example report
                </Link>
              </div>
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.analyses.slice(0, 6).map((a) => (
                <li key={a.id} className="card flex flex-col p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="t-label truncate">{a.label}</span>
                    <span className="pill shrink-0">{a.kind}</span>
                  </div>
                  {a.status === "done" ? (
                    <>
                      <p className="mt-4 flex items-end gap-1">
                        <span className="t-number text-6xl text-accent">{a.score}</span>
                        <span className="t-number pb-1 text-xl text-faint">/{a.total}</span>
                      </p>
                      <p className="text-sm text-muted">would {a.goal ?? "convert"}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {a.delta !== null && a.delta !== 0 && (
                          <span className={`pill ${a.delta > 0 ? "pill-buy" : "pill-no"}`}>
                            {a.delta > 0 ? "▲" : "▼"} {Math.abs(a.delta)} pts vs last test
                          </span>
                        )}
                        {a.blocker && <span className="pill">blocker: {a.blocker}</span>}
                      </div>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-muted">{a.status === "error" ? "This test failed and didn't use up your plan." : "Running now…"}</p>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                    <Link href={`/run/${a.id}`} className="btn btn-secondary h-10 px-4 text-sm">
                      {a.status === "done" ? "Open report" : "Watch"}
                    </Link>
                    {a.status === "done" && (
                      <>
                        <Link href={`/run/${a.id}#share`} className="btn btn-text h-10 text-sm">
                          Send
                        </Link>
                        <Link href={a.kind === "app" ? "/onboarding?kind=app" : `/app?url=${encodeURIComponent(a.url)}`} className="btn btn-text h-10 text-sm">
                          Test again
                        </Link>
                      </>
                    )}
                    <span className="ml-auto text-xs text-faint">{date(a.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ---------- next best moves ---------- */}
      {show("moves") && (
        <section aria-labelledby="moves-title">
          <p className="t-label">inspiration from your tests</p>
          <h2 id="moves-title" className="t-h2 mt-2">
            Your next best moves
          </h2>
          {done.length === 0 ? (
            <div className="mt-6 space-y-3">
              <p className="text-fg/80">Run a test and this fills with fixes and plays picked from your own results. Until then, two good starting points:</p>
              {[PLAYS.find((p) => p.area === "app")!, PLAYS.find((p) => p.area === "web")!].map((p) => (
                <PlayCard key={p.id} play={p} />
              ))}
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="card p-6">
                <h3 className="t-h3">Your fix queue</h3>
                <p className="mt-1 text-sm text-muted">From your latest tests, biggest win-back first.</p>
                {data.fixes.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">No fixes yet.</p>
                ) : (
                  <ol className="mt-4 divide-y divide-line">
                    {data.fixes.map((f, i) => (
                      <li key={f.title} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                        <span className="t-label pt-1">0{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <Link href={`/run/${f.testId}`} className="font-medium hover:underline">
                            {f.title}
                          </Link>
                          {f.change && <p className="mt-1 text-sm text-muted">{f.change}</p>}
                          <p className="mt-1 text-xs text-faint">from {f.from}</p>
                        </div>
                        {f.wins > 0 && <span className="t-number shrink-0 text-2xl text-accent">+{f.wins}</span>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <div className="card p-6">
                <h3 className="t-h3">What keeps blocking people</h3>
                <p className="mt-1 text-sm text-muted">The #1 reason people said no, across your latest {Math.min(10, done.length)} tests.</p>
                <ul className="mt-4 space-y-4">
                  {data.blockers.slice(0, 4).map((b) => (
                    <li key={b.category}>
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="font-medium first-letter:uppercase">{b.category}</span>
                        <span className="tabular-nums text-muted">
                          {b.tests} of {Math.min(10, done.length)} tests
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-raised">
                        <div className="h-2 rounded-full bg-fg" style={{ width: `${Math.round(b.share * 100)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {data.moves.length > 0 && (
                <div className="space-y-3 lg:col-span-2">
                  <h3 className="t-h3">Plays to try for those blockers</h3>
                  {data.moves.map((p) => (
                    <PlayCard key={p.id} play={p} />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ---------- customer minds ---------- */}
      {show("minds") && (
        <section aria-labelledby="minds-title">
          <p className="t-label">who tests your product</p>
          <h2 id="minds-title" className="t-h2 mt-2">
            Customer minds
          </h2>
          <div className="mt-6">
            <MindsSection minds={data.minds} />
          </div>
        </section>
      )}

      {/* ---------- what's working ---------- */}
      {show("working") && (
        <section aria-labelledby="working-title">
          <p className="t-label">apps and high conversion</p>
          <h2 id="working-title" className="t-h2 mt-2">
            What&apos;s working right now
          </h2>
          <div className="mt-6">
            <PlaybookSection trends={data.trends} />
          </div>
        </section>
      )}
    </div>
  );
}
