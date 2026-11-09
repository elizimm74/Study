"use client";
// Edit the paywall facts the AI read (plans, trial, links...). Every simulated
// customer reads exactly these, so the founder checking them is what makes
// the test accurate. ChecksList shows the store-rule checks live.
import { CLOSE_BUTTON, PERIODS, type PaywallFacts, type RuleCheck } from "@/lib/app/types";

export default function PaywallEditor({ facts, onChange }: { facts: PaywallFacts; onChange: (f: PaywallFacts) => void }) {
  const set = (patch: Partial<PaywallFacts>) => onChange({ ...facts, ...patch });
  const setPlan = (i: number, patch: Partial<PaywallFacts["plans"][number]>) =>
    set({ plans: facts.plans.map((p, j) => (j === i ? { ...p, ...patch } : patch.highlighted ? { ...p, highlighted: false } : p)) });

  return (
    <div className="space-y-6">
      <div>
        <p className="field-label">Plans</p>
        <div className="space-y-2">
          {facts.plans.map((p, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-line p-2 sm:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto_auto] sm:items-center">
              <input aria-label="Plan name" value={p.name} onChange={(e) => setPlan(i, { name: e.target.value })} placeholder="Yearly" className="field h-10 text-sm" />
              <input aria-label="Price" value={p.price} onChange={(e) => setPlan(i, { price: e.target.value })} placeholder="$39.99" className="field h-10 text-sm" />
              <select aria-label="Bills every" value={p.period} onChange={(e) => setPlan(i, { period: e.target.value as PaywallFacts["plans"][number]["period"] })} className="field h-10 text-sm">
                {PERIODS.map((x) => (
                  <option key={x} value={x}>
                    {x === "other" ? "not stated" : `per ${x}`.replace("per lifetime", "lifetime")}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  aria-label="Free trial days"
                  type="number"
                  min={0}
                  max={90}
                  value={p.trialDays}
                  onChange={(e) => setPlan(i, { trialDays: Math.max(0, Number(e.target.value) || 0) })}
                  className="field h-10 w-16 text-sm"
                />
                days free
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="highlighted" checked={p.highlighted} onChange={() => setPlan(i, { highlighted: true })} />
                pushed
              </label>
              <button type="button" onClick={() => set({ plans: facts.plans.filter((_, j) => j !== i) })} className="btn btn-text h-10 text-sm" aria-label={`Remove plan ${i + 1}`}>
                remove
              </button>
            </div>
          ))}
        </div>
        {facts.plans.length < 6 && (
          <button
            type="button"
            onClick={() => set({ plans: [...facts.plans, { name: "", price: "", period: "month", trialDays: 0, highlighted: false }] })}
            className="btn btn-text mt-2 text-sm"
          >
            + add a plan
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Headline</span>
          <input value={facts.headline} onChange={(e) => set({ headline: e.target.value })} className="field" />
        </label>
        <label className="block">
          <span className="field-label">Main button</span>
          <input value={facts.ctaText} onChange={(e) => set({ ctaText: e.target.value })} className="field" />
        </label>
        <label className="block">
          <span className="field-label">Close button</span>
          <select value={facts.closeButton} onChange={(e) => set({ closeButton: e.target.value as PaywallFacts["closeButton"] })} className="field">
            {CLOSE_BUTTON.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">
            Proof shown <span className="field-hint">(comma separated)</span>
          </span>
          <input
            value={facts.socialProof.join(", ")}
            onChange={(e) => set({ socialProof: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
            placeholder="4.8★ from 12k ratings"
            className="field"
          />
        </label>
      </div>

      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="field-label">On the screen</legend>
        {(
          [
            ["priceAfterTrialShown", "Price after the trial is stated"],
            ["autoRenewExplained", "Says it renews / how to cancel"],
            ["restorePurchases", "“Restore purchases” button"],
            ["termsLink", "Terms of Use link"],
            ["privacyLink", "Privacy Policy link"],
          ] as const
        ).map(([key, text]) => (
          <label key={key} className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={facts[key]} onChange={(e) => set({ [key]: e.target.checked })} />
            {text}
          </label>
        ))}
      </fieldset>
    </div>
  );
}

export function ChecksList({ checks }: { checks: RuleCheck[] }) {
  return (
    <ul className="divide-y divide-line border-t border-line">
      {checks.map((c) => (
        <li key={c.id} className="flex gap-4 py-4">
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${c.ok ? "bg-accent text-white" : "border border-line-strong text-fg"}`}
            aria-label={c.ok ? "passes" : "needs a fix"}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d={c.ok ? "M3.5 8.5l3 3 6-7" : "M4.5 4.5l7 7M11.5 4.5l-7 7"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {c.title} <span className="t-label ml-1">{c.kind}</span>
            </p>
            {!c.ok && <p className="mt-1 text-sm text-muted">{c.detail}</p>}
            {!c.ok && c.kind === "store rule" && <p className="mt-1 text-xs text-faint">May be flagged in review · {c.basis}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
