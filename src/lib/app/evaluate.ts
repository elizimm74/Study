// APP TESTS, step 3: simulated customers walk through the onboarding, screen
// by screen, and decide at the paywall. ~25 customers per Haiku call.
//
// Accuracy tricks:
//  - The screens and paywall FACTS the AI sees were confirmed by the founder.
//  - Research notes about real mobile behavior (below) are included.
//  - A/B is PAIRED: the same person judges both paywall versions, so the
//    comparison isn't luck of who showed up. Half the batches see A first,
//    half see B first, so "whichever came first" bias cancels out.
//  - Contradictions are fixed in code (e.g. you can't subscribe on a
//    paywall you never reached).
// Cost tricks (same as websites): screenshots are prompt-cached, so after the
// first batch they cost ~10% as much.
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, assertNotRefused, HAIKU } from "../ai";
import { costOfCall } from "../cost";
import { profileToText } from "../suggest";
import type { BlobStore } from "../blobs";
import { OBJECTION_CATEGORIES, type CallCost, type ProductProfile } from "../types";
import { describeAppPersona } from "./personas";
import { paywallToText } from "./checks";
import { PAYWALL_DECISIONS, type AppPersona, type AppSettings, type AppVerdict } from "./types";
import { normalizeApp } from "./normalize";

const BATCH_SIZE = 25;
const PARALLEL = 4;

const BatchSchema = z.object({
  results: z.array(
    z.object({
      persona_id: z.string(),
      stopped_at_screen: z.number(),
      paywall_a: z.enum(PAYWALL_DECISIONS),
      paywall_b: z.enum(PAYWALL_DECISIONS),
      objection_category: z.enum(OBJECTION_CATEGORIES),
      objection: z.string(),
      would_change_mind: z.string(),
      quote: z.string(),
    }),
  ),
});

const SYSTEM_PROMPT = `You simulate real people who just installed a mobile app and are going through its onboarding for the first time.
You see the app's screens in order (screenshots), the paywall's exact facts (checked by the founder), a product profile, and a list of personas. For EACH persona, stay fully in character and decide honestly what they would do.

Walk the flow screen by screen, like a real person on their phone:
- At each screen, would this person keep going or close the app? Long questionnaires, early sign-up walls, permission pop-ups without a reason, and slow value all cost people. A screen that shows a clear benefit or makes it feel personal can pull them forward.
- stopped_at_screen: the number of the screen where they gave up and closed the app. Use 0 if they got through the whole flow (including closing a paywall and continuing into the app for free, if the paywall can be closed).
- paywall_a: at the paywall (version A), "start trial", "subscribe" (pay now, no trial), or "close" (don't pay). Use "never reached" if they quit before the paywall.
- paywall_b: when a VERSION B paywall is shown, the same person's decision at version B, judged on its own as if it were the only paywall (same person, same mood). Otherwise "never reached".
- Choosing "start trial" means confirming a real free trial with Apple / Google that turns into a paid subscription unless cancelled. Many people avoid that because they're afraid of forgetting to cancel. Only choose it if this person really would.

Be realistic, not polite:
- Most people who install an app never start a trial or pay. Price shock, an unclear price, a hidden close button, no proof, and "why do you need this?" asks are real reasons to leave.
- Use each persona's details: budget and mindset drive price sensitivity; tech comfort drives how hard setup feels; what they use now sets the bar to switch; patience sets how many screens they'll take; where they found the app sets how warm they arrive (a friend's link > a store search > an ad).
- Follow the RESEARCH NOTES included with each batch.

For each persona also return:
- objection_category: the single best match for why they didn't convert (or, for converters, use "none").
- objection: their main objection in one sentence (for converters: their small remaining doubt).
- would_change_mind: the one specific change to the screens or paywall that would win them (or keep them).
- quote: one short, natural sentence in their own voice, as if said out loud while using the app. Match their age. No marketing speak.
Return one result per persona, using their exact persona_id.`;

