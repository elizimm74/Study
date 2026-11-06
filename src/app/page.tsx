// The landing page. The URL box here sends you straight into the app
// (or to sign up first, then into the app with your URL already filled in).
// Look v3: the gray Canva deck (fog, hairline labels, hexagons) + Fastlane (dots, glowing button, badges, devices).
import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import CrawlerSwarm from "@/components/CrawlerSwarm";

// Honest "badge cards" (Fastlane shows awards here; we show true facts instead).
const BADGES = [
  { icon: "✱", top: "customers", bottom: "Built from published research" },
  { icon: "¢", top: "cost", bottom: "About 5¢ a test" },
  { icon: "=", top: "scores", bottom: "Counted by code, not guessed" },
];

const STEPS = [
  { n: "01", title: "Paste your URL", text: "Crawler opens your site like a first-time visitor: landing page → pricing → signup." },
  { n: "02", title: "100 AI customers react", text: "Teens on phones, busy parents, skeptical founders. Each one says yes, maybe or no, and why." },
  { n: "03", title: "Ship the fixes", text: "A score, where people bounced, and the top 3 fixes ranked by how many people they'd win back." },
];

const PLANS = [
  { name: "Free", price: "$0", per: "", detail: "1 test · 100 customers", cta: "Start free", live: true },
  { name: "Launch Pack", price: "$49", per: "once", detail: "3 tests · 1,000 customers each", cta: "Coming soon", highlight: true },
  { name: "Pro", price: "$79", per: "/mo", detail: "15 × 1,000 + 2 × 10,000 customers", cta: "Coming soon" },
  { name: "Scale", price: "$249", per: "/mo", detail: "10 × 10,000 customers + ad testing", cta: "Coming soon" },
];

const FAQ = [
  {
    q: "Are the customers real people?",
    a: "No. They're AI customers built from published research on how real people browse and buy. Treat the results as a fast, honest signal about what's broken, not a guarantee of sales.",
  },
  {
    q: "What does Crawler look at?",
    a: "Your public pages: landing page, pricing and signup. It can also try your product with a test account or preview link, but only for products you own. It never gets around logins or captchas.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Your tests are tied to your account, and the database only lets you see your own. Test-account passwords are encrypted and erased as soon as the test starts.",
  },
  { q: "How long does it take?", a: "About a minute, or 2–3 minutes if the explorer also tries your product." },
];

