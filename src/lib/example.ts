// The EXAMPLE reports on /example. Everything here is MADE UP (a pretend meal-
// planning site and a pretend habit app), and the page says so. But the numbers
// aren't typed in: we invent customers and answers, then run the REAL counting
// code (aggregate.ts / app/aggregate.ts) on them, so the example always looks
// exactly like a real report.
import { generatePersonas, makeRandom } from "./personas";
import { aggregate } from "./aggregate";
import type { Run } from "./pipeline";
import type { Audience, ObjectionCategory, ProductProfile, Verdict } from "./types";
import { PRESETS } from "./presets";
import { generateAppPersonas, SAMPLES } from "./app/personas";
import { aggregateApp } from "./app/aggregate";
import { checkPaywall } from "./app/checks";
import type { AppRun } from "./app/pipeline";
import type { AppScreen, AppSettings, AppVerdict, PaywallFacts } from "./app/types";

// ---------- website example: "MealMate" ----------

const QUOTES: Record<string, string[]> = {
  price: ["I can't tell what this costs, so I'm out.", "Why is the price hidden until signup? Feels sketchy.", "Too expensive for something I haven't tried."],
  "unclear value": ["I still don't get what it actually does.", "Cool headline, but what do I get?", "Is this a recipe app or a grocery thing?"],
  trust: ["No reviews anywhere. Who else uses this?", "I'd want to see real people say it works first.", "Not putting my email into something I've never heard of."],
  "signup friction": ["Six fields just to look around? Nope.", "Make me sign up before I see anything? Bye.", "Why do you need my phone number?"],
  "happy with current solution": ["I already use a notes app for this.", "My free app does enough.", "Not switching for a small upgrade."],
  "not for me": ["This is for people with way more free time.", "I don't cook, so no.", "Feels built for somebody older."],
};
const YES_QUOTES = ["Honestly this would save me a ton of time, I'm in.", "Free trial, no card? Sure, why not.", "Okay the weekly plan thing is actually useful."];

function pick<T>(rand: () => number, xs: readonly T[]): T {
  return xs[Math.floor(rand() * xs.length)];
}

export function exampleWebsiteRun(): Run & { filesPrefix: string } {
  const audience: Audience = PRESETS["Busy moms"];
  const personas = generatePersonas(audience, 100, 20260);
  const rand = makeRandom(7);
  const verdicts: Verdict[] = personas.map((p) => {
    // A pretend "who would buy" rule: patient, tech-comfortable, not-tight-budget people convert more.
    const score =
      (p.budget === "comfortable" ? 0.18 : p.budget === "okay" ? 0.08 : -0.06) +
      (p.techComfort === "high" ? 0.1 : p.techComfort === "low" ? -0.08 : 0) +
      (p.patience === "a few minutes" ? 0.1 : p.patience === "about 10 seconds" ? -0.1 : 0) +
      (p.mindset === "skeptical" ? -0.1 : p.mindset === "impulse buyer" ? 0.12 : 0);
    const r = rand();
    const verdict = r < 0.2 + score ? "buy" : r < 0.46 + score ? "maybe" : "no";
    if (verdict === "buy") {
      return { personaId: p.id, verdict, lostAt: "none", objectionCategory: "none", objection: "Small worry: what happens after the free week?", wouldChangeMind: "Show the price after the trial up front.", quote: pick(rand, YES_QUOTES) };
    }
    const cat: ObjectionCategory = (p.budget === "tight" ? pick(rand, ["price", "price", "unclear value"] as const) : p.mindset === "skeptical" ? pick(rand, ["trust", "trust", "signup friction"] as const) : pick(rand, ["price", "unclear value", "signup friction", "trust", "happy with current solution", "not for me"] as const)) as ObjectionCategory;
    const lostAt = cat === "price" ? "pricing" : cat === "signup friction" ? "signup" : cat === "unclear value" || cat === "not for me" ? "hero" : pick(rand, ["hero", "pricing", "signup"] as const);
    const change: Record<string, string> = {
      price: "Put the price on the homepage.",
      "unclear value": "Say what it does in the first line.",
      trust: "Show reviews and real user counts.",
      "signup friction": "Ask for just an email.",
      "happy with current solution": "Show what it does that my notes app can't.",
      "not for me": "Show someone like me using it.",
    };
    return { personaId: p.id, verdict, lostAt, objectionCategory: cat, objection: QUOTES[cat][0], wouldChangeMind: change[cat], quote: pick(rand, QUOTES[cat]) };
  });

  const stats = aggregate(audience, personas, verdicts);
  const profile: ProductProfile = {
    goal: "sign up",
    whatItIs: "MealMate plans a week of dinners and a grocery list for busy parents.",
    whoItsFor: "Busy parents who want less dinner stress.",
    mainPromise: "A week of dinners planned in 60 seconds.",
    prices: [],
    proof: [],
    friction: ["price hidden until signup", "no reviews", "6 signup fields"],
    tryTask: "",
  };
  const claimed = new Set<string>();
  const fix = (title: string, problem: string, change: string, step: "hero" | "pricing" | "signup", addresses: ObjectionCategory[]) => {
    const groups = stats.objections.filter((o) => addresses.includes(o.category) && !claimed.has(o.category));
    groups.forEach((g) => claimed.add(g.category));
    return { title, problem, change, step, addresses, couldFlip: groups.reduce((s, g) => s + g.count, 0), likelyFlip: groups.reduce((s, g) => s + g.maybeCount, 0) };
  };
  const fixes = [
    fix("Show the price on the homepage", "People can't see what it costs, so they assume the worst.", "Add a one-line price under the hero button: \"Free for a week, then $6/month.\"", "hero", ["price"]),
    fix("Ask for an email only", "Six fields before seeing anything loses people at the last step.", "Cut signup to email. Ask the rest after they've seen their first plan.", "signup", ["signup friction"]),
    fix("Add proof next to the button", "No reviews or user counts, so skeptics bounce.", "Add three real parent quotes and a user count under the headline.", "hero", ["trust"]),
    fix("Say what it does in one line", "The headline is clever but vague.", "Rewrite the first line: \"Dinner planned for your whole week, with the grocery list.\"", "hero", ["unclear value", "not for me"]),
  ].sort((a, b) => b.likelyFlip - a.likelyFlip || b.couldFlip - a.couldFlip);

  return {
    id: "example",
    crawlId: "example",
    url: "https://mealmate.app",
    createdAt: new Date().toISOString(),
    profile,
    audience,
    seed: 20260,
    status: "done",
    stage: "Done",
    progress: { done: 100, total: 100 },
    personas,
    verdicts,
    stats,
    advice: {
      summary: "Most people leave because they can't see the price or any proof. Show both above the fold and cut signup to an email.",
      fixes,
      headlineOptions: ["Dinner planned for your whole week", "A week of dinners in 60 seconds", "Stop asking \"what's for dinner?\""],
      subheadline: "MealMate plans your meals and your grocery list. Free for a week.",
      pricingCopy: "Free for 7 days, then $6/month. Cancel anytime in two taps.",
    },
    costs: [],
    totalCostUsd: 0.031,
    filesPrefix: "example",
  };
}

