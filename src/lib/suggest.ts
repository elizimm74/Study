// Auto-suggest: one cheap Haiku call reads the crawled page and guesses
// who the product is for, so the audience form arrives pre-filled.
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, assertNotRefused, HAIKU, requireApiKey } from "./ai";
import { costOfCall } from "./cost";
import {
  COMPANY_SIZES,
  INCOME_BRACKETS,
  MINDSETS,
  TECH_LEVELS,
  type Audience,
  type CallCost,
  type Crawl,
} from "./types";

// The exact JSON shape we require back. The API is forced to follow it.
const SuggestionSchema = z.object({
  summary: z.string(), // one sentence: what the product is
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
  incomes: z.array(z.enum(INCOME_BRACKETS)),
  mindsets: z.array(z.enum(MINDSETS)),
  techComfort: z.array(z.enum(TECH_LEVELS)),
  currentSolutions: z.array(z.string()),
  businessRoles: z.array(z.string()),
  decisionSelfPct: z.number(),
  companySizes: z.array(z.enum(COMPANY_SIZES)),
  industries: z.array(z.string()),
});

export async function suggestAudience(
  crawl: Crawl,
): Promise<{ audience: Audience; summary: string; cost: CallCost }> {
  requireApiKey();
  const pageText = crawl.pages
    .map((p) => `--- ${p.step.toUpperCase()} PAGE (${p.url}) ---\n${p.text.slice(0, 3000)}`)
    .join("\n\n");

  const response = await anthropic.messages.parse({
    model: HAIKU,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(SuggestionSchema) },
    messages: [
      {
        role: "user",
        content:
          `Here is the text of a product website.\n\n${pageText}\n\n` +
          `Who is the most likely target customer? Fill in every field.\n` +
          `- mode: "business" if buyers purchase for a company/team (B2B), else "consumer".\n` +
          `- Percentages in each group should add up to about 100.\n` +
          `- Give 3-6 occupations and 2-4 current solutions (competitors or workarounds).\n` +
          `- For consumer products, leave the business fields as empty lists and decisionSelfPct 50.`,
      },
    ],
  });
  assertNotRefused(response.stop_reason, "audience suggestion");

  const s = response.parsed_output;
  if (!s) throw new Error("Audience suggestion came back in the wrong format.");

  const audience: Audience = {
    mode: s.mode,
    ageMin: clamp(Math.round(s.ageMin), 13, 90),
    ageMax: clamp(Math.round(s.ageMax), 13, 90),
    ageSkew: s.ageSkew,
    genderSplit: { female: s.femalePct, male: s.malePct, nonbinary: s.nonbinaryPct },
    countries: s.countries,
    areaMix: { urban: s.urbanPct, suburban: s.suburbanPct, rural: s.ruralPct },
    occupations: s.occupations,
    incomes: s.incomes,
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

  return {
    audience,
    summary: s.summary,
    cost: costOfCall("audience suggestion", response.model, response.usage),
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
