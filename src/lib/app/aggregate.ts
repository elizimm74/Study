// APP TESTS, step 4: count everything IN CODE (free, exact, repeatable).
//  - Ranges: each of the 3 samples gets its own rate; we show the middle one
//    and the lowest-highest, so nobody mistakes "31%" for a precise number.
//  - A/B: a PAIRED sign test on people who reached the paywall. We only count
//    people who chose differently at A and B, and ask: is the split more
//    lopsided than a coin flip would make it?
//  - Benchmark: compared with published subscription-app numbers. If ours look
//    unrealistic we FLAG it; we never quietly change the result.
import { ageBucket } from "../aggregate";
import type { ObjectionCategory } from "../types";
import type { AppPersona, AppScreen, AppVerdict, PaywallDecision } from "./types";

export type Range = { mid: number; low: number; high: number }; // rates, 0..1

export type ScreenStep = { n: number; file: string; type: AppScreen["type"]; title: string; reached: number; quit: number; quitPct: number };

export type AppObjection = {
  category: ObjectionCategory;
  count: number;
  pct: number; // of everyone who didn't convert
  atPaywall: number; // ...who reached the paywall and said no (the easiest to win back)
  examples: string[];
  changeMind: string[];
};

export type AppSegmentRow = { value: string; n: number; converted: number; rate: number };

export type AbResult = {
  convertA: Range;
  convertB: Range;
  pairs: number; // people who reached the paywall
  onlyA: number; // converted on A but not B
  onlyB: number;
  pValue: number;
  winner: "A" | "B" | null;
  confidence: "clear win" | "slight edge" | "too close to call";
  sameDirectionAllSamples: boolean;
};

export type Benchmark = { level: "low" | "normal" | "high"; note: string; source: string };

export type AppQuote = { personaId: string; converted: boolean; decision: PaywallDecision; quote: string; label: string };

export type AppStats = {
  perSample: number;
  samples: number;
  total: number; // all customers across samples
  hasPaywall: boolean;
  convert: Range; // trial + subscribe (or "finished onboarding" when there's no paywall)
  trial: Range;
  subscribe: Range;
  reachedPaywall: Range;
  closeAtPaywall: Range;
  converts: number[]; // converters per sample (the headline uses the middle one)
  funnel: ScreenStep[];
  objections: AppObjection[];
  segments: Record<string, AppSegmentRow[]>;
  ab: AbResult | null;
  benchmark: Benchmark | null;
  bestQuotes: AppQuote[];
  allQuotes: AppQuote[];
};

// RevenueCat, State of Subscription Apps 2025: download -> trial start.
// Median ~6.2%, top 10% of apps ~20.3%. (Re-check yearly.)
export const BENCHMARK = { median: 0.062, top10: 0.203, source: "RevenueCat, State of Subscription Apps 2025 (download to trial start)" };

const converts = (d: PaywallDecision | null) => d === "start trial" || d === "subscribe";

