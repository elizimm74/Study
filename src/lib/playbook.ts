// "What's working right now": a curated playbook for apps and websites.
//
// HONESTY RULES for this file:
//  - Every play says what kind of evidence is behind it:
//      "store policy"        = Apple / Google ask for it (we say "may be flagged", never "will be rejected")
//      "published research"  = a study or benchmark report, with the source named
//      "practitioner advice" = widely repeated, but we don't have a clean study to point at
//  - Numbers come ONLY from sources in docs/persona-research.md or src/lib/app/aggregate.ts.
//    Nothing here is live data. Live patterns (from Crawler tests) are shown separately and
//    stay hidden until there are enough tests (see crawler_trends() in migration 0006).
//  - Re-check the benchmarks every year (BENCHMARKS_REVIEWED).
import type { ObjectionCategory } from "./types";

export const BENCHMARKS_REVIEWED = "November 2026";

export type Evidence = "store policy" | "published research" | "practitioner advice";

export type Play = {
  id: string;
  area: "app" | "web";
  title: string;
  why: string; // one or two plain sentences
  how: string; // the concrete change
  evidence: Evidence;
  source?: { label: string; url?: string };
  fixes: ObjectionCategory[]; // which "why people said no" reasons this play helps
};

export const PLAYS: Play[] = [
  // ---------- apps: onboarding + paywall ----------
  {
    id: "app-price-after-trial",
    area: "app",
    title: "Say what it costs after the free trial",
    why: "Apple and Google both ask subscription apps to show clear terms before someone subscribes. A trial with the price hidden also reads like a trap.",
    how: "Put one line next to the button: \"3 days free, then $39.99/year. Cancel anytime in Settings.\"",
    evidence: "store policy",
    source: { label: "Apple App Store Review Guidelines 3.1.2; Google Play subscriptions policy" },
    fixes: ["price", "trust"],
  },
  {
    id: "app-rules",
    area: "app",
    title: "Pass the store-rule checks before you submit",
    why: "A paywall missing the billing period, Restore purchases, or Terms and Privacy links may be flagged in review, and a flag costs you days.",
    how: "Show price + how often it bills, a Restore purchases button, Terms and Privacy links, and a line that it renews automatically.",
    evidence: "store policy",
    source: { label: "Apple 3.1.1 and 3.1.2; Google Play subscriptions policy" },
    fixes: [],
  },
  {
    id: "app-value-first",
    area: "app",
    title: "Show the value before you ask for anything",
    why: "People can't judge why you need notifications or an account before they've seen the benefit, so those screens are where many quit.",
    how: "Move the notification pop-up and account creation to after the first win, and add \"Skip for now\".",
    evidence: "practitioner advice",
    fixes: ["signup friction", "trust"],
  },
  {
    id: "app-short-questions",
    area: "app",
    title: "Ask 1–3 questions, then show what they changed",
    why: "Questions feel worth answering only when your answer visibly changes what happens next. Long questionnaires before any value lose people.",
    how: "Keep the one question that personalizes the app, drop the rest, and show a result built from the answer.",
    evidence: "practitioner advice",
    fixes: ["too complex", "unclear value"],
  },
  {
    id: "app-easy-exit",
    area: "app",
    title: "Make the close button easy to find",
    why: "Hidden or delayed close buttons feel like a trap, and people who feel trapped delete the app instead of subscribing later.",
    how: "Use a clear X or \"Not now\" that's visible right away.",
    evidence: "practitioner advice",
    fixes: ["trust"],
  },
  {
    id: "app-one-plan",
    area: "app",
    title: "Highlight one plan, and show the saving",
    why: "Several equal options make people stall. One clearly recommended plan (often yearly) makes the choice easier.",
    how: "Pre-select one plan, mark it \"Best value\", and show the per-month price honestly.",
    evidence: "practitioner advice",
    fixes: ["price", "too complex"],
  },
  {
    id: "app-trial-reminder",
    area: "app",
    title: "Promise a reminder before the trial ends",
    why: "Fear of being charged by surprise is a common reason people skip free trials.",
    how: "Add \"We'll remind you 1 day before your trial ends\" near the button, and actually send it.",
    evidence: "practitioner advice",
    fixes: ["price", "trust"],
  },
  {
    id: "app-proof",
    area: "app",
    title: "Put real proof on the paywall",
    why: "Ratings and user counts right at the moment of paying reassure people. Skeptical people look for them first.",
    how: "Show your real rating or review count near the button. Never invent numbers.",
    evidence: "practitioner advice",
    fixes: ["trust"],
  },
  {
    id: "app-teens",
    area: "app",
    title: "If your users are teens, make paying easy for a parent",
    why: "Most teens don't have a card of their own and often pay with a parent's. A card-first trial is a dead end for many of them.",
    how: "Offer a free tier that works, and make Apple's \"Ask to Buy\" request clear instead of hiding the price.",
    evidence: "published research",
    source: { label: "Financial Basics Foundation survey, via The New Daily" },
    fixes: ["price", "not for me"],
  },

  // ---------- websites ----------
  {
    id: "web-ten-seconds",
    area: "web",
    title: "Say what it is in one line, on the first screen",
    why: "Most visitors decide within about 10 seconds whether to stay, and they skim instead of reading.",
    how: "Make the first headline plain: what it is, and who it's for. Put the main button right under it.",
    evidence: "published research",
    source: { label: "Nielsen Norman Group: How long do users stay on web pages?", url: "https://nngroup.com/articles/how-long-do-users-stay-on-web-pages/" },
    fixes: ["unclear value", "not for me"],
  },
  {
    id: "web-price-visible",
    area: "web",
    title: "Show the price (or a \"from\" price) on the page",
    why: "A hidden price makes people assume the worst, especially people on a tight budget.",
    how: "Add one line under the button, like \"Free for a week, then $6/month.\"",
    evidence: "practitioner advice",
    fixes: ["price"],
  },
  {
    id: "web-one-field",
    area: "web",
    title: "Cut signup to an email and \"Continue with Google\"",
    why: "Being forced to create an account is one of the top reasons people quit (about 18–19% of people who abandoned a checkout).",
    how: "Ask for an email only. Collect everything else after they've seen the product.",
    evidence: "published research",
    source: { label: "Baymard Institute (checkout research)", url: "https://baymard.com/blog/reduce-cart-abandonment" },
    fixes: ["signup friction"],
  },
  {
    id: "web-no-card-trial",
    area: "web",
    title: "Think twice before requiring a card to start a trial",
    why: "In one vendor data set, about 10% of visitors started a trial when no card was needed, versus about 2% when a card was required. Fewer people start, so decide what you want to measure.",
    how: "Test both. If you want more trials, let people start without a card and ask later.",
    evidence: "published research",
    source: { label: "Totango data, via Chargebee (vendor data)", url: "https://www.chargebee.com/blog/credit-card-trials-credit-card-trials-go/" },
    fixes: ["price", "trust", "signup friction"],
  },
  {
    id: "web-proof",
    area: "web",
    title: "Put real proof next to the main button",
    why: "Skeptical visitors look for reviews, logos and user numbers before they trust a new product.",
    how: "Add two or three real quotes or a real user count right under the headline. Never invent them.",
    evidence: "practitioner advice",
    fixes: ["trust"],
  },
  {
    id: "web-phone-first",
    area: "web",
    title: "If your buyers are young, design for the phone first",
    why: "Teens are on YouTube and TikTok daily, and about 87% of US teens own an iPhone. They'll meet your page on a small screen.",
    how: "Check your page on a phone: the headline, the button and the price should all be visible without scrolling.",
    evidence: "published research",
    source: { label: "Pew Research Center (2024–2025); Piper Sandler, Taking Stock With Teens (Fall 2025)" },
    fixes: ["not for me", "unclear value"],
  },
  {
    id: "web-switch-reason",
    area: "web",
    title: "Show what you do that their current tool can't",
    why: "People who already have a free app or a spreadsheet need one clear reason to switch.",
    how: "Name the workaround people use today, and show the one thing you do better.",
    evidence: "practitioner advice",
    fixes: ["happy with current solution", "missing feature"],
  },
];

