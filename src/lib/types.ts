// Shared "shapes" of data used across the app.
// Think of these as the blueprint for every object we pass around.

// ---------- Audience (what the user picks in the form) ----------

export const MINDSETS = [
  "early adopter",
  "price-sensitive",
  "skeptical",
  "busy",
  "impulse buyer",
] as const;
export type Mindset = (typeof MINDSETS)[number];

export const TECH_LEVELS = ["low", "medium", "high"] as const;
export type TechComfort = (typeof TECH_LEVELS)[number];

export const INCOME_BRACKETS = [
  "under $25k",
  "$25k-50k",
  "$50k-100k",
  "$100k-200k",
  "$200k+",
] as const;
export type IncomeBracket = (typeof INCOME_BRACKETS)[number];

export const COMPANY_SIZES = [
  "just me",
  "2-10",
  "11-50",
  "51-200",
  "201-1000",
  "1000+",
] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

export type AgeSkew = "even" | "younger" | "older";

export type Audience = {
  // "business" turns on the B2B fields (role, who decides, company size, industry)
  mode: "consumer" | "business";
  ageMin: number;
  ageMax: number;
  ageSkew: AgeSkew;
  // Percentages; they don't have to add up to exactly 100, we normalize them.
  genderSplit: { female: number; male: number; nonbinary: number };
  countries: string[];
  areaMix: { urban: number; suburban: number; rural: number };
  occupations: string[];
  incomes: IncomeBracket[];
  mindsets: Mindset[];
  techComfort: TechComfort[];
  currentSolutions: string[]; // competitors or workarounds they use today
  business: {
    roles: string[];
    decisionSelfPct: number; // % who can buy without asking anyone
    companySizes: CompanySize[];
    industries: string[];
  };
};

// ---------- Crawl (what the invisible browser captured) ----------

export type CrawledPage = {
  step: "hero" | "pricing" | "signup";
  url: string;
  title: string;
  text: string; // visible text, trimmed
  screenshotFile: string | null; // file name inside the crawl folder
  note?: string; // e.g. "pricing is a section on the landing page"
};

export type Crawl = {
  id: string;
  url: string;
  createdAt: string;
  pages: CrawledPage[];
};

// ---------- Personas and their verdicts ----------

export type Persona = {
  id: string; // "P001"
  age: number;
  gender: "female" | "male" | "nonbinary";
  country: string;
  area: "urban" | "suburban" | "rural";
  occupation: string;
  income: IncomeBracket;
  mindset: Mindset;
  techComfort: TechComfort;
  currentSolution: string;
  // Only filled in when audience.mode === "business"
  role?: string;
  canBuyAlone?: boolean;
  companySize?: CompanySize;
  industry?: string;
};

export const FUNNEL_STEPS = ["hero", "pricing", "signup"] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const OBJECTION_CATEGORIES = [
  "price",
  "unclear value",
  "trust",
  "not for me",
  "missing feature",
  "too complex",
  "happy with current solution",
  "signup friction",
  "bad timing",
  "none",
] as const;
export type ObjectionCategory = (typeof OBJECTION_CATEGORIES)[number];

export type Verdict = {
  personaId: string;
  verdict: "buy" | "maybe" | "no";
  lostAt: FunnelStep | "none"; // "none" = made it all the way through
  objectionCategory: ObjectionCategory;
  objection: string;
  wouldChangeMind: string;
  quote: string;
};

// ---------- Cost tracking ----------

export type CallCost = {
  label: string; // e.g. "evaluate batch 2"
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  usd: number;
};