// Research about mobile onboarding + paywalls, attached to who it fits.
// Qualitative on purpose: we don't put numbers here that we can't source.
type Rule = { appliesTo: (p: AppPersona) => boolean; text: string };
const APP_RULES: Rule[] = [
  {
    appliesTo: () => true,
    text: "For subscription apps, only a small share of people who install the app ever start a trial (RevenueCat's State of Subscription Apps 2025 reports a median of about 6% from download to trial, about 20% for the top 10% of apps). Most people leave without paying.",
  },
  {
    appliesTo: () => true,
    text: "Every extra onboarding screen before the app shows its value loses some people. Asking for an account, notifications or tracking before people understand why is a common reason to quit. Questions that make the app feel personal can keep people engaged, but only if it's clear the answers matter.",
  },
  {
    appliesTo: () => true,
    text: "On paywalls people look for: the exact price and how often it bills, what happens after a free trial, and an easy way out. A hidden or delayed close button feels like a trap and makes people delete the app. Reminders before a trial ends reduce the fear of being charged by surprise.",
  },
  {
    appliesTo: (p) => p.age < 18,
    text: "Teens rarely have their own card. Paying in an app usually means asking a parent (on iPhone, 'Ask to Buy' sends the request to the parent). Free trials that need payment details and weekly subscriptions are real obstacles; they check reviews and what friends use first.",
  },
  {
    appliesTo: (p) => p.budget === "tight",
    text: "People on a tight budget compare any subscription against free apps and doing it themselves. A weekly price looks small but adds up; they notice. A yearly plan shown as a monthly amount helps only if it's honest.",
  },
  {
    appliesTo: (p) => p.techComfort === "low",
    text: "People with low tech comfort get stuck on permission pop-ups and sign-in choices they don't understand, and give up.",
  },
  {
    appliesTo: (p) => p.mindset === "skeptical",
    text: "Skeptical people look for ratings, reviews and a clear way to cancel before paying anything. Vague promises put them off.",
  },
  {
    appliesTo: (p) => p.source === "TikTok / Instagram ad",
    text: "People who install from an ad are curious but not committed; they leave fast if the app doesn't match what the ad promised.",
  },
  {
    appliesTo: (p) => p.source === "friend's link",
    text: "People who install because a friend recommended it arrive warmer and more patient than people from a search or an ad.",
  },
];

export function appRulesFor(personas: AppPersona[]): string[] {
  return APP_RULES.filter((r) => personas.some(r.appliesTo)).map((r) => r.text);
}

export type AppEvalInput = {
  settings: AppSettings; // confirmed screens + paywall facts
  profile: ProductProfile;
  personas: AppPersona[];
  store: BlobStore;
  screensPrefix: string; // "{userId}/uploads/{batch}"
  onProgress: (done: number, total: number) => void;
};

export async function evaluateApp(input: AppEvalInput): Promise<{ verdicts: AppVerdict[]; costs: CallCost[] }> {
  const hasB = input.settings.screensB.length > 0 && Boolean(input.settings.paywallB);
  const contentAB = await buildContent(input, "AB");
  const contentBA = hasB ? await buildContent(input, "BA") : contentAB;

  const batches: AppPersona[][] = [];
  for (let i = 0; i < input.personas.length; i += BATCH_SIZE) batches.push(input.personas.slice(i, i + BATCH_SIZE));

  const verdicts: AppVerdict[] = [];
  const costs: CallCost[] = [];
  let done = 0;
  const runBatch = async (batch: AppPersona[], index: number) => {
    // Alternate the order of the two paywall versions batch by batch.
    const content = index % 2 === 0 ? contentAB : contentBA;
    const result = await evaluateBatch(content, batch, `app batch ${index + 1}`, input.settings, hasB);
    verdicts.push(...result.verdicts);
    costs.push(...result.costs);
    done += batch.length;
    input.onProgress(done, input.personas.length);
  };

  // The first batch of each ordering goes first (fills the cache), then the rest in parallel.
  const warm = hasB ? 2 : 1;
  await Promise.all(batches.slice(0, warm).map((b, i) => runBatch(b, i)));
  for (let i = warm; i < batches.length; i += PARALLEL) {
    await Promise.all(batches.slice(i, i + PARALLEL).map((b, j) => runBatch(b, i + j)));
  }
  return { verdicts, costs };
}

