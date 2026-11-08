// The home page's scroll section: every feature, one at a time, on white paper
// with blue text and blue claw scratches. Each block slowly rises into view
// as you scroll (<Reveal>). All examples are made up and labeled as examples.
import Link from "next/link";
import Reveal from "../Reveal";
import Claws from "../Claws";
import { Arrow } from "./UrlForm";

const BLUE = "#1a2aa6";

type Feature = { n: string; title: string; text: string; visual: React.ReactNode };

const FEATURES: Feature[] = [
  {
    n: "01",
    title: "Paste one link.",
    text: "Crawler opens your landing page, finds your pricing and signup, and reads them like a first-time visitor.",
    visual: <LinkVisual />,
  },
  {
    n: "02",
    title: "100 customers walk in.",
    text: "Simulated people with different ages, budgets, devices and patience. Each one decides: buy, maybe, or leave.",
    visual: <CrowdVisual />,
  },
  {
    n: "03",
    title: "It actually tries your product.",
    text: "An AI explorer clicks, types and scrolls through your app like a new user, and notes where it gets stuck.",
    visual: <ExplorerVisual />,
  },
  {
    n: "04",
    title: "See what stopped them.",
    text: "Every “no” comes with a reason. They’re grouped, counted, and tied to the step where people gave up.",
    visual: <BlockersVisual />,
  },
  {
    n: "05",
    title: "Fixes, ranked.",
    text: "The changes that would win back the most people, in order, with rewritten copy you can paste in.",
    visual: <FixesVisual />,
  },
  {
    n: "06",
    title: "What people say online.",
    text: "Optionally pulls real reviews from Reddit, app stores and review sites into the verdict.",
    visual: <ReviewsVisual />,
  },
];

export default function Features() {
  return (
    <section id="features" className="paper features bleed scroll-mt-16 overflow-x-clip py-24 sm:py-32">
      <div className="page space-y-32 sm:space-y-48">
        {FEATURES.map((f, i) => (
          <article key={f.n} className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
            <Reveal className={i % 2 ? "md:order-2" : ""}>
              <p className="t-label">{f.n} —</p>
              <h2 className="t-chunk mt-4">{f.title}</h2>
              <p className="t-lead mt-6 max-w-md">{f.text}</p>
            </Reveal>
            <Reveal delay={150} className="relative">
              {/* blue claw scratches behind every other picture */}
              {i % 2 === 0 && (
                <Claws color={BLUE} className="pointer-events-none absolute right-0 -top-12 -z-0 h-48 w-40 opacity-[0.12] sm:-right-6" />
              )}
              <div className="relative">{f.visual}</div>
            </Reveal>
          </article>
        ))}

        {/* honest note + the one button */}
        <Reveal className="relative mx-auto max-w-3xl text-center">
          <Claws color={BLUE} className="mx-auto mb-8 h-32 w-28" />
          <h2 className="t-chunk">Simulated customers. Real reasons.</h2>
          <p className="t-lead mx-auto mt-6 max-w-xl">
            Crawler shows buying intent from simulated customers, not real purchases. A fast, honest signal on what to fix
            before launch day.
          </p>
          <Link href="/onboarding" className="btn btn-primary mt-10 h-14 px-8 text-base">
            Test my site
            <Arrow />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

// ---------- the little pictures (all made-up examples) ----------

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="card-raised p-6 sm:p-8">
      <p className="t-label mb-6">{label}</p>
      {children}
    </div>
  );
}

