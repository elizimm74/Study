// STEP 3 + 4 of the engine: personas "review" the site, ~25 per AI call.
//
// Cost tricks used here:
//  - Haiku (cheapest model) at low effort.
//  - The page text + screenshots are identical for every batch, so we mark
//    them for PROMPT CACHING. After the first batch they cost ~10% as much.
//  - We run batch 1 alone (to fill the cache), then the rest in parallel.
import fs from "fs/promises";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, assertNotRefused, HAIKU } from "./ai";
import { costOfCall } from "./cost";
import { describePersona } from "./personas";
import { screenshotPath } from "./storage";
import { profileToText, signalsToText } from "./suggest";
import {
  OBJECTION_CATEGORIES,
  type CallCost,
  type Crawl,
  type Persona,
  type ProductProfile,
  type Verdict,
} from "./types";

const BATCH_SIZE = 25;
const PARALLEL = 4; // how many AI calls at the same time

const BatchSchema = z.object({
  results: z.array(
    z.object({
      persona_id: z.string(),
      verdict: z.enum(["buy", "maybe", "no"]),
      lost_at: z.enum(["hero", "pricing", "signup", "none"]),
      objection_category: z.enum(OBJECTION_CATEGORIES),
      objection: z.string(),
      would_change_mind: z.string(),
      quote: z.string(),
    }),
  ),
});

// The instructions that make personas behave like real, skeptical visitors.
const SYSTEM_PROMPT = `You simulate real people visiting a product's website for the first time.
You will see the site (screenshots + text of the landing page, pricing and signup pages, in that order) and a list of personas. For EACH persona, stay fully in character and decide honestly whether they would buy.

Be realistic, not polite:
- Most real visitors do NOT buy. A typical landing page converts only a few percent of visitors. "maybe" means genuinely interested but unconvinced; "buy" means they would pay or sign up today.
- Judge only what is actually on the page. Vague claims, missing prices, no social proof, or a confusing signup are real reasons to leave.
- Use the persona's details: budget and mindset drive price sensitivity (a tight budget means every subscription hurts); tech comfort drives how hard setup feels; what they use now sets the bar to switch; business personas who need approval are slower to say yes.
- If the product is irrelevant to the persona, they leave at the hero with objection category "not for me".

For each persona return:
- verdict: buy / maybe / no
- lost_at: the funnel step where they gave up or got stuck (hero, pricing, signup). Use "none" ONLY for "buy".
- objection_category: the single best match; use "none" ONLY for "buy".
- objection: their main objection in one sentence (for buyers: their small remaining doubt).
- would_change_mind: the one specific change to the site that would win them (or keep them).
- quote: one short, natural sentence in their own voice, as if overheard. No marketing speak.
Return one result per persona, using their exact persona_id.`;

type Progress = (done: number, total: number) => void;

export async function evaluatePersonas(
  crawl: Crawl,
  profile: ProductProfile,
  personas: Persona[],
  onProgress: Progress,
): Promise<{ verdicts: Verdict[]; costs: CallCost[] }> {
  const siteContent = await buildSiteContent(crawl, profile);
  const batches: Persona[][] = [];
  for (let i = 0; i < personas.length; i += BATCH_SIZE) {
    batches.push(personas.slice(i, i + BATCH_SIZE));
  }

  const verdicts: Verdict[] = [];
  const costs: CallCost[] = [];
  let done = 0;

  const runBatch = async (batch: Persona[], index: number) => {
    const result = await evaluateBatch(siteContent, batch, `evaluate batch ${index + 1}`);
    verdicts.push(...result.verdicts);
    costs.push(...result.costs);
    done += batch.length;
    onProgress(done, personas.length);
  };

  // Batch 1 alone so the cache is warm, then the rest PARALLEL at a time.
  if (batches.length) await runBatch(batches[0], 0);
  for (let i = 1; i < batches.length; i += PARALLEL) {
    await Promise.all(batches.slice(i, i + PARALLEL).map((b, j) => runBatch(b, i + j)));
  }

  return { verdicts, costs };
}

