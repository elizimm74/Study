// Cleans an audience that came from the browser (saved "customer minds").
// Never trust the browser: only known options, sane numbers, short text, short lists.
import { BUDGETS, COMPANY_SIZES, MINDSETS, TECH_LEVELS, type Audience } from "./types";

const num = (x: unknown, min: number, max: number, fallback: number) => {
  const n = Number(x);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};
const strs = (x: unknown, max = 12) =>
  (Array.isArray(x) ? x : []).slice(0, max).map((v) => (typeof v === "string" ? v.trim().slice(0, 60) : "")).filter(Boolean);
const pick = <T extends string>(x: unknown, options: readonly T[]) => (Array.isArray(x) ? x.filter((v): v is T => options.includes(v as T)) : []);

export function cleanAudience(x: unknown): Audience | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const a = x as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const ageMin = num(a.ageMin, 13, 90, 18);
  const ageMax = num(a.ageMax, 13, 90, 65);
  const g = a.genderSplit ?? {};
  const area = a.areaMix ?? {};
  const b = a.business ?? {};
  return {
    mode: a.mode === "business" ? "business" : "consumer",
    ageMin: Math.min(ageMin, ageMax),
    ageMax: Math.max(ageMin, ageMax),
    ageSkew: ["even", "younger", "older"].includes(a.ageSkew) ? a.ageSkew : "even",
    genderSplit: { female: num(g.female, 0, 100, 50), male: num(g.male, 0, 100, 48), nonbinary: num(g.nonbinary, 0, 100, 2) },
    countries: strs(a.countries, 8),
    areaMix: { urban: num(area.urban, 0, 100, 40), suburban: num(area.suburban, 0, 100, 45), rural: num(area.rural, 0, 100, 15) },
    occupations: strs(a.occupations),
    budgets: pick(a.budgets, BUDGETS),
    mindsets: pick(a.mindsets, MINDSETS),
    techComfort: pick(a.techComfort, TECH_LEVELS),
    currentSolutions: strs(a.currentSolutions),
    business: {
      roles: strs(b.roles),
      decisionSelfPct: num(b.decisionSelfPct, 0, 100, 50),
      companySizes: pick(b.companySizes, COMPANY_SIZES),
      industries: strs(b.industries),
    },
  };
}

// A saved mind needs at least one budget and one mindset, or the persona generator
// would fall back to defaults and the "mind" wouldn't mean what the person built.
export function mindProblem(a: Audience): string | null {
  if (!a.budgets.length) return "Pick at least one budget.";
  if (!a.mindsets.length) return "Pick at least one mindset.";
  if (!a.techComfort.length) return "Pick at least one tech comfort level.";
  return null;
}
