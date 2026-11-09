// APP TESTS, step 5: Sonnet writes ranked fixes + rewritten paywall copy.
// Like websites, it only gets the COUNTED summary (never every raw answer),
// and "how many people could this win back" is counted in code.
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { anthropic, assertNotRefused, SONNET } from "../ai";
import { costOfCall } from "../cost";
import { profileToText } from "../suggest";
import { OBJECTION_CATEGORIES, type CallCost, type ProductProfile } from "../types";
import { paywallToText } from "./checks";
import type { AppStats } from "./aggregate";
import type { AppSettings, RuleCheck } from "./types";

const AdviceSchema = z.object({
  summary: z.string(),
  fixes: z.array(
    z.object({
      title: z.string(),
      problem: z.string(),
      change: z.string(),
      screen: z.number(), // the screen number it fixes (0 = the whole flow)
      addresses: z.array(z.enum(OBJECTION_CATEGORIES)),
    }),
  ),
  paywallHeadlines: z.array(z.string()),
  ctaOptions: z.array(z.string()),
  trialLine: z.string(), // e.g. "3 days free, then $39.99/year. Cancel anytime."
  onboardingTip: z.string(),
});

export type AppFix = z.infer<typeof AdviceSchema>["fixes"][number] & { couldWin: number; atPaywall: number };
export type AppAdvice = Omit<z.infer<typeof AdviceSchema>, "fixes"> & { fixes: AppFix[] };

export async function writeAppAdvice(
  settings: AppSettings,
  profile: ProductProfile,
  stats: AppStats,
  checks: RuleCheck[],
): Promise<{ advice: AppAdvice; cost: CallCost }> {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const summary = {
    customersPerSample: stats.perSample,
    samples: stats.samples,
    converted: `${pct(stats.convert.mid)} (range ${pct(stats.convert.low)}–${pct(stats.convert.high)})`,
    reachedPaywall: pct(stats.reachedPaywall.mid),
    screens: stats.funnel.map((s) => ({ n: s.n, type: s.type, title: s.title, reached: s.reached, quitHere: s.quit })),
    objections: stats.objections.map((o) => ({
      category: o.category,
      count: o.count,
      atPaywall: o.atPaywall,
      examples: o.examples.slice(0, 5),
      wouldChangeMind: o.changeMind.slice(0, 5),
    })),
    failedChecks: checks.filter((c) => !c.ok).map((c) => `${c.kind}: ${c.title}`),
    ab: stats.ab && { winner: stats.ab.winner, confidence: stats.ab.confidence, onlyA: stats.ab.onlyA, onlyB: stats.ab.onlyB },
  };

  const response = await anthropic.beta.messages.parse({
    model: SONNET,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(AdviceSchema) },
    messages: [
      {
        role: "user",
        content:
          `You are a sharp mobile-app growth expert (onboarding + subscription paywalls) advising a small founder.\n` +
          `Simulated customers went through their app's onboarding. Here are the app and the counted results.\n\n` +
          `PRODUCT PROFILE:\n${profileToText(profile)}\n\n` +
          `SCREENS:\n${settings.screens.map((s, i) => `${i + 1}. [${s.type}] "${s.title}": ${s.summary} Button "${s.cta}"`).join("\n")}\n\n` +
          `PAYWALL:\n${paywallToText(settings.paywall)}\n\n` +
          (settings.paywallB ? `PAYWALL VERSION B:\n${paywallToText(settings.paywallB)}\n\n` : "") +
          `RESULTS (JSON):\n${JSON.stringify(summary, null, 1)}\n\n` +
          `Write:\n` +
          `- summary: ONE sentence (max 30 words): the biggest problem and what to do.\n` +
          `- fixes: 3-5 specific changes, biggest impact first, no overlap. title max 8 words, problem max 20 words, ` +
          `change: ONE concrete action, max 30 words. screen: the screen number it changes (0 if it's about the whole flow). ` +
          `addresses: objection categories present in the results that it solves. If a store-rule check failed, include a fix for it.\n` +
          `- paywallHeadlines: 3 rewritten paywall headlines (max 8 words each).\n` +
          `- ctaOptions: 3 rewritten main button texts (max 5 words).\n` +
          `- trialLine: the line under the button, stating the exact price after the trial and how to cancel, using the REAL prices above.\n` +
          `- onboardingTip: one sentence on the onboarding before the paywall.\n` +
          `Be short, blunt and specific to THIS app. Never invent prices.`,
      },
    ],
  });
  assertNotRefused(response.stop_reason, "app report");
  const raw = response.parsed_output;
  if (!raw) throw new Error("The report came back in the wrong format.");

  // Count in code who each fix could win back. Each objection group is credited
  // to one fix only, so the numbers never add up to more people than exist.
  const claimed = new Set<string>();
  const remaining = [...raw.fixes];
  const fixes: AppFix[] = [];
  const gain = (f: (typeof remaining)[number]) => {
    const groups = stats.objections.filter((o) => f.addresses.includes(o.category) && !claimed.has(o.category));
    return { couldWin: groups.reduce((s, o) => s + o.count, 0), atPaywall: groups.reduce((s, o) => s + o.atPaywall, 0), cats: groups.map((o) => o.category) };
  };
  while (remaining.length) {
    remaining.sort((x, y) => gain(y).atPaywall - gain(x).atPaywall || gain(y).couldWin - gain(x).couldWin);
    const best = remaining.shift()!;
    const g = gain(best);
    g.cats.forEach((c) => claimed.add(c));
    fixes.push({ ...best, screen: Math.max(0, Math.round(best.screen)), couldWin: g.couldWin, atPaywall: g.atPaywall });
  }
  return { advice: { ...raw, fixes }, cost: costOfCall("app report", response.model, response.usage) };
}