// ---------- app example: "Streaky" habit app ----------

export function exampleAppRun(): AppRun {
  const mk = (type: AppScreen["type"], title: string, summary: string, extra: Partial<AppScreen> = {}): AppScreen => ({
    file: `${type}.jpg`, type, title, summary, asks: [], cta: "Continue", canSkip: false, ...extra,
  });
  const screens: AppScreen[] = [
    mk("welcome", "Build habits that stick", "Intro with the app's promise."),
    mk("value", "Streaks keep you going", "Explains streaks and reminders."),
    mk("question", "What do you want to work on?", "Pick goals.", { asks: ["goals"] }),
    mk("question", "How old are you?", "Asks age.", { asks: ["age"] }),
    mk("permission", "Turn on notifications?", "Asks for notification permission.", { asks: ["notifications"] }),
    mk("signup", "Create your account", "Email or Apple sign-in.", { asks: ["email"] }),
    mk("paywall", "Unlock Streaky Pro", "Shows plans and a free trial.", { cta: "Start free trial" }),
  ];
  const paywall: PaywallFacts = {
    plans: [
      { name: "Yearly", price: "$39.99", period: "year", trialDays: 7, highlighted: true },
      { name: "Weekly", price: "$4.99", period: "week", trialDays: 0, highlighted: false },
    ],
    closeButton: "small or faint",
    restorePurchases: false,
    termsLink: true,
    privacyLink: true,
    priceAfterTrialShown: false,
    autoRenewExplained: false,
    socialProof: [],
    headline: "Unlock Streaky Pro",
    ctaText: "Start free trial",
  };
  const settings: AppSettings = { screens, screensB: [], paywall, paywallB: null, iphonePct: 70, sources: ["TikTok / Instagram ad", "App Store search"] };
  const audience: Audience = PRESETS["Gen Z students"];
  const personas = generateAppPersonas(audience, settings, 100, 4242);
  const rand = makeRandom(99);
  const verdicts: AppVerdict[] = personas.map((p) => {
    const patient = p.patience.startsWith("high") ? 0.1 : p.patience.startsWith("low") ? -0.12 : 0;
    const r = rand();
    // where they quit: mostly the age question, notifications, sign-up wall, then the paywall
    let stoppedAt = 0;
    const gates: [number, number][] = [[1, 0.04], [2, 0.05], [3, 0.07], [4, 0.1 - patient / 2], [5, 0.12 - patient / 2], [6, 0.18 - patient / 2]];
    let acc = 0;
    for (const [screen, share] of gates) {
      acc += Math.max(0.01, share);
      if (r < acc) { stoppedAt = screen; break; }
    }
    const base: AppVerdict = { personaId: p.id, sample: p.sample, stoppedAt, decision: "never reached", decisionB: null, objectionCategory: "signup friction", objection: "Too many questions before I saw the app.", wouldChangeMind: "Let me try it before signing up.", quote: "Why does it need my age? I just want to try it." };
    if (stoppedAt) {
      const early: Record<number, [ObjectionCategory, string, string]> = {
        1: ["unclear value", "Another habit app? What's different?", "Show what makes it different."],
        2: ["unclear value", "Streaks are nothing new.", "Show a real example."],
        3: ["too complex", "Too many choices already.", "Ask fewer questions."],
        4: ["trust", "Why do you need my age?", "Explain why you ask."],
        5: ["trust", "I'm not giving notifications before I try it.", "Ask later, after I've used it."],
        6: ["signup friction", "I don't want an account yet.", "Let me try it first."],
      };
      const [cat, objection, change] = early[stoppedAt];
      return { ...base, objectionCategory: cat, objection, wouldChangeMind: change, quote: objection };
    }
    const buy = 0.1 + patient + (p.budget === "comfortable" ? 0.08 : p.budget === "tight" ? -0.06 : 0) + (p.source === "friend's link" ? 0.06 : 0);
    const r2 = rand();
    if (r2 < buy * 0.75) return { ...base, decision: "start trial", objectionCategory: "none", objection: "Will it charge me if I forget?", wouldChangeMind: "A reminder before the trial ends.", quote: "Free trial, why not. I'll cancel if it's meh." };
    if (r2 < buy * 0.85) return { ...base, decision: "subscribe", objectionCategory: "none", objection: "Weekly price adds up.", wouldChangeMind: "Show the monthly amount.", quote: "Okay, it's cheap enough." };
    return { ...base, decision: "close", objectionCategory: "price", objection: "I can't tell what happens after the trial.", wouldChangeMind: "State the price after the trial.", quote: "$39.99 a year for a habit app? I'll pass." };
  });

  const stats = aggregateApp(screens, personas, verdicts, SAMPLES);
  const checks = checkPaywall(paywall);
  const claimed = new Set<string>();
  const fix = (title: string, problem: string, change: string, screen: number, addresses: ObjectionCategory[]) => {
    const groups = stats.objections.filter((o) => addresses.includes(o.category) && !claimed.has(o.category));
    groups.forEach((g) => claimed.add(g.category));
    return { title, problem, change, screen, addresses, couldWin: groups.reduce((s, g) => s + g.count, 0), atPaywall: groups.reduce((s, g) => s + g.atPaywall, 0) };
  };
  const fixes = [
    fix("State the price after the trial", "People see a big yearly price with no explanation of the trial.", "Under the button: \"7 days free, then $39.99/year. Cancel anytime in Settings.\"", 7, ["price"]),
    fix("Ask for permissions later", "The notification pop-up comes before people see any value.", "Move the notification ask to after the first streak is created.", 5, ["trust"]),
    fix("Let people try before signing up", "The account wall comes before the app.", "Add \"Skip for now\" and ask for an account after the first habit.", 6, ["signup friction"]),
    fix("Cut the questions", "Two questions in a row before any benefit.", "Keep the goals question, drop the age question.", 4, ["too complex", "unclear value"]),
  ].sort((a, b) => b.atPaywall - a.atPaywall || b.couldWin - a.couldWin);

  return {
    kind: "app",
    id: "example",
    crawlId: "example",
    url: "app://example",
    createdAt: new Date().toISOString(),
    profile: { goal: "start a free trial", whatItIs: "Streaky helps students build daily habits with streaks.", whoItsFor: "Students.", mainPromise: "Build habits that stick.", prices: ["Yearly: $39.99", "Weekly: $4.99"], proof: [], friction: ["account wall before the app", "no price after trial"], tryTask: "" },
    audience,
    settings,
    screensPrefix: "example",
    seed: 4242,
    status: "done",
    stage: "Done",
    progress: { done: 300, total: 300 },
    checks,
    checksB: null,
    personas,
    verdicts,
    stats,
    advice: {
      summary: "Most people quit before the paywall. Move permissions and the account wall later, and state the price after the trial.",
      fixes,
      paywallHeadlines: ["Unlock your streaks", "Keep every streak alive", "Go Pro, never lose a streak"],
      ctaOptions: ["Try 7 days free", "Start my free week", "Keep my streaks"],
      trialLine: "7 days free, then $39.99/year. Renews automatically. Cancel anytime in Settings.",
      onboardingTip: "Show the first streak before asking for notifications or an account.",
    },
    costs: [],
    totalCostUsd: 0.12,
  };
}
