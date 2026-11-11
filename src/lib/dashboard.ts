// The dashboard's numbers, worked out IN CODE from a person's own saved tests.
// Pure functions (no database, no AI), so the bench can test them with known answers.
import { playsFor, type Play } from "./playbook";

// One saved test, reduced to what the dashboard needs. Rows come newest first.
export type TestRow = {
  id: string;
  url: string; // "https://site.com" or "app://batch"
  goal: string | null;
  status: string; // queued | running | done | error
  score: number | null;
  total: number | null;
  created_at: string;
  kind: string | null; // "app" for app tests
  objections: { category: string; count?: number }[] | null;
  fixes: { title: string; change?: string; couldFlip?: number; likelyFlip?: number; couldWin?: number; atPaywall?: number }[] | null;
};

export type Analysis = {
  id: string;
  url: string; // used for "test again"
  label: string; // "mealmate.app" or "App onboarding + paywall"
  kind: "website" | "app";
  status: string;
  pct: number | null; // score as a percent of customers
  score: number | null;
  total: number | null;
  goal: string | null;
  blocker: string | null; // the #1 reason people said no
  delta: number | null; // points vs the previous test of the same thing (null = first one)
  created_at: string;
};

export const isApp = (r: TestRow) => r.kind === "app" || r.url.startsWith("app://");
export const labelOf = (r: TestRow) =>
  isApp(r) ? "App onboarding + paywall" : r.url.replace(/^https?:\/\/(www\.)?/, "").replace(/[/?#].*$/, "");

export function analyses(rows: TestRow[]): Analysis[] {
  const out: Analysis[] = rows.map((r) => ({
    id: r.id,
    url: r.url,
    label: labelOf(r),
    kind: isApp(r) ? "app" : "website",
    status: r.status,
    pct: r.status === "done" && r.score !== null && r.total ? Math.round((r.score / r.total) * 100) : null,
    score: r.score,
    total: r.total,
    goal: r.goal,
    blocker: r.objections?.[0]?.category ?? null,
    delta: null,
    created_at: r.created_at,
  }));
  // Trend: compare each finished test with the next-older finished test of the same site / the app flow.
  for (let i = 0; i < out.length; i++) {
    if (out[i].pct === null) continue;
    const older = out.slice(i + 1).find((o) => o.pct !== null && o.label === out[i].label && o.kind === out[i].kind);
    if (older && older.pct !== null) out[i].delta = out[i].pct! - older.pct;
  }
  return out;
}

// The reasons that keep ending up #1 across the most recent finished tests.
export function recurringBlockers(rows: TestRow[], recent = 10): { category: string; tests: number; share: number }[] {
  const done = rows.filter((r) => r.status === "done" && r.objections?.length).slice(0, recent);
  const tally = new Map<string, number>();
  for (const r of done) tally.set(r.objections![0].category, (tally.get(r.objections![0].category) ?? 0) + 1);
  return [...tally.entries()]
    .map(([category, tests]) => ({ category, tests, share: done.length ? tests / done.length : 0 }))
    .sort((a, b) => b.tests - a.tests || a.category.localeCompare(b.category));
}

export type QueuedFix = { title: string; change: string; wins: number; from: string; testId: string };

// Fixes from the latest finished tests, best first, with duplicates merged.
// "wins" = how many simulated customers the fix could win back (counted in code when the test ran).
export function fixQueue(rows: TestRow[], limit = 5, recent = 5): QueuedFix[] {
  const best = new Map<string, QueuedFix>();
  for (const r of rows.filter((x) => x.status === "done" && x.fixes?.length).slice(0, recent)) {
    for (const f of r.fixes!) {
      const wins = f.atPaywall || f.likelyFlip || f.couldWin || f.couldFlip || 0;
      const key = f.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const have = best.get(key);
      if (!have || wins > have.wins) best.set(key, { title: f.title, change: f.change ?? "", wins, from: labelOf(r), testId: r.id });
    }
  }
  return [...best.values()].sort((a, b) => b.wins - a.wins || a.title.localeCompare(b.title)).slice(0, limit);
}

// "Your next best moves": playbook plays for the reasons that keep coming up.
export function nextMoves(blockers: { category: string }[], limit = 4): Play[] {
  const seen = new Set<string>();
  const out: Play[] = [];
  for (const b of blockers) {
    for (const p of playsFor(b.category)) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        out.push(p);
      }
    }
  }
  return out.slice(0, limit);
}

// What the database says about this account (see my_plan() in migration 0007).
export type PlanData = {
  plan: string;
  unlimited: boolean;
  customers: number; // simulated customers in the next test: 25 (starter) or 100 (full)
  used: number;
  limit: number;
  left: number;
  inviteLink: string;
  referrals: { count: number; needed: number; code: string };
};

export type Trends = { enough: false; tests: number; needed: number } | { enough: true; tests: number; blockers: { category: string; pct: number }[] };

export type DashboardData = {
  name: string; // a friendly first name or the email's start
  analyses: Analysis[];
  blockers: { category: string; tests: number; share: number }[];
  fixes: QueuedFix[];
  moves: Play[];
  minds: { id: string; name: string; updated_at: string; audience: import("./types").Audience }[];
  plan: PlanData;
  trends: Trends | null;
};