// Published benchmarks (reviewed BENCHMARKS_REVIEWED). Shown as context, never as a promise.
export const BENCHMARKS = [
  {
    label: "Median landing page conversion",
    value: "~6.6%",
    note: "SaaS ~3.8%, ecommerce ~4.2%",
    source: "Unbounce Conversion Benchmark Report, Q4 2024 (41,000 pages)",
  },
  {
    label: "App: download to trial start (median)",
    value: "~6.2%",
    note: "Top 10% of apps: ~20.3%",
    source: "RevenueCat, State of Subscription Apps 2025",
  },
];

// What each person-type ("mind") cares about. Qualitative, drawn from the rules Crawler gives its customers.
export const MIND_TYPES: { name: string; wants: string; wins: string }[] = [
  { name: "Early adopter", wants: "Something new that works now.", wins: "A fast way to try it and a clear \"what's new\"." },
  { name: "Price-sensitive", wants: "To know the price before anything else.", wins: "A visible price that beats \"free\", and no surprises." },
  { name: "Skeptical", wants: "Proof, and an easy way out.", wins: "Real reviews, a clear cancel path, no pressure." },
  { name: "Busy", wants: "It to just work, fast.", wins: "A one-line promise and the fewest possible steps." },
  { name: "Impulse buyer", wants: "To act while they're interested.", wins: "A short path from \"wow\" to \"done\"; every extra step loses them." },
];

// Which plays to suggest for each reason people said no (used for "your next best moves").
export function playsFor(category: string, limit = 2): Play[] {
  return PLAYS.filter((p) => (p.fixes as string[]).includes(category)).slice(0, limit);
}