// Screenshots + page text, built once and reused (and cached) for every batch.
async function buildSiteContent(
  crawl: Crawl,
  profile: ProductProfile,
): Promise<Anthropic.ContentBlockParam[]> {
  const blocks: Anthropic.ContentBlockParam[] = [];
  for (const page of crawl.pages) {
    for (const [i, file] of page.screenshotFiles.entries()) {
      try {
        const data = await fs.readFile(screenshotPath(crawl.id, file));
        blocks.push(
          { type: "text", text: `Screenshot of the ${page.step} page${i > 0 ? " (scrolled down)" : ""}:` },
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: data.toString("base64") },
          },
        );
      } catch {
        // Missing screenshot is fine; the text below still describes the page.
      }
    }
  }
  const stepsFound = crawl.pages.map((p) => p.step);
  const missing = (["pricing", "signup"] as const).filter((s) => !stepsFound.includes(s));
  const text =
    `=== PRODUCT PROFILE (checked by the founder) ===\n${profileToText(profile)}\n\n` +
    crawl.pages
      .map(
        (p) =>
          `=== ${p.step.toUpperCase()} PAGE: ${p.url} ===\n` +
          (p.note ? `(${p.note})\n` : "") +
          signalsToText(p.signals) +
          p.text,
      )
      .join("\n\n") +
    (missing.length
      ? `\n\nNOTE: No ${missing.join(" or ")} page could be found from the landing page. A visitor looking for it would not find it.`
      : "");

  // cache_control marks the end of the part that's the same for every batch.
  blocks.push({ type: "text", text, cache_control: { type: "ephemeral" } });
  return blocks;
}

async function evaluateBatch(
  siteContent: Anthropic.ContentBlockParam[],
  batch: Persona[],
  label: string,
): Promise<{ verdicts: Verdict[]; costs: CallCost[] }> {
  const costs: CallCost[] = [];
  const byId = new Map(batch.map((p) => [p.id, p]));
  const found = new Map<string, Verdict>();

  // Up to 2 tries. The second try only asks about personas still missing.
  for (let attempt = 1; attempt <= 2 && found.size < batch.length; attempt++) {
    const todo = batch.filter((p) => !found.has(p.id));
    try {
      const response = await anthropic.messages.parse({
        model: HAIKU,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        output_config: { effort: "low", format: zodOutputFormat(BatchSchema) },
        messages: [
          {
            role: "user",
            content: [
              ...siteContent,
              {
                type: "text",
                text: `Personas (${todo.length}):\n` + todo.map(describePersona).join("\n"),
              },
            ],
          },
        ],
      });
      costs.push(costOfCall(attempt === 1 ? label : `${label} retry`, response.model, response.usage));
      assertNotRefused(response.stop_reason, label);

      for (const r of response.parsed_output?.results ?? []) {
        if (!byId.has(r.persona_id) || found.has(r.persona_id)) continue;
        found.set(r.persona_id, normalize(r));
      }
    } catch (err) {
      console.error(`[${label}] attempt ${attempt} failed:`, (err as Error).message);
      if (attempt === 2) throw err;
    }
  }

  if (found.size < batch.length) {
    console.warn(`[${label}] ${batch.length - found.size} personas had no answer; skipped.`);
  }
  return { verdicts: [...found.values()], costs };
}

// Fix small contradictions so the math later is clean.
function normalize(r: z.infer<typeof BatchSchema>["results"][number]): Verdict {
  const isBuy = r.verdict === "buy";
  return {
    personaId: r.persona_id,
    verdict: r.verdict,
    // A non-buyer must have stopped somewhere; default to the last step.
    lostAt: isBuy ? "none" : r.lost_at === "none" ? "signup" : r.lost_at,
    objectionCategory: isBuy ? "none" : r.objection_category === "none" ? "unclear value" : r.objection_category,
    objection: r.objection,
    wouldChangeMind: r.would_change_mind,
    quote: r.quote,
  };
}
