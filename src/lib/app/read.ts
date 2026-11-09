// APP TESTS, step 1: read the uploaded screenshots.
//   - Haiku (vision) labels every screen in order, writes a product profile and
//     guesses the audience (one call, cheap).
//   - Sonnet reads the PAYWALL screen(s) into exact facts (prices, trial,
//     links...). Small print matters there, so the smarter model does it.
// The founder then checks and corrects everything on the Review step, so the
// facts every simulated customer sees are confirmed by a human.
//
// Note: these newer models don't accept "temperature: 0". Consistency comes
// from strict JSON schemas (the API forces the shape) and low effort instead.
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, assertNotRefused, HAIKU, SONNET, requireApiKey } from "../ai";
import { costOfCall } from "../cost";
import { AudienceFields, AUDIENCE_INSTRUCTIONS, toAudience } from "../suggest";
import type { BlobStore } from "../blobs";
import type { Audience, CallCost, ProductProfile } from "../types";
import { CLOSE_BUTTON, PERIODS, SCREEN_TYPES, type AppInput, type AppScreen, type PaywallFacts } from "./types";

const ScreenFields = z.object({
  file: z.string(),
  type: z.enum(SCREEN_TYPES),
  title: z.string(),
  summary: z.string(),
  asks: z.array(z.string()),
  cta: z.string(),
  canSkip: z.boolean(),
});

const ScreensSchema = z.object({
  screens: z.array(ScreenFields),
  screensB: z.array(ScreenFields),
  // product profile
  whatItIs: z.string(),
  whoItsFor: z.string(),
  mainPromise: z.string(),
  proof: z.array(z.string()),
  friction: z.array(z.string()),
  // suggested audience
  ...AudienceFields,
});

const PaywallSchema = z.object({
  found: z.boolean(),
  plans: z.array(
    z.object({
      name: z.string(),
      price: z.string(),
      period: z.enum(PERIODS),
      trialDays: z.number(),
      highlighted: z.boolean(),
    }),
  ),
  closeButton: z.enum(CLOSE_BUTTON),
  restorePurchases: z.boolean(),
  termsLink: z.boolean(),
  privacyLink: z.boolean(),
  priceAfterTrialShown: z.boolean(),
  autoRenewExplained: z.boolean(),
  socialProof: z.array(z.string()),
  headline: z.string(),
  ctaText: z.string(),
});

export type AppReading = {
  screens: AppScreen[];
  screensB: AppScreen[];
  paywall: PaywallFacts | null;
  paywallB: PaywallFacts | null;
  profile: ProductProfile;
  audience: Audience;
  costs: CallCost[];
};

type Files = { store: BlobStore; prefix: string };

export async function readApp(input: AppInput, files: Files): Promise<AppReading> {
  requireApiKey();
  const images = new Map<string, string>(); // file -> base64
  for (const f of [...input.screens, ...input.screensB]) {
    const data = await files.store.get(`${files.prefix}/${f}`);
    if (!data) throw new Error(`Couldn't open the uploaded screen ${f}. Please upload it again.`);
    images.set(f, data.toString("base64"));
  }
  const costs: CallCost[] = [];

  // ---------- 1. Label every screen (Haiku) ----------
  const content: Anthropic.ContentBlockParam[] = [];
  input.screens.forEach((f, i) => content.push(label(`Screen ${i + 1} (file "${f}")`), image(images.get(f)!)));
  input.screensB.forEach((f, i) =>
    content.push(label(`VERSION B, screen ${i + 1} (file "${f}"): an alternative paywall the founder wants to compare`), image(images.get(f)!)),
  );
  content.push({
    type: "text",
    text:
      `These are screenshots of a mobile app's onboarding, in the order a new user sees them after installing it.\n\n` +
      `PART 1: For EVERY screen (same order, exact file names), return:\n` +
      `- type: welcome (intro / splash), value (explains a benefit), question (asks about the user: goals, age, preferences), ` +
      `permission (asks to allow notifications / tracking / location / camera...), signup (create account / log in), ` +
      `paywall (shows prices or asks to subscribe / start a trial), other.\n` +
      `- title: the main headline, copied exactly ("" if none).\n` +
      `- summary: one plain sentence: what the screen says or asks.\n` +
      `- asks: what it asks the user to give, e.g. "notifications", "email", "age", "payment" (empty if nothing).\n` +
      `- cta: the main button text, copied exactly.\n` +
      `- canSkip: true only if there is a visible Skip / Not now / Later / close (X).\n` +
      `Put Version B screens in screensB (empty list if there are none).\n\n` +
      `PART 2: Product profile, only from what the screens show. whatItIs and whoItsFor: one plain sentence each. ` +
      `mainPromise: the main benefit claimed. proof: ratings, reviews, user counts shown (empty if none). ` +
      `friction: things that slow a new user down or add doubt, e.g. "account required before seeing the app", ` +
      `"8 questions before any value", "no close button on the paywall".\n\n` +
      `PART 3: Most likely target customer. Fill in every field.\n${AUDIENCE_INSTRUCTIONS}`,
  });
  const res = await anthropic.messages.parse({
    model: HAIKU,
    max_tokens: 8000,
    output_config: { effort: "low", format: zodOutputFormat(ScreensSchema) },
    messages: [{ role: "user", content }],
  });
  costs.push(costOfCall("read screens", res.model, res.usage));
  assertNotRefused(res.stop_reason, "read screens");
  const s = res.parsed_output;
  if (!s) throw new Error("The screen reading came back in the wrong format.");

  // Trust OUR file order, not the AI's: match by file name, fill gaps.
  const screens = alignScreens(input.screens, s.screens);
  const screensB = alignScreens(input.screensB, s.screensB).map((x) => ({ ...x, type: "paywall" as const }));

  // ---------- 2. Read the paywall facts (Sonnet), A and B at the same time ----------
  const paywallFilesA = screens.filter((x) => x.type === "paywall").map((x) => x.file);
  const [a, b] = await Promise.all([
    paywallFilesA.length ? readPaywall(paywallFilesA, images, "paywall A") : null,
    input.screensB.length ? readPaywall(input.screensB, images, "paywall B") : null,
  ]);
  if (a) costs.push(a.cost);
  if (b) costs.push(b.cost);

  const paywall = a?.facts ?? null;
  const hasTrial = paywall?.plans.some((p) => p.trialDays > 0);
  const profile: ProductProfile = {
    goal: hasTrial ? "start a free trial" : "buy",
    whatItIs: s.whatItIs,
    whoItsFor: s.whoItsFor,
    mainPromise: s.mainPromise,
    prices: paywall?.plans.map((p) => `${p.name}: ${p.price}/${p.period}`) ?? [],
    proof: s.proof,
    friction: s.friction,
    tryTask: "",
  };
  return { screens, screensB, paywall, paywallB: b?.facts ?? null, profile, audience: toAudience(s), costs };
}

