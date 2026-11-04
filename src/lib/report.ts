// STEP 6 of the engine: the smarter model (Sonnet) writes the advice.
// It only receives the SUMMARY from aggregate.ts, never all raw verdicts.
//
// Flip counts are calculated in CODE, not guessed by the AI: each fix says
// which objection categories it solves, and we count the non-buyers who had
// those objections. "maybe" people are the most likely to actually flip.
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { anthropic, assertNotRefused, SONNET } from "./ai";
import { costOfCall } from "./cost";
import type { Stats } from "./aggregate";
import { profileToText } from "./suggest";
import {
  FUNNEL_STEPS,
  OBJECTION_CATEGORIES,
  type CallCost,
  type Crawl,
  type Journey,
  type ProductProfile,
  type Reputation,
} from "./types";

const AdviceSchema = z.object({
  summary: z.string(),
  fixes: z.array(
    z.object({
      title: z.string(),
      problem: z.string(),
      change: z.string(), // the concrete edit to make
      step: z.enum(FUNNEL_STEPS),
      addresses: z.array(z.enum(OBJECTION_CATEGORIES)),
    }),
  ),
  headlineOptions: z.array(z.string()),
  subheadline: z.string(),
  pricingCopy: z.string(),
});

export type Fix = z.infer<typeof AdviceSchema>["fixes"][number] & {
  couldFlip: number; // non-buyers with an objection this fix addresses
  likelyFlip: number; // ...of whom said "maybe"
};

export type Advice = Omit<z.infer<typeof AdviceSchema>, "fixes"> & { fixes: Fix[] };

export async function writeAdvice(
  crawl: Crawl,
  profile: ProductProfile,
  stats: Stats,
  journey?: Journey,
  reputation?: Reputation,
): Promise<{ advice: Advice; cost: CallCost }> {
  // Short versions only: Sonnet never gets the raw data.
  const tried = journey?.steps.length
    ? `PRODUCT TEST (a tester tried "${journey.task}"): ${journey.status} in ${journey.steps.length} steps. ` +
      `${journey.summary} Friction: ${journey.frictionPoints.join("; ") || "none noted"}\n\n`
    : "";
  const reviews = reputation?.found
    ? `REAL REVIEWS: ${reputation.summary} Praise: ${reputation.praise.join("; ")}. Complaints: ${reputation.complaints.join("; ")}.\n\n`
    : "";
  const page = (step: string, max: number) =>
    crawl.pages.find((p) => p.step === step)?.text.slice(0, max) ?? "(not found)";

  // A compact summary — a few thousand tokens no matter how many personas ran.
  const summary = {
    personas: stats.total,
    buy: stats.buy,
    maybe: stats.maybe,
    no: stats.no,
    funnel: stats.funnel,
    objections: stats.objections.map((o) => ({
      category: o.category,
      count: o.count,
      maybe: o.maybeCount,
      examples: o.examples.slice(0, 5),
      wouldChangeMind: o.changeMind.slice(0, 5),
    })),
    weakestSegments: Object.entries(stats.segments).flatMap(([name, rows]) =>
      rows
        .filter((r) => r.n >= 5)
        .sort((a, b) => a.buyRate - b.buyRate)
        .slice(0, 2)
        .map((r) => `${name}=${r.value}: ${Math.round(r.buyRate * 100)}% buy (n=${r.n})`),
    ),
  };

  const response = await anthropic.beta.messages.parse({
    model: SONNET,
    max_tokens: 8000,
    // If Sonnet declines, the API retries on a suitable fallback model for us.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(AdviceSchema) },
    messages: [
      {
        role: "user",
        content:
          `You are a sharp conversion-rate expert advising a small founder.\n` +
          `Simulated customers reviewed their site. Here is the site and the aggregated results.\n\n` +
          `PRODUCT PROFILE:\n${profileToText(profile)}\n\n` +
          tried +
          reviews +
          `LANDING PAGE:\n${page("hero", 2500)}\n\nPRICING:\n${page("pricing", 1500)}\n\n` +
          `RESULTS (JSON):\n${JSON.stringify(summary, null, 1)}\n\n` +
          `Write:\n` +
          `- summary: 2 sentences on the biggest problem.\n` +
          `- fixes: 4-6 specific, concrete changes, most impactful first. For each, list which objection categories it addresses (only categories present in the results) and the funnel step it fixes.\n` +
          `- headlineOptions: 3 rewritten hero headlines that answer the top objections.\n` +
          `- subheadline: one rewritten subheadline.\n` +
          `- pricingCopy: a rewritten pricing section blurb (2-4 sentences).\n` +
          `Write in plain language. Be specific to THIS product, not generic advice.`,
      },
    ],
  });
  assertNotRefused(response.stop_reason, "report");
  const raw = response.parsed_output;
  if (!raw) throw new Error("The report came back in the wrong format.");

  // Calculate flip counts in code from the real objection counts.
  const fixes: Fix[] = raw.fixes
    .map((f) => {
      const groups = stats.objections.filter((o) => f.addresses.includes(o.category));
      return {
        ...f,
        couldFlip: groups.reduce((s, o) => s + o.count, 0),
        likelyFlip: groups.reduce((s, o) => s + o.maybeCount, 0),
      };
    })
    .sort((a, b) => b.likelyFlip - a.likelyFlip || b.couldFlip - a.couldFlip);

  return {
    advice: { ...raw, fixes },
    cost: costOfCall("report", response.model, response.usage),
  };
}
