// The landing page: what Crawler is, how it works, pricing, FAQ.
// The testing tool itself lives at /app.
import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";

const STEPS = [
  { n: "01", title: "Paste your URL", text: "Crawler opens your site like a first-time visitor: landing page, pricing, signup." },
  { n: "02", title: "100 AI customers react", text: "A realistic mix (teens on phones, busy parents, skeptical founders) says yes, maybe or no, and why." },
  { n: "03", title: "Get your fixes", text: "A score, where people left, and the top 3 fixes, ranked by how many people they'd win back." },
];

const FEATURES = [
  "Research-backed customers",
  "Actually tries your product",
  "Checks real reviews online",
  "Honest numbers, counted by code",
  "Phone + laptop views",
  "Shareable scorecard (soon)",
];

const PLANS = [
  { name: "Free", price: "$0", per: "", detail: "1 test × 100 customers", cta: "Start free", live: true },
  { name: "Launch Pack", price: "$49", per: "one-time", detail: "3 tests × 1,000 customers", cta: "Coming soon", highlight: true },
  { name: "Pro", price: "$79", per: "/mo", detail: "15 × 1,000 + 2 × 10,000 customers", cta: "Coming soon" },
  { name: "Scale", price: "$249", per: "/mo", detail: "10 × 10,000 customers + ad testing", cta: "Coming soon" },
];

const FAQ = [
  {
    q: "Are the customers real people?",
    a: "No. They're AI customers built from published research on how real people browse and buy. Use the results as a strong, fast signal about what's wrong, not a guarantee of sales.",
  },
  {
    q: "What does Crawler look at?",
    a: "Only your public pages: landing page, pricing and signup. It can also try your product using a test account or a preview link, but only for products you own. It never gets around logins or captchas.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Your tests are tied to your account, and the database only lets you see your own. Test-account passwords are encrypted, and erased as soon as the test starts.",
  },
  { q: "How long does a test take?", a: "About a minute, or 2–3 minutes if the explorer also tries your product." },
];

const QUOTES = [
  "“why do I need a card for a trial?”",
  "“ok but what does it actually do”",
  "“friend sent it, signing up”",
  "“price? anyone?”",
  "“too many boxes, I'm out”",
];

