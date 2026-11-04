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
import { rulesFor } from "./behavior";
import {
  OBJECTION_CATEGORIES,
  type CallCost,
  type Crawl,
  type Journey,
  type Persona,
  type ProductProfile,
  type Reputation,
  type Verdict,
} from "./types";

// Optional extras from Milestone 3.
export type Extras = { runId: string; journey?: Journey; reputation?: Reputation };
const MAX_JOURNEY_SHOTS = 6; // a few key moments, to keep cost down

const BATCH_SIZE = 25;
const PARALLEL = 4; // how many AI calls at the same time

const BatchSchema = z.object({
  results: z.array(
    z.object({
      persona_id: z.string(),
      verdict: z.enum(["buy", "maybe", "no"]),
      lost_at: z.enum(["hero", "pricing", "product", "signup", "none"]),
      objection_category: z.enum(OBJECTION_CATEGORIES),
      objection: z.string(),
      would_change_mind: z.string(),
      quote: z.string(),
    }),
  ),
});

// The instructions that make personas behave like real, skeptical visitors.
// This part is the same for every batch, so it gets cached (cheaper).
const SYSTEM_PROMPT = `You simulate real people visiting a product's website for the first time.
You will see the site (screenshots + text of the landing page, pricing and signup pages, in that order), a product profile, and a list of personas. For EACH persona, stay fully in character and decide honestly what they would do.

What you are deciding:
- The product profile says the site's GOAL (for example "sign up", "join the waitlist", "buy"). verdict "buy" means the persona would complete THAT goal today. "maybe" means genuinely interested but unconvinced. "no" means they leave.
- The signup / log-in page is the moment of decision. Real visitors can NOT see inside a product before signing up, so never mark someone down just because they couldn't see the app itself. Decide from what they saw so far, and judge the signup step only on how easy and trustworthy it looks (number of fields, card required, "continue with Google", log-in vs create-account confusion).

Be realistic, not polite:
- Most real visitors do not convert. Judge only what is actually on the pages. Vague claims, missing prices, no proof, or a confusing signup are real reasons to leave.
- Each persona has a simulated VISIT: their device (phone users see the phone screenshot of the landing page), where they came from (someone sent by a friend arrives warmer than someone clicking an ad), and their patience. A persona with ~10 seconds of patience only takes in the first screen and leaves at the hero unless it hooks them right away.
- Use the persona's details: budget and mindset drive price sensitivity; tech comfort drives how hard setup feels; what they use now sets the bar to switch; business personas who need approval are slower to say yes.
- If the product is irrelevant to the persona, they leave at the hero with objection category "not for me".
- Each batch also includes RESEARCH NOTES about how people like these personas really behave. Follow them.
- Sometimes an EXPLORER JOURNEY is included: a tester actually used the product (screenshots of key moments + a step log). Treat it as what this persona would experience if they tried the product: did it deliver the promise quickly? Was it confusing? Impatient or low-tech personas suffer most from friction there. Use lost_at "product" when trying the product is what lost them. Without a journey, never use "product".
- Sometimes REAL REVIEWS from the web are included. Personas who would look up reviews (skeptical people, teens checking comments) are influenced by them.

For each persona return:
- verdict: buy / maybe / no
- lost_at: the funnel step where they gave up or got stuck (hero, pricing, product, signup). Use "none" ONLY for "buy".
- objection_category: the single best match; use "none" ONLY for "buy".
- objection: their main objection in one sentence (for converters: their small remaining doubt).
- would_change_mind: the one specific change to the site that would win them (or keep them).
- quote: one short, natural sentence in their own voice, as if overheard. Match their age: a 15-year-old talks like a 15-year-old, casually. No marketing speak.
Return one result per persona, using their exact persona_id.`;

type Progress = (done: number, total: number) => void;

