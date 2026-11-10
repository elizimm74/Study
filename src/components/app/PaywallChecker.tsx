"use client";
// The FREE paywall checker: no account, no AI, no cost. It runs the same
// store-rule checks as a paid test (src/lib/app/checks.ts), right in the browser.
import { useMemo, useState } from "react";
import Link from "next/link";
import PaywallEditor, { ChecksList } from "./PaywallEditor";
import { Arrow } from "@/components/landing/UrlForm";
import { checkPaywall } from "@/lib/app/checks";
import type { PaywallFacts } from "@/lib/app/types";

const START: PaywallFacts = {
  plans: [{ name: "Yearly", price: "", period: "year", trialDays: 3, highlighted: true }],
  closeButton: "visible",
  restorePurchases: false,
  termsLink: false,
  privacyLink: false,
  priceAfterTrialShown: false,
  autoRenewExplained: false,
  socialProof: [],
  headline: "",
  ctaText: "",
};

export default function PaywallChecker() {
  const [facts, setFacts] = useState<PaywallFacts>(START);
  const checks = useMemo(() => checkPaywall(facts), [facts]);
  const rules = checks.filter((c) => c.kind === "store rule");
  const passed = rules.filter((c) => c.ok).length;
  const tips = checks.filter((c) => c.kind === "conversion" && !c.ok).length;

  return (
    <div className="space-y-8">
      <div className="card p-6">
        <PaywallEditor facts={facts} onChange={setFacts} />
      </div>

      <section className="card p-6" aria-live="polite">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="t-label">store rules</p>
            <p className="mt-1 flex items-end gap-2">
              <span className="t-number text-6xl text-accent">{passed}</span>
              <span className="t-number pb-1 text-2xl text-faint">/{rules.length}</span>
            </p>
          </div>
          <p className="max-w-xs text-sm text-muted">
            {passed === rules.length
              ? "Everything Apple and Google commonly ask for is on your paywall."
              : `${rules.length - passed} thing${rules.length - passed === 1 ? "" : "s"} may get your app flagged in review.`}
            {tips > 0 && ` Plus ${tips} tip${tips === 1 ? "" : "s"} that help more people start trials.`}
          </p>
        </div>
        <div className="mt-4">
          <ChecksList checks={checks} />
        </div>
        <p className="mt-4 text-xs text-faint">
          These checks follow Apple&apos;s App Store Review Guidelines and Google Play&apos;s subscription policy. Reviewers make the final call, so we
          say &quot;may be flagged&quot;, never &quot;will be rejected&quot;.
        </p>
      </section>

      <section className="paper bleed py-12 text-center">
        <div className="page">
          <h2 className="t-h2">Rules passed? Now see who would actually subscribe.</h2>
          <p className="t-lead mx-auto mt-3 max-w-md">Drop in your onboarding and paywall screenshots. Simulated customers show where people quit and what to fix.</p>
          <Link href="/onboarding?kind=app" className="btn btn-primary mt-6 h-12 px-6">
            Test my app free <Arrow />
          </Link>
        </div>
      </section>
    </div>
  );
}