export default async function Landing() {
  const user = await currentUser();
  const signedIn = Boolean(user) || !AUTH_ENABLED;

  return (
    <div className="space-y-28">
      {/* ---------- Hero ---------- */}
      <section className="relative pt-2 text-center">
        <Hexagons />
        {/* The deck's thin top line with tiny labels at each end. */}
        <div className="meta flex items-center gap-4 text-slate-500">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shadow-[0_0_8px_2px_rgba(52,72,245,0.6)]" /> beta · first test free
          </span>
          <span className="rule" />
          <span className="hidden sm:inline">made for indie hackers</span>
        </div>

        <h1 className="display mx-auto mt-12 max-w-5xl text-[12.5vw] text-slate-800 sm:text-6xl md:text-[4.6rem]">
          Find out why they <span className="glow-text">won&apos;t buy.</span>
          <br />
          Before launch.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600">
          Paste your site. 100 AI customers click through your landing page, pricing and signup, then tell you exactly
          what&apos;s stopping them.
        </p>

        {/* URL box: straight into the product */}
        {/* Goes to /app?url=... ; signed-out visitors are sent to sign up first, and the URL comes along. */}
        <form action="/app" method="get" className="card mx-auto mt-9 flex max-w-xl items-center gap-2 rounded-full p-1.5 pl-5">
          <span className="meta text-slate-400">https://</span>
          <input
            name="url"
            placeholder="yourstartup.com"
            className="min-w-0 flex-1 bg-transparent py-2.5 outline-none placeholder:text-slate-400"
            required
          />
          <button className="btn px-5 py-2.5 text-sm">Test it free →</button>
        </form>
        <p className="meta mt-3 text-slate-500">no card · ~60 seconds</p>

        <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
          {BADGES.map((b) => (
            <div key={b.top} className="card flex items-center gap-3 rounded-2xl px-4 py-2.5 text-left">
              <span className="display w-5 text-center text-xl text-indigo-600">{b.icon}</span>
              <span>
                <span className="meta block text-slate-400">{b.top}</span>
                <span className="text-sm font-semibold text-slate-800">{b.bottom}</span>
              </span>
            </div>
          ))}
        </div>

        {/* The swarm: AI customers tied by strings to a website */}
        <div className="-mx-4 mt-10 sm:mx-0">
          <CrawlerSwarm />
        </div>
      </section>

      {/* ---------- Product preview: a laptop window (the run) + a phone (the report) ---------- */}
      <section className="relative md:pb-14">
        {/* the blue glow behind the devices */}
        <div className="absolute inset-x-10 top-10 -z-10 h-3/4 rounded-full bg-indigo-500/40 blur-[90px]" />
        <div className="panel overflow-hidden rounded-3xl p-2 md:mr-44">
          <div className="flex items-center gap-1.5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="meta ml-3 truncate text-white/40">crawler · run #a1b2c3 · shipfast.studio</span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 font-mono text-[13px] leading-7 text-white/70 md:pr-40">
            <p>
              <span className="text-sky-400">→</span> opened landing page <span className="text-white/30">1.2s</span>
            </p>
            <p>
              <span className="text-sky-400">→</span> found pricing via &quot;Plans&quot; button <span className="text-white/30">2.8s</span>
            </p>
            <p>
              <span className="text-sky-400">→</span> waitlist opens in a pop-up (2 fields)
            </p>
            <p>
              <span className="text-sky-400">→</span> 100 customers reviewing… <span className="text-white">████████</span> 100%
            </p>
            <p className="text-white">
              <span className="text-indigo-400">✱</span> P017, 16, student: <span className="text-white/60">&quot;ok but what does it actually build?&quot;</span>
            </p>
            <p className="text-white">
              <span className="text-indigo-400">✱</span> P042, 31, founder: <span className="text-white/60">&quot;friend sent it, joining.&quot;</span>
            </p>
            <p>
              <span className="text-emerald-400">✓</span> report ready · <span className="text-white">4.7¢</span>
            </p>
          </div>
        </div>

        {/* Phone mockup showing the report */}
        <div className="relative mx-auto -mt-6 w-64 rounded-[2.4rem] border border-white/70 bg-slate-800 p-2 shadow-[0_40px_80px_-20px_rgba(52,72,245,0.65)] md:absolute md:-top-10 md:right-0 md:mt-0">
          <div className="rounded-[2rem] bg-slate-50 px-4 pb-5 pt-3">
            <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-slate-300" />
            <p className="meta text-slate-400">{"//"} score</p>
            <p className="display mt-1 text-slate-800">
              <span className="text-6xl">9</span>
              <span className="text-2xl text-slate-400">/100</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">would join the waitlist</p>
            <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full">
              <div className="w-[9%] rounded-full bg-indigo-600" />
              <div className="w-[27%] rounded-full bg-sky-300" />
              <div className="flex-1 rounded-full bg-slate-200" />
            </div>
            <p className="meta mt-5 text-slate-400">{"//"} fix first</p>
            <p className="mt-1 font-semibold leading-snug text-slate-800">Let people try it before the waitlist</p>
            <span className="meta mt-2 inline-block rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-700">+9 of 27 maybes</span>
            <p className="mt-4 rounded-xl bg-white p-3 text-sm text-slate-600">
              &quot;ok but what does it actually build?&quot;
              <span className="meta mt-1 block text-slate-400">P017 · 16 · phone</span>
            </p>
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <Section id="how" n="01" label="how it works" title="Three steps. One minute.">
        <div className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card p-6">
              <p className="meta text-indigo-600">{s.n} —</p>
              <p className="mt-6 text-xl font-semibold tracking-tight">{s.title}</p>
              <p className="mt-2 text-slate-600">{s.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- Bento: what's inside ---------- */}
      <Section n="02" label="what's inside" title="Not a vibe check. A test.">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="panel rounded-[1.25rem] p-6 md:col-span-2">
            <p className="meta text-white/40">research-backed customers</p>
            <p className="mt-3 max-w-md text-2xl font-semibold tracking-tight">
              Built from real studies on how people browse, from 10-second attention spans to teens with no credit card.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["16 · student · phone", "34 · nurse · tight budget", "28 · founder · skeptical", "45 · owner · busy"].map((p) => (
                <span key={p} className="meta rounded-full border border-white/15 px-3 py-1.5 text-white/70">
                  {p}
                </span>
              ))}
            </div>
          </div>
          <Bento title="Actually tries your product" text="An AI explorer clicks, types and scrolls like a first-time user. You can watch it live." />
          <Bento title="Honest math" text="Scores are counted by code, not guessed by AI. Each fix shows how many real 'maybes' it wins." />
          <Bento title="Checks real reviews" text="Pulls what people say on Reddit, app stores and review sites into the verdict." />
          <Bento title="Phone + laptop" text="Customers on phones see your mobile layout. Most of Gen Z will." />
        </div>
      </Section>

      {/* ---------- Pricing ---------- */}
      <Section id="pricing" n="03" label="pricing" title="Start free. Pay when you launch.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div key={p.name} className={`flex flex-col rounded-[1.25rem] p-6 ${p.highlight ? "panel" : "card"}`}>
              <p className={`meta ${p.highlight ? "text-white/50" : "text-slate-500"}`}>{p.name}</p>
              <p className="display mt-4 text-5xl">
                {p.price}
                <span className={`ml-1 text-base font-medium tracking-normal ${p.highlight ? "text-white/50" : "text-slate-400"}`}>{p.per}</span>
              </p>
              <p className={`mt-2 flex-1 text-sm ${p.highlight ? "text-white/70" : "text-slate-600"}`}>{p.detail}</p>
              {p.live ? (
                <Link href={signedIn ? "/app" : "/signup"} className="btn mt-6 py-2.5 text-center text-sm">
                  {p.cta} →
                </Link>
              ) : (
                <span className={`mt-6 rounded-full py-2.5 text-center text-sm font-medium ${p.highlight ? "bg-white/10 text-white/60" : "bg-slate-200/70 text-slate-500"}`}>
                  {p.cta}
                </span>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- FAQ ---------- */}
      <Section n="04" label="faq" title="Questions.">
        <div className="card divide-y divide-slate-300/60 px-6">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-semibold">
                {f.q}
                <span className="text-slate-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="pb-5 text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* ---------- Final CTA ---------- */}
      <section className="panel rounded-3xl px-6 py-16 text-center">
        <p className="display text-5xl sm:text-6xl">Launch with receipts.</p>
        <p className="mx-auto mt-4 max-w-md text-white/60">Know what 100 customers think before you post on X.</p>
        <Link href={signedIn ? "/app" : "/signup"} className="btn mt-8 inline-block px-7 py-3">
          Run your free test →
        </Link>
      </section>

      <footer className="meta flex justify-between border-t border-slate-300 pt-6 text-slate-500">
        <span>✱ crawler</span>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}

// A section with the deck-style header: "// label ———— (01)", then a big headline.
function Section({ id, n, label, title, children }: { id?: string; n: string; label: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-8">
      <div>
        <div className="meta flex items-center gap-4 text-slate-500">
          <span className="text-indigo-600">
            {"//"} {label}
          </span>
          <span className="rule" />
          <span>({n})</span>
        </div>
        <h2 className="display mt-6 text-4xl text-slate-800 sm:text-6xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Bento({ title, text }: { title: string; text: string }) {
  return (
    <div className="card p-6">
      <p className="text-lg font-semibold tracking-tight">{title}</p>
      <p className="mt-2 text-slate-600">{text}</p>
    </div>
  );
}

// Faint hexagon outlines in the corner, like the gray deck. Pure decoration.
function Hexagons() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute -left-28 top-44 -z-10 hidden h-80 w-80 text-slate-400/50 md:block"
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d="M100 10 178 55v90L100 190 22 145V55z" />
      <path d="M100 40 152 70v60l-52 30-52-30V70z" />
      <path d="M100 40v60m0 0 52 30M100 100l-52 30" />
    </svg>
  );
}
