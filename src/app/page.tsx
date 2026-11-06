// The landing page: hero → example result → how it works → share card → pricing → final CTA.
// Design rules live in globals.css (one accent, two font weights, a fixed spacing scale).
import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import ProductPreview from "@/components/landing/ProductPreview";
import Hero from "@/components/landing/Hero";
import AnalysisFlow from "@/components/landing/AnalysisFlow";
import UrlForm from "@/components/landing/UrlForm";
import { EXAMPLE_SITE } from "@/components/landing/example";

const STEPS = [
  { title: "Paste your URL", text: "We open your landing page, pricing and signup like a first-time visitor would." },
  { title: "25 AI customers react", text: "Students on phones, busy parents, skeptical founders. Each one says buy, maybe or no, and why." },
  { title: "Fix what matters", text: "Get a score, where people dropped off, and fixes ranked by how many customers they win back." },
];

// Placeholder plans: payments aren't built yet, so only Free can be used today.
const PLANS = [
  { name: "Free", price: "$0", per: "", note: "Your first launch.", features: ["1 test", "25 AI customers", "Full report with ranked fixes"], live: true },
  {
    name: "Pro",
    price: "$29",
    per: "/mo",
    note: "For founders who ship every week.",
    features: ["20 tests a month", "100 AI customers per test", "An AI explorer tries your product", "Checks Reddit and review sites"],
  },
  {
    name: "Studio",
    price: "$99",
    per: "/mo",
    note: "For small teams and agencies.",
    features: ["100 tests a month", "1,000 AI customers per test", "Everything in Pro", "Priority queue"],
  },
];

export default async function Landing() {
  const user = await currentUser();
  const signedIn = Boolean(user) || !AUTH_ENABLED;

  return (
    <div className="space-y-24 sm:space-y-32">
      {/* ---------- 1. Hero ---------- */}
      <Hero />

      {/* ---------- 2. Example result (the main visual) ---------- */}
      <section aria-labelledby="example-title" className="-mt-8 sm:-mt-16">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 id="example-title" className="t-label">
            example report · {EXAMPLE_SITE}
          </h2>
          <span className="t-label hidden sm:block">a meal-planning app, 2 days before launch</span>
        </div>
        <ProductPreview />
      </section>

      {/* ---------- 2b. Customers flow into the site, with checks ---------- */}
      <AnalysisFlow />

      {/* ---------- 3. How it works ---------- */}
      <section id="how" className="grid scroll-mt-24 gap-8 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <div>
          <p className="t-label">how it works</p>
          <h2 className="t-h2 mt-4">Three steps. Two minutes.</h2>
        </div>
        <ol className="border-b border-line">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid gap-2 border-t border-line py-6 sm:grid-cols-[4rem_1fr] sm:gap-4">
              <span className="t-label pt-1">0{i + 1}</span>
              <div>
                <p className="t-h3">{s.title}</p>
                <p className="mt-1 text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- 4. Share card, as it would look in a post ---------- */}
      <section className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="max-w-md">
          <p className="t-label">
            share it <span className="pill ml-2">coming soon</span>
          </p>
          <h2 className="t-h2 mt-4">Built to be posted.</h2>
          <p className="t-lead mt-4">
            Every report will come with a scorecard sized for X. Post it before launch, then post the re-test after you fix
            things.
          </p>
        </div>
        <SharePost />
      </section>

      {/* ---------- 5. Pricing ---------- */}
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

      {/* ---------- 6. Final CTA ---------- */}
      <section className="border-t border-line pt-16 sm:pt-24">
        <div className="grid items-end gap-8 lg:grid-cols-2">
          <h2 className="t-h1">Know before you launch.</h2>
          <div className="lg:justify-self-end">
            <UrlForm id="footer-url" />
          </div>
        </div>
      </section>
    </div>
  );
}

// A post as it might look on X: the founder's words + the scorecard image.
// The scorecard is always dark (that's how the image would be exported).
function SharePost() {
  return (
    <figure className="card-raised mx-auto w-full max-w-lg p-6" aria-label="Example post with a scorecard">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-raised text-sm font-medium text-muted" aria-hidden>
          D
        </span>
        <div className="text-sm leading-tight">
          <p className="font-medium">Dana Kim</p>
          <p className="text-faint">@danabuilds · 2h</p>
        </div>
      </div>
      <blockquote className="mt-4 space-y-2 text-[15px]">
        <p>ran {EXAMPLE_SITE.split(".")[0]} past 25 ai customers before launch.</p>
        <p>12 would buy. the #1 reason the rest didn&apos;t: you can&apos;t see the price until you sign up.</p>
        <p>fixing that tonight.</p>
      </blockquote>
      {/* The scorecard image */}
      <div className="mt-4 aspect-[1.91/1] rounded-xl border border-[#232326] bg-[#0a0a0a] p-6 text-[#fafafa]" role="img" aria-label="Scorecard: 12 of 25 would buy. Biggest blocker: price hidden until signup.">
        <div className="flex h-full flex-col">
          <div className="flex justify-between font-mono text-xs text-[#8b8b94]">
            <span>
              <span className="text-[#3448f5]">✱</span> crawler
            </span>
            <span>{EXAMPLE_SITE}</span>
          </div>
          <div className="mt-auto">
            <p className="flex items-end gap-2">
              <span className="t-number text-6xl text-[#3448f5] sm:text-7xl">12</span>
              <span className="t-number pb-1 text-2xl text-[#8b8b94]">/25</span>
              <span className="pb-1 text-sm">would buy</span>
            </p>
            <div className="mt-4 flex h-1.5 gap-1" aria-hidden>
              <span className="w-[48%] rounded-full bg-[#3448f5]" />
              <span className="w-[24%] rounded-full bg-[#fafafa]" />
              <span className="flex-1 rounded-full bg-[#303035]" />
            </div>
            <p className="mt-4 font-mono text-xs text-[#a1a1aa]">biggest blocker: price hidden until signup</p>
          </div>
        </div>
      </div>
    </figure>
  );
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-1 shrink-0 text-faint" aria-hidden>
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