export function aggregateApp(screens: AppScreen[], personas: AppPersona[], verdicts: AppVerdict[], samples: number): AppStats {
  const byId = new Map(personas.map((p) => [p.id, p]));
  const rows = verdicts.map((v) => ({ v, p: byId.get(v.personaId)! })).filter((r) => r.p);
  const hasPaywall = screens.some((s) => s.type === "paywall");
  const isConvert = (v: AppVerdict) => (hasPaywall ? converts(v.decision) : v.stoppedAt === 0);
  const sampleRows = Array.from({ length: samples }, (_, s) => rows.filter((r) => r.v.sample === s)).filter((x) => x.length);

  const rangeOf = (test: (v: AppVerdict) => boolean) => range(sampleRows.map((rs) => rs.filter((r) => test(r.v)).length / rs.length));

  // ----- Screen-by-screen drop-off (all samples together) -----
  let reached = rows.length;
  const funnel: ScreenStep[] = screens.map((s, i) => {
    const quit = rows.filter((r) => r.v.stoppedAt === i + 1).length;
    const step = { n: i + 1, file: s.file, type: s.type, title: s.title, reached, quit, quitPct: reached ? quit / reached : 0 };
    reached -= quit;
    return step;
  });

  // ----- Objections -----
  const nonConverters = rows.filter((r) => !isConvert(r.v));
  const byCat = new Map<ObjectionCategory, typeof rows>();
  for (const r of nonConverters) byCat.set(r.v.objectionCategory, [...(byCat.get(r.v.objectionCategory) ?? []), r]);
  const objections: AppObjection[] = [...byCat.entries()]
    .map(([category, list]) => {
      const paywallFirst = [...list].sort((a, b) => Number(b.v.decision === "close") - Number(a.v.decision === "close"));
      return {
        category,
        count: list.length,
        pct: nonConverters.length ? list.length / nonConverters.length : 0,
        atPaywall: list.filter((r) => r.v.decision === "close").length,
        examples: paywallFirst.slice(0, 8).map((r) => r.v.objection),
        changeMind: paywallFirst.slice(0, 8).map((r) => r.v.wouldChangeMind),
      };
    })
    .sort((a, b) => b.count - a.count);

  // ----- Segments -----
  const segmentFns: Record<string, (p: AppPersona) => string | undefined> = {
    age: (p) => ageBucket(p.age),
    budget: (p) => p.budget,
    mindset: (p) => p.mindset,
    platform: (p) => p.platform,
    "found it via": (p) => p.source,
    patience: (p) => p.patience.split(":")[0],
    occupation: (p) => p.occupation,
  };
  const segments: Record<string, AppSegmentRow[]> = {};
  for (const [name, fn] of Object.entries(segmentFns)) {
    const groups = new Map<string, AppSegmentRow>();
    for (const { v, p } of rows) {
      const key = fn(p);
      if (!key) continue;
      const g = groups.get(key) ?? { value: key, n: 0, converted: 0, rate: 0 };
      g.n++;
      if (isConvert(v)) g.converted++;
      groups.set(key, g);
    }
    segments[name] = [...groups.values()]
      .map((g) => ({ ...g, rate: g.n ? g.converted / g.n : 0 }))
      .sort((a, b) => (name === "age" ? a.value.localeCompare(b.value) : b.n - a.n));
  }

  // ----- A/B (paired) -----
  let ab: AbResult | null = null;
  if (rows.some((r) => r.v.decisionB !== null)) {
    const reachedRows = rows.filter((r) => r.v.decision !== "never reached");
    const onlyA = reachedRows.filter((r) => converts(r.v.decision) && !converts(r.v.decisionB)).length;
    const onlyB = reachedRows.filter((r) => !converts(r.v.decision) && converts(r.v.decisionB)).length;
    const pValue = signTest(onlyA, onlyB);
    const diffs = sampleRows.map((rs) => rs.filter((r) => converts(r.v.decisionB)).length - rs.filter((r) => converts(r.v.decision)).length);
    const leader = onlyB > onlyA ? "B" : onlyA > onlyB ? "A" : null;
    const sameDirection = leader !== null && diffs.every((d) => (leader === "B" ? d > 0 : d < 0));
    const confidence: AbResult["confidence"] =
      leader && pValue < 0.05 && sameDirection ? "clear win" : leader && pValue < 0.2 ? "slight edge" : "too close to call";
    ab = {
      convertA: rangeOf((v) => converts(v.decision)),
      convertB: rangeOf((v) => converts(v.decisionB)),
      pairs: reachedRows.length,
      onlyA,
      onlyB,
      pValue,
      winner: confidence === "too close to call" ? null : leader,
      confidence,
      sameDirectionAllSamples: sameDirection,
    };
  }

  const convert = rangeOf(isConvert);
  const quotes = rows.map(({ v, p }) => ({
    personaId: p.id,
    converted: isConvert(v),
    decision: v.decision,
    quote: v.quote,
    label: [p.age, p.role ?? p.occupation, p.platform].join(", "),
  }));

  return {
    perSample: sampleRows[0]?.length ?? 0,
    samples: sampleRows.length,
    total: rows.length,
    hasPaywall,
    convert,
    trial: rangeOf((v) => v.decision === "start trial"),
    subscribe: rangeOf((v) => v.decision === "subscribe"),
    reachedPaywall: rangeOf((v) => v.decision !== "never reached"),
    closeAtPaywall: rangeOf((v) => v.decision === "close"),
    converts: sampleRows.map((rs) => rs.filter((r) => isConvert(r.v)).length),
    funnel,
    objections,
    segments,
    ab,
    benchmark: hasPaywall ? benchmark(convert.mid) : null,
    bestQuotes: pickQuotes(quotes),
    allQuotes: quotes,
  };
}

export function benchmark(rate: number): Benchmark {
  const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
  if (rate > BENCHMARK.top10)
    return {
      level: "high",
      note: `Higher than the top 10% of subscription apps (about ${pct(BENCHMARK.top10)}). Simulated customers may be too optimistic here; treat this as a best case.`,
      source: BENCHMARK.source,
    };
  if (rate < 0.02)
    return { level: "low", note: `Well below the typical app (median about ${pct(BENCHMARK.median)}). Something early is losing almost everyone.`, source: BENCHMARK.source };
  return { level: "normal", note: `Within the normal range for subscription apps (median about ${pct(BENCHMARK.median)}, top 10% about ${pct(BENCHMARK.top10)}).`, source: BENCHMARK.source };
}

// Middle value + lowest/highest of the samples.
export function range(values: number[]): Range {
  if (!values.length) return { mid: 0, low: 0, high: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  return { mid: sorted[Math.floor((sorted.length - 1) / 2)], low: sorted[0], high: sorted[sorted.length - 1] };
}

// Two-sided exact sign test: how likely is a split at least this lopsided if
// A and B were really equal (each switcher a coin flip)?
export function signTest(a: number, b: number): number {
  const n = a + b;
  if (n === 0) return 1;
  const k = Math.min(a, b);
  let tail = 0;
  for (let i = 0; i <= k; i++) tail += choose(n, i);
  return Math.min(1, (2 * tail) / 2 ** n);
}

function choose(n: number, k: number) {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

// A balanced mix: some converters, mostly not (like reality), readable length.
function pickQuotes(all: AppQuote[]): AppQuote[] {
  const good = all.filter((q) => q.quote.length >= 20 && q.quote.length <= 160);
  const pool = good.length >= 10 ? good : all;
  const yes = pool.filter((q) => q.converted).slice(0, 3);
  const atPaywall = pool.filter((q) => !q.converted && q.decision === "close").slice(0, 4);
  const early = pool.filter((q) => q.decision === "never reached").slice(0, 3);
  const picked = [...yes, ...atPaywall, ...early];
  for (const q of pool) {
    if (picked.length >= 10) break;
    if (!picked.includes(q)) picked.push(q);
  }
  return picked;
}
