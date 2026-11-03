// STEP 5 of the engine: turn raw verdicts into report numbers — IN CODE.
// This is free and exact, and it's why we never need to send every raw
// verdict to the expensive model.
import type { Audience, Persona, Verdict, ObjectionCategory, FunnelStep } from "./types";

export type SegmentRow = {
  value: string;
  n: number;
  buy: number;
  maybe: number;
  no: number;
  buyRate: number; // 0..1
};

export type ObjectionGroup = {
  category: ObjectionCategory;
  count: number;
  pctOfNonBuyers: number; // 0..1
  maybeCount: number; // the easiest people to flip
  examples: string[]; // a few objections in their own words
  changeMind: string[]; // what they said would win them
};

export type QuoteItem = {
  personaId: string;
  verdict: Verdict["verdict"];
  quote: string;
  label: string; // short persona description, e.g. "24, student, price-sensitive"
};

export type Stats = {
  total: number;
  buy: number;
  maybe: number;
  no: number;
  buyRate: number;
  segments: Record<string, SegmentRow[]>; // e.g. segments.age = [...]
  funnel: { step: FunnelStep | "converted"; reached: number; lost: number }[];
  objections: ObjectionGroup[];
  bestQuotes: QuoteItem[];
  allQuotes: QuoteItem[];
};

export function ageBucket(age: number) {
  if (age < 18) return "under 18";
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  if (age < 55) return "45-54";
  if (age < 65) return "55-64";
  return "65+";
}

export function aggregate(audience: Audience, personas: Persona[], verdicts: Verdict[]): Stats {
  const personaById = new Map(personas.map((p) => [p.id, p]));
  const rows = verdicts
    .map((v) => ({ v, p: personaById.get(v.personaId)! }))
    .filter((r) => r.p);

  const total = rows.length;
  const count = (verdict: Verdict["verdict"]) => rows.filter((r) => r.v.verdict === verdict).length;
  const buy = count("buy");

  // ----- Segments (the heatmap) -----
  const segmentFns: Record<string, (p: Persona) => string | undefined> = {
    age: (p) => ageBucket(p.age),
    income: (p) => p.income,
    occupation: (p) => p.occupation,
    mindset: (p) => p.mindset,
    "tech comfort": (p) => p.techComfort,
    area: (p) => p.area,
    gender: (p) => p.gender,
  };
  if (audience.mode === "business") {
    segmentFns.role = (p) => p.role;
    segmentFns["company size"] = (p) => p.companySize;
    segmentFns["who decides"] = (p) => (p.canBuyAlone ? "can buy alone" : "needs approval");
  }

  const segments: Record<string, SegmentRow[]> = {};
  for (const [name, fn] of Object.entries(segmentFns)) {
    const groups = new Map<string, SegmentRow>();
    for (const { v, p } of rows) {
      const key = fn(p);
      if (!key) continue;
      const g = groups.get(key) ?? { value: key, n: 0, buy: 0, maybe: 0, no: 0, buyRate: 0 };
      g.n++;
      g[v.verdict]++;
      groups.set(key, g);
    }
    segments[name] = [...groups.values()]
      .map((g) => ({ ...g, buyRate: g.n ? g.buy / g.n : 0 }))
      .sort((a, b) => (name === "age" ? a.value.localeCompare(b.value) : b.n - a.n));
  }

  // ----- Funnel drop-off -----
  let reached = total;
  const funnel: Stats["funnel"] = [];
  for (const step of ["hero", "pricing", "signup"] as const) {
    const lost = rows.filter((r) => r.v.lostAt === step).length;
    funnel.push({ step, reached, lost });
    reached -= lost;
  }
  funnel.push({ step: "converted", reached, lost: 0 });

  // ----- Objections, grouped by category -----
  const nonBuyers = rows.filter((r) => r.v.verdict !== "buy");
  const byCat = new Map<ObjectionCategory, typeof nonBuyers>();
  for (const r of nonBuyers) {
    const list = byCat.get(r.v.objectionCategory) ?? [];
    list.push(r);
    byCat.set(r.v.objectionCategory, list);
  }
  const objections: ObjectionGroup[] = [...byCat.entries()]
    .map(([category, list]) => ({
      category,
      count: list.length,
      pctOfNonBuyers: nonBuyers.length ? list.length / nonBuyers.length : 0,
      maybeCount: list.filter((r) => r.v.verdict === "maybe").length,
      // Put "maybe" people first: their feedback is the most actionable.
      examples: sortMaybeFirst(list).slice(0, 8).map((r) => r.v.objection),
      changeMind: sortMaybeFirst(list).slice(0, 8).map((r) => r.v.wouldChangeMind),
    }))
    .sort((a, b) => b.count - a.count);

  // ----- Quotes -----
  const allQuotes: QuoteItem[] = rows.map(({ v, p }) => ({
    personaId: p.id,
    verdict: v.verdict,
    quote: v.quote,
    label: [p.age, p.role ?? p.occupation, p.mindset].join(", "),
  }));

  return {
    total,
    buy,
    maybe: count("maybe"),
    no: count("no"),
    buyRate: total ? buy / total : 0,
    segments,
    funnel,
    objections,
    bestQuotes: pickBestQuotes(rows),
    allQuotes,
  };
}

function sortMaybeFirst<T extends { v: Verdict }>(list: T[]) {
  return [...list].sort((a, b) => Number(b.v.verdict === "maybe") - Number(a.v.verdict === "maybe"));
}

// "Best" = a balanced mix: some buyers, some maybes, mostly no's (like reality),
// spread across different objections, and quotes of a readable length.
function pickBestQuotes(rows: { v: Verdict; p: Persona }[]): QuoteItem[] {
  const goodLength = rows.filter((r) => r.v.quote.length >= 25 && r.v.quote.length <= 160);
  const pool = goodLength.length >= 10 ? goodLength : rows;
  const picked: typeof rows = [];
  const usedCats = new Set<string>();
  const want: [Verdict["verdict"], number][] = [["buy", 3], ["maybe", 3], ["no", 4]];

  for (const [verdict, n] of want) {
    const candidates = pool.filter((r) => r.v.verdict === verdict);
    // First pass: one per objection category; second pass: fill the rest.
    for (const pass of [0, 1]) {
      for (const r of candidates) {
        if (picked.filter((x) => x.v.verdict === verdict).length >= n) break;
        if (picked.includes(r)) continue;
        if (pass === 0 && usedCats.has(r.v.objectionCategory)) continue;
        picked.push(r);
        usedCats.add(r.v.objectionCategory);
      }
    }
  }
  // Top up to 10 if one verdict type was rare.
  for (const r of pool) {
    if (picked.length >= 10) break;
    if (!picked.includes(r)) picked.push(r);
  }
  return picked.map(({ v, p }) => ({
    personaId: p.id,
    verdict: v.verdict,
    quote: v.quote,
    label: [p.age, p.role ?? p.occupation, p.mindset].join(", "),
  }));
}
