// "Understand the site": ONE cheap Haiku call reads the crawled pages and
// returns two things:
//   1. a PRODUCT PROFILE — what it is, who it's for, prices, proof, friction
//   2. a suggested AUDIENCE, so the form arrives pre-filled
// The founder can correct both before running. Every persona reads the profile.
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, assertNotRefused, HAIKU, requireApiKey } from "./ai";
import { costOfCall } from "./cost";
import {
  COMPANY_SIZES,
  BUDGETS,
  GOALS,
  MINDSETS,
  TECH_LEVELS,
  type Audience,
  type CallCost,
  type Crawl,
  type CrawledPage,
  type ProductProfile,
} from "./types";

// The exact JSON shape we require back. The API is forced to follow it.
const UnderstandSchema = z.object({
  // --- product profile ---
  goal: z.enum(GOALS),
  whatItIs: z.string(),
  whoItsFor: z.string(),
  mainPromise: z.string(),
  prices: z.array(z.string()),
  proof: z.array(z.string()),
  friction: z.array(z.string()),
  tryTask: z.string(),
  // --- suggested audience ---
  mode: z.enum(["consumer", "business"]),
  ageMin: z.number(),
  ageMax: z.number(),
  ageSkew: z.enum(["even", "younger", "older"]),
  femalePct: z.number(),
  malePct: z.number(),
  nonbinaryPct: z.number(),
  countries: z.array(z.string()),
  urbanPct: z.number(),
  suburbanPct: z.number(),
  ruralPct: z.number(),
  occupations: z.array(z.string()),
  budgets: z.array(z.enum(BUDGETS)),
  mindsets: z.array(z.enum(MINDSETS)),
  techComfort: z.array(z.enum(TECH_LEVELS)),
  currentSolutions: z.array(z.string()),
  businessRoles: z.array(z.string()),
  decisionSelfPct: z.number(),
  companySizes: z.array(z.enum(COMPANY_SIZES)),
  industries: z.array(z.string()),
});

export async function understandSite(
  crawl: Crawl,
): Promise<{ profile: ProductProfile; audience: Audience; cost: CallCost }> {
  requireApiKey();
  const pageText = crawl.pages
    .map(
      (p) =>
        `--- ${p.step.toUpperCase()} PAGE (${p.url}) ---\n` +
        (p.note ? `(${p.note})\n` : "") +
        signalsToText(p.signals) +
        p.text.slice(0, 3000),
    )
    .join("\n\n");
  const missing = (["pricing", "signup"] as const).filter((s) => !crawl.pages.some((p) => p.step === s));

  const response = await anthropic.messages.parse({
    model: HAIKU,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(UnderstandSchema) },
    messages: [
      {
        role: "user",
        content:
          `Here is what a visitor sees on a product's website.\n\n${pageText}\n\n` +
          (missing.length ? `No ${missing.join(" or ")} page could be found.\n\n` : "") +
          `PART 1 — Product profile. Be factual; only use what's on the pages.\n` +
          `- goal: the main action the site wants a new visitor to take right now (its main button). ` +
          `Use "buy" only if visitors pay immediately; a free account is "sign up".\n` +
          `- whatItIs: one plain sentence, like you'd explain it to a friend.\n` +
          `- whoItsFor: one sentence.\n` +
          `- mainPromise: the main benefit the page claims.\n` +
          `- prices: every price or plan you can see (empty list if none shown).\n` +
          `- proof: testimonials, customer logos, user counts, ratings (empty list if none).\n` +
          `- friction: things that slow a visitor down or add doubt, e.g. "no price shown", "credit card required for trial", ` +
          `"waitlist only, can't try it yet", "7 form fields", "no reviews". Use the MEASURED facts.\n` +
          `- tryTask: one short, concrete first task a new user would try IN the product to see if it's good, ` +
          `e.g. "Find a birthday card template and open it" or "Describe a habit tracker app and see what it builds".\n\n` +
          `PART 2 — Most likely target customer. Fill in every field.\n` +
          `- mode: "business" if buyers purchase for a company/team (B2B), else "consumer".\n` +
          `- Percentages in each group should add up to about 100.\n` +
          `- budgets: how much they can comfortably spend (tight / okay / comfortable).\n` +
          `- Give 3-6 occupations and 2-4 current solutions (competitors or workarounds).\n` +
          `- For consumer products, leave the business fields as empty lists and decisionSelfPct 50.`,
      },
    ],
  });
  assertNotRefused(response.stop_reason, "understand site");

  const s = response.parsed_output;
  if (!s) throw new Error("The site summary came back in the wrong format.");

  const profile: ProductProfile = {
    goal: s.goal,
    whatItIs: s.whatItIs,
    whoItsFor: s.whoItsFor,
    mainPromise: s.mainPromise,
    prices: s.prices,
    proof: s.proof,
    friction: s.friction,
    tryTask: s.tryTask,
  };
  const audience: Audience = {
    mode: s.mode,
    ageMin: clamp(Math.round(s.ageMin), 13, 90),
    ageMax: clamp(Math.round(s.ageMax), 13, 90),
    ageSkew: s.ageSkew,
    genderSplit: { female: s.femalePct, male: s.malePct, nonbinary: s.nonbinaryPct },
    countries: s.countries,
    areaMix: { urban: s.urbanPct, suburban: s.suburbanPct, rural: s.ruralPct },
    occupations: s.occupations,
    budgets: s.budgets,
    mindsets: s.mindsets,
    techComfort: s.techComfort,
    currentSolutions: s.currentSolutions,
    business: {
      roles: s.businessRoles,
      decisionSelfPct: clamp(Math.round(s.decisionSelfPct), 0, 100),
      companySizes: s.companySizes,
      industries: s.industries,
    },
  };

  return { profile, audience, cost: costOfCall("understand site", response.model, response.usage) };
}

// Used when there's no API key: an empty profile the founder can fill in.
export const EMPTY_PROFILE: ProductProfile = {
  goal: "sign up",
  whatItIs: "",
  whoItsFor: "",
  mainPromise: "",
  prices: [],
  proof: [],
  friction: [],
  tryTask: "",
};

// Turns the profile into a few readable lines for the AI prompts.
export function profileToText(p: ProductProfile): string {
  const list = (items: string[]) => (items.length ? items.join("; ") : "none shown");
  return [
    `Goal (what counts as converting): ${p.goal}`,
    `What it is: ${p.whatItIs || "(not given)"}`,
    `Who it's for: ${p.whoItsFor || "(not given)"}`,
    `Main promise: ${p.mainPromise || "(not given)"}`,
    `Prices: ${list(p.prices)}`,
    `Proof: ${list(p.proof)}`,
    `Friction: ${list(p.friction)}`,
  ].join("\n");
}

// The facts measured in code, as one line of text.
export function signalsToText(s: CrawledPage["signals"]): string {
  const facts = [
    s.formFields ? `${s.formFields} form field${s.formFields === 1 ? "" : "s"} to fill in` : "",
    s.asksForCard ? "asks for a credit card" : "",
    s.socialLogin ? "offers 'continue with Google/Apple/etc.'" : "",
    s.pricesSeen.length ? `prices visible: ${s.pricesSeen.join(", ")}` : "",
    s.loginOnly ? "this is a LOG-IN page for existing users" : "",
  ].filter(Boolean);
  return facts.length ? `[MEASURED: ${facts.join("; ")}]\n` : "";
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