export default async function Landing() {
  const user = await currentUser();
  const start = user || !AUTH_ENABLED ? "/app" : "/signup";

  return (
    <div className="space-y-20">
      {/* ---------- Hero ---------- */}
      <section className="sky rounded-3xl px-6 pb-8 pt-6 sm:px-10 sm:pb-10">
        <div className="meta flex justify-between text-white/85">
          <span>✱ crawler</span>
          <span>test before you launch</span>
        </div>
        <h1 className="display mt-12 text-[15vw] text-white sm:text-[7.5rem]">
          Will they
          <br />
          buy it?
        </h1>
        <p className="mt-6 max-w-xl text-lg text-white/95">
          Crawler sends 100 AI customers through your landing page, pricing and signup. In about a minute you get a score,
          why people left, and the 3 fixes that win the most of them back.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={start} className="rounded-full bg-slate-900 px-7 py-4 font-semibold text-white transition hover:bg-indigo-600">
            Test your site free ↗
          </Link>
          <a href="#how" className="rounded-full bg-white/90 px-7 py-4 font-semibold text-slate-900 transition hover:bg-white">
            How it works
          </a>
        </div>
        <div className="meta mt-10 flex justify-between text-white/80">
          <span>1 free test · no card</span>
          <span>~1 minute</span>
        </div>
      </section>

      {/* ---------- What customers say (example quotes) ---------- */}
      <div className="flex flex-wrap justify-center gap-2">
        {QUOTES.map((q) => (
          <span key={q} className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-600">
            {q}
          </span>
        ))}
      </div>

      {/* ---------- 01. How it works ---------- */}
      <Block id="how" n="01" title="How it works">
        <div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n}>
              <p className="display text-6xl">{s.n}.</p>
              <p className="mt-3 text-lg font-semibold">{s.title}</p>
              <p className="mt-1 text-slate-600">{s.text}</p>
            </div>
          ))}
        </div>
      </Block>

      {/* ---------- 02. Example report ---------- */}
      <Block n="02" title="What you get">
        <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
          <div className="sky rounded-3xl p-6">
            <p className="meta text-white/85">example report</p>
            <p className="display mt-6 text-white">
              <span className="text-8xl">9</span>
              <span className="text-4xl text-white/70">/100</span>
            </p>
            <p className="display mt-1 text-2xl text-white">would join the waitlist</p>
            <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              <div className="w-[9%] rounded-full bg-indigo-600" />
              <div className="w-[27%] rounded-full bg-white" />
              <div className="flex-1 rounded-full bg-white/35" />
            </div>
            <p className="mt-4 text-sm text-white/95">Visitors can&apos;t see what it builds before giving an email.</p>
          </div>
          <ol className="border-t border-slate-900">
            {[
              ["Let people try it before the waitlist", "+9 maybes"],
              ["Make the waitlist one field", "+6 maybes"],
              ["Show the price up front", "+5 maybes"],
            ].map(([title, win], i) => (
              <li key={title} className="flex items-baseline gap-4 border-b border-slate-200 py-5">
                <span className="display text-4xl">0{i + 1}.</span>
                <span className="flex-1 font-semibold">{title}</span>
                <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">{win}</span>
              </li>
            ))}
          </ol>
        </div>
      </Block>

      {/* ---------- 03. Inside ---------- */}
      <Block n="03" title="What's inside">
        <ul className="grid sm:grid-cols-2 sm:gap-x-10">
          {FEATURES.map((f, i) => (
            <li key={f} className="flex items-baseline gap-4 border-b border-slate-200 py-4">
              <span className="display w-14 text-3xl">0{i + 1}.</span>
              <span className="meta text-sm text-slate-900">{f}</span>
            </li>
          ))}
        </ul>
      </Block>

      {/* ---------- 04. Pricing ---------- */}
      <Block id="pricing" n="04" title="Pricing">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`flex flex-col rounded-3xl p-6 ${p.highlight ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white"}`}
            >
              <p className={`meta ${p.highlight ? "text-white/80" : "text-slate-400"}`}>{p.name}</p>
              <p className="display mt-4 text-5xl">
                {p.price}
                <span className="text-lg font-semibold normal-case tracking-normal">{p.per}</span>
              </p>
              <p className={`mt-2 flex-1 text-sm ${p.highlight ? "text-white/90" : "text-slate-600"}`}>{p.detail}</p>
              {p.live ? (
                <Link href={start} className="mt-6 rounded-full bg-slate-900 px-5 py-3 text-center font-semibold text-white hover:bg-indigo-600">
                  {p.cta} ↗
                </Link>
              ) : (
                <span
                  className={`mt-6 rounded-full px-5 py-3 text-center text-sm font-semibold ${
                    p.highlight ? "bg-white/15 text-white" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {p.cta}
                </span>
              )}
            </div>
          ))}
        </div>
      </Block>

      {/* ---------- 05. FAQ ---------- */}
      <Block n="05" title="Questions">
        <div>
          {FAQ.map((f) => (
            <details key={f.q} className="group border-b border-slate-200">
              <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-lg font-semibold">
                {f.q}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300 text-sm transition group-open:rotate-45 group-open:bg-slate-900 group-open:text-white">
                  +
                </span>
              </summary>
              <p className="pb-5 text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </Block>

      {/* ---------- Final call to action ---------- */}
      <section className="sky rounded-3xl px-6 py-12 text-center sm:px-10">
        <p className="display text-5xl text-white sm:text-7xl">Your first test is free.</p>
        <Link href={start} className="mt-8 inline-block rounded-full bg-slate-900 px-8 py-4 font-semibold text-white transition hover:bg-indigo-600">
          Test your site ↗
        </Link>
      </section>

      <footer className="meta flex justify-between border-t border-slate-200 pt-6 text-slate-400">
        <span>✱ crawler</span>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}

// A section: big all-caps title, a small (01) label, and a thin line under it.
function Block({ id, n, title, children }: { id?: string; n: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-6">
      <div className="flex items-end justify-between gap-3 border-b border-slate-900 pb-3">
        <h2 className="display text-4xl sm:text-5xl">{title}</h2>
        <span className="meta pb-1 text-slate-400">({n})</span>
      </div>
      {children}
    </section>
  );
}
