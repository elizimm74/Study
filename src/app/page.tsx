// The landing page, built around one promise:
//   "See what stops customers from buying—before you launch."
// Order: hero → example report → how a test works → what you get back →
//        what it is / isn't (simulated customers, buying intent, not real purchases) → pricing → final CTA.
// Design rules live in globals.css (blue page, white cards and paper, one accent).
import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import ProductPreview from "@/components/landing/ProductPreview";
import Hero from "@/components/landing/Hero";
import Claws from "@/components/Claws";
import UrlForm from "@/components/landing/UrlForm";
import { EXAMPLE_SITE } from "@/components/landing/example";

// How one test runs, start to finish.
const STEPS = [
  {
    title: "Paste your URL",
    text: "We open your landing page, then find your pricing and signup the way a first-time visitor would.",
  },
  {
    title: "Simulated customers browse it",
    text: "25 customers with different ages, budgets, devices and patience each decide: would I buy, maybe, or leave?",
  },
  {
    title: "You get the blockers",
    text: "What stopped them, where they dropped off, and the fixes that would win back the most people.",
  },
];

// What comes back in every report.
const INSIGHTS = [
  { title: "Buying-intent score", text: "How many customers would buy, how many are on the fence, and how many would leave." },
  { title: "What stopped them", text: "Objections grouped by cause (price, trust, unclear value, signup friction) with the share of people each one lost." },
  { title: "Where they dropped off", text: "The step that lost the most people: your landing page, your pricing, or your signup." },
  { title: "Fixes, ranked", text: "Specific changes ordered by how many on-the-fence customers each would win back, plus rewritten copy." },
];

// Placeholder plans: payments aren't built yet, so only Free can be used today.
const PLANS = [
  { name: "Free", price: "$0", per: "", note: "Your first launch.", features: ["1 test", "25 simulated customers", "Full report with ranked fixes"], live: true },
  {
    name: "Pro",
    price: "$29",
    per: "/mo",
    note: "For founders who ship every week.",
    features: ["20 tests a month", "100 simulated customers per test", "An AI explorer tries your product", "Checks Reddit and review sites"],
  },
  {
    name: "Studio",
    price: "$99",
    per: "/mo",
    note: "For small teams and agencies.",
    features: ["100 tests a month", "1,000 simulated customers per test", "Everything in Pro", "Priority queue"],
  },
];

export default async function Landing() {
  const user = await currentUser();
  const signedIn = Boolean(user) || !AUTH_ENABLED;

  return (
    <div className="space-y-24 sm:space-y-32">
      {/* ---------- 1. Hero: the promise ---------- */}
      <Hero />

      {/* ---------- 2. Example report ---------- */}
      <section aria-labelledby="example-title" className="-mt-8 sm:-mt-16">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="example-title" className="t-label">
            example report · buying intent from 25 simulated customers
          </h2>
          <span className="t-label">{EXAMPLE_SITE}, a meal-planning app 2 days before launch</span>
        </div>
        <ProductPreview />
      </section>

      {/* ---------- 3. How a test works (torn white paper strip) ---------- */}
      <section id="how" className="paper bleed scroll-mt-24 py-24">
        <div className="page grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <p className="t-label">how a test works</p>
            <h2 className="t-h2 mt-4">One URL in. Your blockers out.</h2>
          </div>
          <ol className="border-b border-line">
            {STEPS.map((s, i) => (
              <li key={s.title} className="grid gap-2 border-t border-line py-6 sm:grid-cols-[4rem_1fr] sm:gap-4">
                <span className="t-number text-3xl text-accent">0{i + 1}</span>
                <div>
                  <p className="t-h3">{s.title}</p>
                  <p className="mt-1 text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- 4. What you get back ---------- */}
      <section aria-labelledby="insights-title">
        <p className="t-label">what you get back</p>
        <h2 id="insights-title" className="t-h2 mt-4 max-w-2xl">
          Not a vibe check. The reasons people won&apos;t buy.
        </h2>
        <dl className="mt-12 grid gap-x-12 border-t border-line sm:grid-cols-2">
          {INSIGHTS.map((it) => (
            <div key={it.title} className="border-b border-line py-6">
              <dt className="t-h3">{it.title}</dt>
              <dd className="mt-1 text-muted">{it.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ---------- 5. Honest by design: what it is / isn't ---------- */}
      <section aria-labelledby="honest-title" className="card p-6 sm:p-12">
        <p className="t-label">honest by design</p>
        <h2 id="honest-title" className="t-h2 mt-4 max-w-2xl">
          Simulated customers. Real reasons.
        </h2>
        <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-12">
          <div>
            <p className="font-medium">What it is</p>
            <ul className="mt-4 space-y-4 text-muted">
              <IsItem yes>Customers simulated from published research on how real people browse and buy.</IsItem>
              <IsItem yes>A fast signal on buying intent: would they buy, and if not, why not.</IsItem>
              <IsItem yes>Something to run before launch, and again after you fix things.</IsItem>
            </ul>
          </div>
          <div>
            <p className="font-medium">What it isn&apos;t</p>
            <ul className="mt-4 space-y-4 text-muted">
              <IsItem>Real people, real visits, or real purchases.</IsItem>
              <IsItem>A sales forecast or a promise of revenue.</IsItem>
              <IsItem>Traffic or ads for your site.</IsItem>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- 6. Pricing ---------- */}
      <section id="pricing" className="scroll-mt-24">
        <p className="t-label">pricing</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <h2 className="t-h2">Simple pricing.</h2>
          <p className="text-muted">Start free. Paid plans are coming soon.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={`card flex flex-col p-6 ${p.live ? "border-fg" : ""}`}>
              <div className="flex items-center justify-between">
                <p className="font-medium">{p.name}</p>
                {!p.live && <span className="pill">soon</span>}
              </div>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="t-number text-5xl">{p.price}</span>
                <span className="text-faint">{p.per}</span>
              </p>
              <p className="mt-2 text-sm text-muted">{p.note}</p>
              <ul className="mt-6 flex-1 space-y-2 border-t border-line pt-6 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
              {p.live ? (
                <Link href={signedIn ? "/app" : "/signup"} className="btn btn-primary mt-8 w-full">
                  Start free
                </Link>
              ) : (
                <span className="btn btn-ghost mt-8 w-full cursor-default text-faint" aria-disabled>
                  Coming soon
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---------- 7. Final CTA ---------- */}
      <section className="border-t border-line pt-16 sm:pt-24">
        <div className="grid items-end gap-8 lg:grid-cols-[3fr_2fr]">
          <div className="flex items-end gap-6">
            <h2 className="t-h1">Find your blockers before launch day.</h2>
            {/* claws scratch in when this scrolls into view */}
            <Claws delay={0.1} className="hidden h-28 w-24 shrink-0 sm:block" />
          </div>
          <div className="lg:justify-self-end">
            <UrlForm id="footer-url" />
          </div>
        </div>
      </section>
    </div>
  );
}

// One line in the "what it is / isn't" lists: a check (is) or a cross (isn't).
function IsItem({ yes, children }: { yes?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span
        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${yes ? "bg-accent text-accent-fg" : "bg-raised text-muted"}`}
        aria-label={yes ? "is" : "isn't"}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d={yes ? "M3.5 8.5l3 3 6-7" : "M4.5 4.5l7 7M11.5 4.5l-7 7"}
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-1 shrink-0 text-faint" aria-hidden>
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