export async function evaluatePersonas(
  crawl: Crawl,
  profile: ProductProfile,
  personas: Persona[],
  onProgress: Progress,
  extras?: Extras,
): Promise<{ verdicts: Verdict[]; costs: CallCost[] }> {
  const siteContent = await buildSiteContent(crawl, profile, extras);
  const hasJourney = Boolean(extras?.journey?.steps.length);
  const batches: Persona[][] = [];
  for (let i = 0; i < personas.length; i += BATCH_SIZE) {
    batches.push(personas.slice(i, i + BATCH_SIZE));
  }

  const verdicts: Verdict[] = [];
  const costs: CallCost[] = [];
  let done = 0;

  const runBatch = async (batch: Persona[], index: number) => {
    const result = await evaluateBatch(siteContent, batch, `evaluate batch ${index + 1}`, hasJourney);
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
  extras?: Extras,
): Promise<Anthropic.ContentBlockParam[]> {
  const blocks: Anthropic.ContentBlockParam[] = [];
  const addImage = async (file: string, label: string) => {
    try {
      const data = await fs.readFile(file);
      blocks.push(
        { type: "text", text: label },
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: data.toString("base64") } },
      );
    } catch {
      // A missing screenshot is fine; the text still describes it.
    }
  };
  for (const page of crawl.pages) {
    const files = page.screenshotFiles.map((f, i) => ({
      file: f,
      label: `Screenshot of the ${page.step} page${i > 0 ? " (scrolled down)" : ""} on a laptop:`,
    }));
    if (page.mobileScreenshotFile) {
      files.push({ file: page.mobileScreenshotFile, label: `Screenshot of the ${page.step} page on a PHONE:` });
    }
    for (const { file, label } of files) await addImage(screenshotPath(crawl.id, file), label);
  }

  // Milestone 3: key moments from the explorer actually using the product.
  const journey = extras?.journey;
  if (journey?.steps.length) {
    for (const step of pickKeySteps(journey)) {
      await addImage(
        screenshotPath(extras!.runId, step.screenshot),
        `EXPLORER step ${step.n} (inside the product): ${step.observation}`,
      );
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
  blocks.push({ type: "text", text: text + journeyText(journey) + reviewsText(extras?.reputation), cache_control: { type: "ephemeral" } });
  return blocks;
}

async function evaluateBatch(
  siteContent: Anthropic.ContentBlockParam[],
  batch: Persona[],
  label: string,
  hasJourney: boolean,
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
                text:
                  `RESEARCH NOTES:\n${rulesFor(todo).map((r) => `- ${r}`).join("\n")}\n\n` +
                  `Personas (${todo.length}):\n` +
                  todo.map(describePersona).join("\n"),
              },
            ],
          },
        ],
      });
      costs.push(costOfCall(attempt === 1 ? label : `${label} retry`, response.model, response.usage));
      assertNotRefused(response.stop_reason, label);

      for (const r of response.parsed_output?.results ?? []) {
        if (!byId.has(r.persona_id) || found.has(r.persona_id)) continue;
        found.set(r.persona_id, normalize(r, hasJourney));
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
function normalize(r: z.infer<typeof BatchSchema>["results"][number], hasJourney: boolean): Verdict {
  const isBuy = r.verdict === "buy";
  // A non-buyer must have stopped somewhere; default to the last step.
  // "product" only makes sense if the explorer actually tried the product.
  let lostAt = r.lost_at === "none" ? "signup" : r.lost_at;
  if (lostAt === "product" && !hasJourney) lostAt = "signup";
  return {
    personaId: r.persona_id,
    verdict: r.verdict,
    lostAt: isBuy ? "none" : lostAt,
    objectionCategory: isBuy ? "none" : r.objection_category === "none" ? "unclear value" : r.objection_category,
    objection: r.objection,
    wouldChangeMind: r.would_change_mind,
    quote: r.quote,
  };
}

// Up to 6 screenshots spread across the journey, always including the last.
function pickKeySteps(journey: Journey) {
  const steps = journey.steps;
  if (steps.length <= MAX_JOURNEY_SHOTS) return steps;
  const picked = new Set<number>();
  for (let i = 0; i < MAX_JOURNEY_SHOTS; i++) {
    picked.add(Math.round((i * (steps.length - 1)) / (MAX_JOURNEY_SHOTS - 1)));
  }
  return [...picked].sort((a, b) => a - b).map((i) => steps[i]);
}

function journeyText(journey?: Journey) {
  if (!journey?.steps.length) return "";
  const log = journey.steps
    .map((s) => `${s.n}. Saw: ${s.observation} -> ${s.action}${s.friction ? ` [friction: ${s.friction}]` : ""}`)
    .join("\n");
  return (
    `\n\n=== EXPLORER JOURNEY: a tester tried the product ===\nTask: ${journey.task}\n` +
    `Result: ${journey.status} after ${journey.steps.length} steps (${journey.seconds}s)\n` +
    `Summary: ${journey.summary}\nBiggest friction: ${journey.frictionPoints.join("; ") || "none noted"}\nSteps:\n${log}`
  );
}

function reviewsText(rep?: Reputation) {
  if (!rep) return "";
  if (!rep.found) return "\n\n=== REAL REVIEWS FROM THE WEB ===\nNo independent reviews found (the product may be new).";
  return (
    `\n\n=== REAL REVIEWS FROM THE WEB ===\n${rep.summary}\n` +
    `People praise: ${rep.praise.join("; ") || "-"}\nPeople complain about: ${rep.complaints.join("; ") || "-"}`
  );
}