function CheckDot({ ok = true }: { ok?: boolean }) {
  return (
    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ok ? "bg-accent text-white" : "bg-raised text-faint"}`} aria-hidden>
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
        <path d={ok ? "M3.5 8.5l3 3 6-7" : "M4.5 4.5l7 7M11.5 4.5l-7 7"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function LinkVisual() {
  return (
    <Frame label="example">
      <div className="field flex items-center text-sm">
        <span className="field-prefix mr-1 font-mono text-xs">https://</span>mealmate.app
      </div>
      <ul className="mt-6 grid grid-cols-3 gap-2 text-sm">
        {["Landing", "Pricing", "Signup"].map((p) => (
          <li key={p} className="rounded-lg border border-line p-4">
            <div className="mb-4 space-y-1.5" aria-hidden>
              <span className="block h-1.5 w-3/4 rounded bg-accent" />
              <span className="block h-1.5 w-1/2 rounded bg-raised" />
              <span className="block h-1.5 w-2/3 rounded bg-raised" />
            </div>
            <span className="flex items-center gap-2">
              <CheckDot /> {p}
            </span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

function CrowdVisual() {
  // 100 dots: 38 buy, 22 maybe, 40 no
  const dots = Array.from({ length: 100 }, (_, i) => (i < 38 ? "buy" : i < 60 ? "maybe" : "no"));
  return (
    <Frame label="example · 100 simulated customers">
      <div className="grid grid-cols-10 gap-2" role="img" aria-label="38 would buy, 22 maybe, 40 no">
        {dots.map((d, i) => (
          <span
            key={i}
            className={`aspect-square rounded-full ${d === "buy" ? "bg-accent" : d === "maybe" ? "bg-[#9aa6e6]" : "border border-line-strong"}`}
          />
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-accent" /> 38 buy</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#9aa6e6]" /> 22 maybe</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full border border-line-strong" /> 40 no</span>
      </div>
    </Frame>
  );
}

function ExplorerVisual() {
  const steps: [string, boolean][] = [
    ["Opened the app", true],
    ["Typed a meal plan request", true],
    ["Clicked “Generate week”", true],
    ["Hit a paywall before seeing results", false],
  ];
  return (
    <Frame label="example · explorer, 4 steps · 21s">
      <ol className="space-y-4">
        {steps.map(([s, ok], i) => (
          <li key={s} className="flex items-center gap-4 text-sm">
            <span className="t-label w-4">{i + 1}</span>
            <CheckDot ok={ok} />
            <span className={ok ? "" : "font-medium"}>{s}</span>
          </li>
        ))}
      </ol>
    </Frame>
  );
}

function BlockersVisual() {
  const rows: [string, number][] = [
    ["Price hidden until signup", 34],
    ["Not sure it's trustworthy", 22],
    ["Unclear what it does", 18],
    ["Signup asks too much", 12],
  ];
  return (
    <Frame label="example · why people said no">
      <ul className="space-y-6">
        {rows.map(([r, pct]) => (
          <li key={r}>
            <div className="flex justify-between gap-4 text-sm">
              <span>{r}</span>
              <span className="tabular-nums text-muted">{pct}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-raised">
              <div className="h-2 rounded-full bg-accent" style={{ width: `${pct * 2.4}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

function FixesVisual() {
  const fixes: [string, number][] = [
    ["Show the price on the homepage", 11],
    ["Add a free week, no card", 7],
    ["Cut signup to email only", 4],
  ];
  return (
    <Frame label="example · fix these first">
      <ol className="divide-y divide-line">
        {fixes.map(([f, n], i) => (
          <li key={f} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
            <span className="t-label">0{i + 1}</span>
            <span className="flex-1 font-medium">{f}</span>
            <span className="t-number text-2xl">+{n}</span>
          </li>
        ))}
      </ol>
    </Frame>
  );
}

function ReviewsVisual() {
  const reviews: [string, string][] = [
    ["Reddit", "“Love the recipes, but the price isn't clear.”"],
    ["App Store", "“Great idea, onboarding was confusing.”"],
    ["Review site", "“Saved me hours of planning every week.”"],
  ];
  return (
    <Frame label="example · what people say online">
      <ul className="space-y-4">
        {reviews.map(([src, q]) => (
          <li key={src} className="rounded-lg border border-line p-4 text-sm">
            <p className="t-label">{src}</p>
            <p className="mt-1">{q}</p>
          </li>
        ))}
      </ul>
    </Frame>
  );
}