async function buildContent(input: AppEvalInput, order: "AB" | "BA"): Promise<Anthropic.ContentBlockParam[]> {
  const { settings, store, screensPrefix } = input;
  const hasB = settings.screensB.length > 0 && Boolean(settings.paywallB);
  const blocks: Anthropic.ContentBlockParam[] = [];
  const addImage = async (file: string, text: string) => {
    const data = await store.get(`${screensPrefix}/${file}`).catch(() => null);
    blocks.push({ type: "text", text });
    if (data) blocks.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: data.toString("base64") } });
  };

  const n = settings.screens.length;
  blocks.push({ type: "text", text: `=== THE APP'S ONBOARDING: ${n} screens, in the order a new user sees them ===` });
  for (const [i, s] of settings.screens.entries()) {
    const head = `Screen ${i + 1} of ${n} (${s.type}${s.canSkip ? ", can be skipped" : ""})`;
    if (hasB && s.type === "paywall") {
      blocks.push({ type: "text", text: `${head}: THE PAYWALL. It comes in two versions, shown below. Judge each one separately.` });
    } else {
      await addImage(s.file, `${head}:`);
    }
  }

  const paywallBlock = async (v: "A" | "B") => {
    const files = v === "A" ? settings.screens.filter((s) => s.type === "paywall").map((s) => s.file) : settings.screensB.map((s) => s.file);
    blocks.push({ type: "text", text: `=== PAYWALL VERSION ${v} ===` });
    for (const [i, f] of files.entries()) await addImage(f, `Version ${v}, paywall screenshot ${i + 1}:`);
    blocks.push({ type: "text", text: `Version ${v} facts (confirmed by the founder):\n${paywallToText(v === "A" ? settings.paywall : settings.paywallB)}` });
  };
  if (hasB) {
    for (const v of order === "AB" ? (["A", "B"] as const) : (["B", "A"] as const)) await paywallBlock(v);
  } else {
    blocks.push({ type: "text", text: `=== PAYWALL FACTS (confirmed by the founder) ===\n${paywallToText(settings.paywall)}` });
  }

  const what = settings.screens.map((s, i) => `${i + 1}. [${s.type}] "${s.title}" ${s.summary}${s.asks.length ? ` Asks for: ${s.asks.join(", ")}.` : ""} Button: "${s.cta}"`).join("\n");
  blocks.push({
    type: "text",
    text:
      `=== SCREEN LIST (checked by the founder) ===\n${what}\n\n` +
      `=== PRODUCT PROFILE ===\n${profileToText(input.profile)}` +
      (hasB ? "" : `\n\nThere is no version B: always return paywall_b "never reached".`),
    cache_control: { type: "ephemeral" },
  });
  return blocks;
}

async function evaluateBatch(
  content: Anthropic.ContentBlockParam[],
  batch: AppPersona[],
  label: string,
  settings: AppSettings,
  hasB: boolean,
): Promise<{ verdicts: AppVerdict[]; costs: CallCost[] }> {
  const costs: CallCost[] = [];
  const byId = new Map(batch.map((p) => [p.id, p]));
  const found = new Map<string, AppVerdict>();

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
              ...content,
              {
                type: "text",
                text:
                  `RESEARCH NOTES:\n${appRulesFor(todo).map((r) => `- ${r}`).join("\n")}\n\n` +
                  `Personas (${todo.length}):\n${todo.map(describeAppPersona).join("\n")}`,
              },
            ],
          },
        ],
      });
      costs.push(costOfCall(attempt === 1 ? label : `${label} retry`, response.model, response.usage));
      assertNotRefused(response.stop_reason, label);
      for (const r of response.parsed_output?.results ?? []) {
        const p = byId.get(r.persona_id);
        if (!p || found.has(r.persona_id)) continue;
        found.set(r.persona_id, normalizeApp(r, p, settings, hasB));
      }
    } catch (err) {
      console.error(`[${label}] attempt ${attempt} failed:`, (err as Error).message);
      if (attempt === 2) throw err;
    }
  }
  if (found.size < batch.length) console.warn(`[${label}] ${batch.length - found.size} customers had no answer; skipped.`);
  return { verdicts: [...found.values()], costs };
}
