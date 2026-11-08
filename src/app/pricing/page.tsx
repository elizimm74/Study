// /pricing: the plans from src/lib/plans.ts. One-time packs, no subscriptions.
// Paid packs say "Coming soon" until Stripe is connected (the next step).
import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { PLANS, perTestLabel, priceLabel } from "@/lib/plans";

export const metadata = { title: "crawler: pricing" };

export default async function Pricing() {
  const user = await currentUser();
  const signedIn = Boolean(user) || !AUTH_ENABLED;

  return (
    <div className="mx-auto max-w-5xl">
      <p className="t-label">pricing</p>
      <h1 className="t-h1 mt-4">Pay per launch, not per month.</h1>
      <p className="t-lead mt-4 max-w-xl">
        Buy tests once. They never expire, so they&apos;re there whenever you have something new to launch.
      </p>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const free = p.priceUsd === 0;
          return (
            <div key={p.id} className={`card flex flex-col p-6 ${p.id === "launch" ? "border-fg" : ""}`}>
              <div className="flex items-center justify-between">
                <p className="font-medium">{p.name}</p>
                {p.id === "launch" && <span className="pill pill-buy">most popular</span>}
              </div>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="t-number text-5xl">{priceLabel(p)}</span>
                <span className="text-faint">{free ? "" : "one-time"}</span>
              </p>
              <p className="mt-1 text-sm text-faint">{perTestLabel(p)}</p>
              <p className="mt-4 text-sm text-muted">{p.note}</p>
              <ul className="mt-6 flex-1 space-y-2 border-t border-line pt-6 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
              {free ? (
                <Link href={signedIn ? "/app" : "/signup"} className="btn btn-primary mt-8 w-full">
                  Start free
                </Link>
              ) : (
                <span className="btn btn-ghost mt-8 w-full cursor-default text-faint" aria-disabled>
                  Coming soon
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="t-label mt-8">
        every test: simulated customers · buying intent, not real purchases · no subscription
      </p>
    </div>
  );
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-1 shrink-0 text-faint" aria-hidden>
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
