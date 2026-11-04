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

// How much they can comfortably spend right now. Simpler than salary
// brackets, and it fits students and people with irregular income too.
export const BUDGETS = ["tight", "okay", "comfortable"] as const;
export type Budget = (typeof BUDGETS)[number];

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
  budgets: Budget[];
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
  screenshotFiles: string[]; // e.g. ["hero-1.jpg", "hero-2.jpg"] (top of page first)
  mobileScreenshotFile?: string; // landing page as a phone shows it ("hero-m.jpg")
  note?: string; // e.g. "pricing is a section on the landing page"
  // Facts measured IN CODE (not guessed by AI), used for the product profile.
  signals: {
    formFields: number; // visible inputs the visitor would have to fill in
    asksForCard: boolean; // card number / CVC fields on the page
    socialLogin: boolean; // "Continue with Google / Apple / GitHub"
    pricesSeen: string[]; // things like "$12.99/month"
    loginOnly: boolean; // this is a LOG-IN page (for existing users), not a sign-up page
  };
};

export type Crawl = {
  id: string;
  url: string;
  createdAt: string;
  pages: CrawledPage[];
  costs: CallCost[]; // AI calls made while crawling (choosing what to click)
};

// What the product IS, written by Haiku after the crawl. The founder can
// edit it before a run, and every persona reads it.
export const GOALS = [
  "sign up",
  "start a free trial",
  "join the waitlist",
  "buy",
  "book a demo",
  "download the app",
] as const;
export type Goal = (typeof GOALS)[number];

export type ProductProfile = {
  goal: Goal; // what "converting" means for this site
  whatItIs: string;
  whoItsFor: string;
  mainPromise: string;
  prices: string[];
  proof: string[]; // testimonials, logos, numbers like "10,000 users"
  friction: string[]; // things that slow people down: "card required", "waitlist only"
  tryTask: string; // a first thing a new user would try, e.g. "Find a birthday card template"
};

// ---------- Milestone 3: trying the product ----------

// How the explorer is allowed in. It never sneaks past other sites' logins.
//  public:  only parts anyone can use without an account
//  account: the founder's own TEST account (never saved, never shown to the AI)
//  preview: a link where the founder turned the login off
export type ExploreAccess = "public" | "account" | "preview";

export type ExploreSettings = {
  enabled: boolean;
  task: string; // what the explorer should try to do
  access: ExploreAccess;
  startUrl: string; // where to begin (the site, the app, or the preview link)
  reputation: boolean; // also search the web for real reviews
};

// Kept only in memory for one run. NEVER saved to disk or sent to the AI.
export type Credentials = { email: string; password: string };

export type JourneyStep = {
  n: number;
  url: string;
  screenshot: string; // file name, e.g. "explore-03.jpg" (what the explorer saw)
  observation: string; // what a first-time user notices on this screen
  action: string; // what it did next, in plain words
  friction?: string; // anything confusing or slow on this screen
  model: string; // which AI decided this step (Haiku normally, Sonnet when stuck)
};

export type Journey = {
  task: string;
  access: ExploreAccess;
  status: "running" | "completed" | "stuck" | "blocked" | "out of steps" | "error";
  summary: string;
  frictionPoints: string[];
  steps: JourneyStep[];
  seconds: number;
};

export type Reputation = {
  found: boolean;
  summary: string;
  praise: string[];
  complaints: string[];
  sources: { title: string; url: string }[]; // read from the search results by code
};

// ---------- Personas and their verdicts ----------

export type Persona = {
  id: string; // "P001"
  age: number;
  gender: "female" | "male" | "nonbinary";
  country: string;
  area: "urban" | "suburban" | "rural";
  occupation: string;
  budget: Budget;
  mindset: Mindset;
  techComfort: TechComfort;
  currentSolution: string;
  // The simulated visit (see behavior.ts)
  device: "phone" | "laptop";
  arrivedFrom: string;
  patience: string;
  // Only filled in when audience.mode === "business"
  role?: string;
  canBuyAlone?: boolean;
  companySize?: CompanySize;
  industry?: string;
};

// "product" = trying the product itself (only when the explorer ran).
export const FUNNEL_STEPS = ["hero", "pricing", "product", "signup"] as const;
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
