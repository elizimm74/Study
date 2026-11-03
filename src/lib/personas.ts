// STEP 2 of the engine: build personas IN CODE (no AI, so it's free).
// Each persona gets every attribute drawn at random from the audience
// settings, so 100 personas come out varied instead of 100 copies.
import type { Audience, Persona } from "./types";

// A "seeded" random number generator: the same seed always produces the same
// personas. That makes runs repeatable, which matters for before/after tests.
function makeRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    // mulberry32 — a tiny, well-known algorithm. Returns a number in [0, 1).
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generatePersonas(audience: Audience, count: number, seed: number): Persona[] {
  const rand = makeRandom(seed);

  // Pick one item from a list, all equally likely.
  const pick = <T,>(list: readonly T[], fallback: T): T =>
    list.length ? list[Math.floor(rand() * list.length)] : fallback;

  // Pick a key using percentages, e.g. {urban: 40, suburban: 45, rural: 15}.
  const weighted = <K extends string>(weights: Record<K, number>): K => {
    const entries = Object.entries(weights) as [K, number][];
    const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
    let roll = rand() * (total || 1);
    for (const [key, w] of entries) {
      roll -= Math.max(0, w);
      if (roll < 0) return key;
    }
    return entries[0][0];
  };

  const age = () => {
    const min = Math.min(audience.ageMin, audience.ageMax);
    const max = Math.max(audience.ageMin, audience.ageMax);
    let r = rand();
    // Skew: squaring r pushes values toward 0 (younger); sqrt toward 1 (older).
    if (audience.ageSkew === "younger") r = r * r;
    if (audience.ageSkew === "older") r = Math.sqrt(r);
    return Math.round(min + r * (max - min));
  };

  const b = audience.business;
  const personas: Persona[] = [];
  for (let i = 0; i < count; i++) {
    const p: Persona = {
      id: `P${String(i + 1).padStart(3, "0")}`,
      age: age(),
      gender: weighted(audience.genderSplit),
      country: pick(audience.countries, "United States"),
      area: weighted(audience.areaMix),
      occupation: pick(audience.occupations, "office worker"),
      income: pick(audience.incomes, "$50k-100k"),
      mindset: pick(audience.mindsets, "skeptical"),
      techComfort: pick(audience.techComfort, "medium"),
      currentSolution: pick(audience.currentSolutions, "nothing"),
    };
    if (audience.mode === "business") {
      p.role = pick(b.roles, "manager");
      p.canBuyAlone = rand() * 100 < b.decisionSelfPct;
      p.companySize = pick(b.companySizes, "2-10");
      p.industry = pick(b.industries, "general");
    }
    personas.push(p);
  }
  return personas;
}

// One short line per persona — this is what the AI reads.
export function describePersona(p: Persona): string {
  const parts = [
    `${p.id}: ${p.age}yo ${p.gender}`,
    `${p.area} ${p.country}`,
    p.occupation,
    `income ${p.income}`,
    `${p.mindset}`,
    `tech comfort ${p.techComfort}`,
    `currently uses: ${p.currentSolution}`,
  ];
  if (p.role) {
    parts.push(
      `role ${p.role} at a ${p.companySize}-person ${p.industry} company`,
      p.canBuyAlone ? "can buy on their own" : "needs approval to buy",
    );
  }
  return parts.join(", ");
}
