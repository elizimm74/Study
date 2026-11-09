// Shapes for APP tests (onboarding + paywall screenshots).
// Website tests use ../types.ts; these sit alongside them.
import type { Audience, CallCost, ObjectionCategory, Persona, ProductProfile } from "../types";

// ---------- What the AI reads off each screen (the founder can correct it) ----------

export const SCREEN_TYPES = ["welcome", "value", "question", "permission", "signup", "paywall", "other"] as const;
export type ScreenType = (typeof SCREEN_TYPES)[number];

export type AppScreen = {
  file: string; // e.g. "3.jpg" (version B paywall screens are "b1.jpg", ...)
  type: ScreenType;
  title: string; // the main headline on the screen
  summary: string; // one sentence: what the screen says / asks
  asks: string[]; // what it asks for, e.g. "notifications", "email", "location", "payment"
  cta: string; // the main button text
  canSkip: boolean; // is there a visible "Skip" / "Not now" / close?
};

// ---------- The paywall, as facts (confirmed by the founder before the test) ----------

export const PERIODS = ["week", "month", "year", "lifetime", "other"] as const;
export type Period = (typeof PERIODS)[number];

export type PaywallPlan = {
  name: string; // "Annual"
  price: string; // exactly as shown, e.g. "$39.99"
  period: Period;
  trialDays: number; // 0 = no free trial
  highlighted: boolean; // the plan the screen pushes ("Best value", pre-selected)
};

export const CLOSE_BUTTON = ["visible", "small or faint", "appears after a delay", "none"] as const;
export type CloseButton = (typeof CLOSE_BUTTON)[number];

export type PaywallFacts = {
  plans: PaywallPlan[];
  closeButton: CloseButton;
  restorePurchases: boolean; // a "Restore purchases" button/link
  termsLink: boolean; // terms of use / EULA link
  privacyLink: boolean; // privacy policy link
  priceAfterTrialShown: boolean; // e.g. "3 days free, then $39.99/year"
  autoRenewExplained: boolean; // "renews automatically, cancel anytime"
  socialProof: string[]; // e.g. "4.8★ from 12k ratings", "Used by 1M people"
  headline: string;
  ctaText: string;
};

// ---------- What the analyze step saves (crawls.data for app tests) ----------

export type AppInput = { batch: string; screens: string[]; screensB: string[] };

export type AppAnalysis = {
  kind: "app";
  input: AppInput;
  filesPrefix: string; // "{userId}/uploads/{batch}"
  screens: AppScreen[]; // in the order the user sees them
  screensB: AppScreen[]; // Version B of the paywall (optional, for A/B)
  paywall: PaywallFacts | null; // read from the paywall screen(s) of version A
  paywallB: PaywallFacts | null;
  profile: ProductProfile;
  audience: Audience | null;
  suggestError?: string;
};

// ---------- Settings the founder picks for the test ----------

export const APP_SOURCES = ["App Store search", "TikTok / Instagram ad", "friend's link", "YouTube / creator", "Google Play search"] as const;
export type AppSource = (typeof APP_SOURCES)[number];

export type AppSettings = {
  screens: AppScreen[]; // confirmed by the founder
  screensB: AppScreen[];
  paywall: PaywallFacts | null; // confirmed
  paywallB: PaywallFacts | null;
  iphonePct: number; // the rest are on Android
  sources: AppSource[];
};

// ---------- One simulated customer's walk through the app ----------

export const PAYWALL_DECISIONS = ["start trial", "subscribe", "close", "never reached"] as const;
export type PaywallDecision = (typeof PAYWALL_DECISIONS)[number];

export type AppVerdict = {
  personaId: string;
  sample: number; // which of the 3 customer samples (0, 1, 2)
  stoppedAt: number; // the screen number (1-based) where they quit; 0 = went through the whole flow
  decision: PaywallDecision; // at the paywall (version A)
  decisionB: PaywallDecision | null; // the same person at version B (A/B tests only)
  objectionCategory: ObjectionCategory;
  objection: string;
  wouldChangeMind: string;
  quote: string;
};

export type AppPersona = Persona & { platform: "iPhone" | "Android"; source: AppSource; sample: number };

export type RuleCheck = {
  id: string;
  kind: "store rule" | "conversion";
  ok: boolean;
  title: string; // what we checked, in plain words
  detail: string; // why it matters / what to do
  basis: string; // where the rule comes from
};

export type { CallCost };
