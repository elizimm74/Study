// Paywall checks done IN CODE on the founder-confirmed facts (no AI guessing).
// Two kinds:
//  - "store rule": things Apple / Google ask subscription apps to show. We say
//    "may be flagged", never "will be rejected": reviewers decide, not us.
//  - "conversion": things that commonly help or hurt trial starts.
import type { PaywallFacts, RuleCheck } from "./types";

const APPLE_SUBS = "Apple App Store Review Guidelines 3.1.2 (subscriptions)";
const APPLE_RESTORE = "Apple App Store Review Guidelines 3.1.1 (restoring purchases)";
const GOOGLE_SUBS = "Google Play subscriptions policy (clear offer terms)";

export function checkPaywall(f: PaywallFacts | null): RuleCheck[] {
  if (!f) {
    return [
      {
        id: "no-paywall",
        kind: "conversion",
        ok: false,
        title: "No paywall found in these screens",
        detail: "Add the paywall screenshot to get the paywall teardown and rule checks.",
        basis: "Crawler",
      },
    ];
  }
  const hasTrial = f.plans.some((p) => p.trialDays > 0);
  const recurring = f.plans.some((p) => p.period === "week" || p.period === "month" || p.period === "year");
  const checks: RuleCheck[] = [
    {
      id: "price-shown",
      kind: "store rule",
      ok: f.plans.length > 0 && f.plans.every((p) => p.price.trim().length > 0),
      title: "Every plan shows its price",
      detail: "People (and app reviewers) need to see exactly what they'll pay before they tap.",
      basis: `${APPLE_SUBS}; ${GOOGLE_SUBS}`,
    },
    {
      id: "period-shown",
      kind: "store rule",
      ok: f.plans.length > 0 && f.plans.every((p) => p.period !== "other"),
      title: "Every plan says how often it bills (week / month / year)",
      detail: "A price without its billing period looks like a trick.",
      basis: `${APPLE_SUBS}; ${GOOGLE_SUBS}`,
    },
  ];
  if (hasTrial) {
    checks.push({
      id: "after-trial",
      kind: "store rule",
      ok: f.priceAfterTrialShown,
      title: "Says what it costs after the free trial",
      detail: 'Show it next to the button, e.g. "3 days free, then $39.99/year".',
      basis: `${APPLE_SUBS}; ${GOOGLE_SUBS}`,
    });
  }
  if (recurring) {
    checks.push({
      id: "auto-renew",
      kind: "store rule",
      ok: f.autoRenewExplained,
      title: "Explains that it renews automatically and how to cancel",
      detail: 'A short line like "Renews automatically. Cancel anytime in Settings."',
      basis: APPLE_SUBS,
    });
  }
  checks.push(
    {
      id: "restore",
      kind: "store rule",
      ok: f.restorePurchases,
      title: "Has a “Restore purchases” button",
      detail: "People who already paid (new phone, reinstall) need a way to get access back.",
      basis: APPLE_RESTORE,
    },
    {
      id: "legal-links",
      kind: "store rule",
      ok: f.termsLink && f.privacyLink,
      title: "Links to Terms of Use and Privacy Policy",
      detail: f.termsLink || f.privacyLink ? `Missing: ${f.termsLink ? "Privacy Policy" : "Terms of Use"}.` : "Both are missing.",
      basis: APPLE_SUBS,
    },
    {
      id: "close-button",
      kind: "conversion",
      ok: f.closeButton === "visible",
      title: "The way out is easy to find",
      detail:
        f.closeButton === "visible"
          ? "Good: people don't feel trapped, which builds trust."
          : `The close button is ${f.closeButton}. Hidden exits feel pushy and can make people delete the app instead.`,
      basis: "Common paywall practice",
    },
    {
      id: "plan-count",
      kind: "conversion",
      ok: f.plans.length >= 1 && f.plans.length <= 3,
      title: "1–3 plans to choose from",
      detail: f.plans.length > 3 ? `There are ${f.plans.length} plans. More choices make people stall.` : "Easy to choose.",
      basis: "Common paywall practice",
    },
    {
      id: "highlight",
      kind: "conversion",
      ok: f.plans.length <= 1 || f.plans.some((p) => p.highlighted),
      title: "One plan is clearly recommended",
      detail: "Highlighting one plan (often yearly, with the saving shown) makes the choice easier.",
      basis: "Common paywall practice",
    },
    {
      id: "social-proof",
      kind: "conversion",
      ok: f.socialProof.length > 0,
      title: "Shows proof (ratings, reviews, user counts)",
      detail: "Proof right on the paywall reassures people at the moment they decide.",
      basis: "Common paywall practice",
    },
  );
  return checks;
}

// "3 days free, then $39.99/year" etc., used in prompts and the report.
export function paywallToText(f: PaywallFacts | null): string {
  if (!f) return "No paywall in these screens.";
  const plans = f.plans
    .map(
      (p) =>
        `- ${p.name}: ${p.price} per ${p.period}${p.trialDays ? `, ${p.trialDays}-day free trial` : ", no free trial"}${p.highlighted ? " (highlighted)" : ""}`,
    )
    .join("\n");
  return [
    `Headline: ${f.headline || "-"}`,
    `Plans:\n${plans || "- none shown"}`,
    `Main button: ${f.ctaText || "-"}`,
    `Close button: ${f.closeButton}`,
    `Price after trial shown: ${f.priceAfterTrialShown ? "yes" : "no"}`,
    `Auto-renew explained: ${f.autoRenewExplained ? "yes" : "no"}`,
    `Restore purchases: ${f.restorePurchases ? "yes" : "no"}`,
    `Terms / privacy links: ${f.termsLink ? "terms" : "no terms"}, ${f.privacyLink ? "privacy" : "no privacy"}`,
    `Proof shown: ${f.socialProof.join("; ") || "none"}`,
  ].join("\n");
}
