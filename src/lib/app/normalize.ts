// Fixes contradictions in a customer's answer so the counting is clean, e.g.
// you can't subscribe on a paywall you never reached. Pure code (no AI), so
// the bench tests it directly.
import type { ObjectionCategory } from "../types";
import type { AppPersona, AppSettings, AppVerdict, PaywallDecision } from "./types";

// One customer's raw answer, as the AI returns it.
export type Raw = {
  persona_id: string;
  stopped_at_screen: number;
  paywall_a: PaywallDecision;
  paywall_b: PaywallDecision;
  objection_category: ObjectionCategory;
  objection: string;
  would_change_mind: string;
  quote: string;
};

// Fix contradictions so the counting is clean. Exported for the bench.
export function normalizeApp(r: Raw, p: AppPersona, settings: AppSettings, hasB: boolean): AppVerdict {
  const n = settings.screens.length;
  let stoppedAt = Math.min(n, Math.max(0, Math.round(r.stopped_at_screen)));
  const firstPaywall = settings.screens.findIndex((s) => s.type === "paywall") + 1; // 0 = no paywall
  const trialOffered = (f: AppSettings["paywall"]) => Boolean(f?.plans.some((x) => x.trialDays > 0));
  const converts = (d: PaywallDecision) => d === "start trial" || d === "subscribe";

  // Fix one decision against the facts of that paywall.
  const fix = (d: PaywallDecision, facts: AppSettings["paywall"]): PaywallDecision => {
    if (d === "never reached") return "close"; // they reached it (checked by the caller)
    if (d === "start trial" && !trialOffered(facts)) return "subscribe";
    if (d === "subscribe" && facts && facts.plans.length && facts.plans.every((x) => x.trialDays > 0)) return "start trial";
    return d;
  };

  let decision: PaywallDecision;
  let decisionB: PaywallDecision | null = hasB ? "never reached" : null;
  const quitBeforePaywall = firstPaywall === 0 || (stoppedAt > 0 && stoppedAt < firstPaywall);
  if (quitBeforePaywall) {
    decision = "never reached";
  } else {
    decision = fix(r.paywall_a, settings.paywall);
    if (hasB) decisionB = fix(r.paywall_b, settings.paywallB);
    // Paid at the paywall but "quit" exactly there: they didn't quit.
    if ((converts(decision) || (decisionB && converts(decisionB))) && settings.screens[stoppedAt - 1]?.type === "paywall") stoppedAt = 0;
  }

  const converted = converts(decision);
  return {
    personaId: p.id,
    sample: p.sample,
    stoppedAt,
    decision,
    decisionB,
    objectionCategory: converted ? "none" : r.objection_category === "none" ? "unclear value" : r.objection_category,
    objection: r.objection,
    wouldChangeMind: r.would_change_mind,
    quote: r.quote,
  };
}