async function readPaywall(fileList: string[], images: Map<string, string>, tag: string) {
  const content: Anthropic.ContentBlockParam[] = [];
  fileList.forEach((f, i) => content.push(label(`Paywall screenshot ${i + 1}`), image(images.get(f)!)));
  content.push({
    type: "text",
    text:
      `Read this mobile app paywall EXACTLY. Copy text as shown; never guess. If something isn't visible, say so ` +
      `(false / empty / "other"). Check the small print at the bottom carefully.\n` +
      `- found: false if this isn't actually a paywall.\n` +
      `- plans: every plan or price option. price: exactly as written ("$39.99"). period: how often it bills ` +
      `(week / month / year / lifetime; "other" if not stated). trialDays: free trial length in days (0 if none; "1 week" = 7). ` +
      `highlighted: true for the plan the screen pushes (pre-selected, "Best value", "Most popular", bigger or colored).\n` +
      `- closeButton: "visible" (a clear X or "Not now"), "small or faint" (tiny, low contrast, or tucked in a corner), ` +
      `"appears after a delay" (only if the screenshots show that), "none".\n` +
      `- restorePurchases: a "Restore" / "Restore purchases" link. termsLink: Terms of Use / EULA link. privacyLink: Privacy Policy link.\n` +
      `- priceAfterTrialShown: the price that applies after the trial is stated, e.g. "3 days free, then $39.99/year".\n` +
      `- autoRenewExplained: it says the subscription renews automatically and/or how to cancel.\n` +
      `- socialProof: ratings, reviews, user counts, awards (exact text).\n` +
      `- headline: the paywall's main headline. ctaText: the main button text.`,
  });
  const res = await anthropic.messages.parse({
    model: SONNET,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(PaywallSchema) },
    messages: [{ role: "user", content }],
  });
  assertNotRefused(res.stop_reason, tag);
  const p = res.parsed_output;
  const cost = costOfCall(tag, res.model, res.usage);
  if (!p || !p.found) return { facts: null, cost };
  const { found: _found, ...facts } = p;
  void _found;
  return {
    facts: { ...facts, plans: facts.plans.map((x) => ({ ...x, trialDays: Math.max(0, Math.round(x.trialDays)) })) },
    cost,
  };
}

// Our upload order is the truth. If the AI skipped or renamed a screen,
// fill it in as "other" so the founder can label it.
export function alignScreens(files: string[], read: AppScreen[]): AppScreen[] {
  return files.map((file, i) => {
    const found = read.find((r) => r.file === file) ?? (read.length === files.length ? read[i] : undefined);
    return found
      ? { ...found, file }
      : { file, type: "other", title: "", summary: "", asks: [], cta: "", canSkip: false };
  });
}

const label = (text: string): Anthropic.ContentBlockParam => ({ type: "text", text });
const image = (data: string): Anthropic.ContentBlockParam => ({
  type: "image",
  source: { type: "base64", media_type: "image/jpeg", data },
});
