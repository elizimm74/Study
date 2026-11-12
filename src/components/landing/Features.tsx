// The home page's scroll section: a white sheet that slides up over the blue
// "crawler" screen, then every feature one at a time with blue text, big blue
// numbers, and every other picture on a solid blue card. A blue stats band
// runs across the middle. Each block slowly rises into view as you scroll
// (<Reveal>). All examples are made up and labeled as examples.
import Link from "next/link";
import Reveal from "../Reveal";
import Faq from "./Faq";
import Manifesto from "./motion/Manifesto";
import PinnedSteps from "./motion/PinnedSteps";
import ScrollMarquee from "./motion/ScrollMarquee";
import SplitReveal from "./motion/SplitReveal";
import CountUp from "./motion/CountUp";
import Magnetic from "./motion/Magnetic";
import Claws from "../Claws";
import { Arrow } from "./UrlForm";

const BLUE = "#1a2aa6";

type Feature = { n: string; title: string; text: string; visual: (blue: boolean) => React.ReactNode };

const FEATURES: Feature[] = [
  {
    n: "01",
    title: "Paste one link.",
    text: "Crawler opens your landing page, finds your pricing and signup, and reads them like a first-time visitor.",
    visual: (blue) => <LinkVisual blue={blue} />,
  },
  {
    n: "02",
    title: "100 customers walk in.",
    text: "Simulated people with different ages, budgets, devices and patience. Each one decides: buy, maybe, or leave.",
    visual: (blue) => <CrowdVisual blue={blue} />,
  },
  {
    n: "03",
    title: "It actually tries your product.",
    text: "An AI explorer clicks, types and scrolls through your app like a new user, and notes where it gets stuck.",
    visual: (blue) => <ExplorerVisual blue={blue} />,
  },
  {
    n: "04",
    title: "See what stopped them.",
    text: "Every “no” comes with a reason. They’re grouped, counted, and tied to the step where people gave up.",
    visual: (blue) => <BlockersVisual blue={blue} />,
  },
  {
    n: "05",
    title: "Fixes, ranked.",
    text: "The changes that would win back the most people, in order, with rewritten copy you can paste in.",
    visual: (blue) => <FixesVisual blue={blue} />,
  },
  {
    n: "06",
    title: "What people say online.",
    text: "Optionally pulls real reviews from Reddit, app stores and review sites into the verdict.",
    visual: (blue) => <ReviewsVisual blue={blue} />,
  },
  {
    n: "07",
    title: "Apps too.",
    text: "Drop in your onboarding and paywall screenshots. See which screen loses people, check App Store rules, and A/B test two paywalls on the same customers.",
    visual: (blue) => <AppVisual blue={blue} />,
  },
];

export default function Features() {
  // Steps 01-05 become the pinned story; 06-07 stay as normal blocks below it.
  const story = FEATURES.slice(0, 5).map((f, i) => ({ n: f.n, title: f.title, text: f.text, visual: f.visual(i % 2 === 1) }));
  const rest = FEATURES.slice(5);
  return (
    // relative z-10: paints OVER the sticky blue screen. The shadow sits on the torn top edge.
    <section id="features" className="paper features bleed sheet relative z-10 scroll-mt-16 space-y-24 overflow-x-clip py-24 sm:space-y-32 sm:py-32">
      {/* 1. a statement that lights up word by word as you scroll */}
      <div className="page">
        <Manifesto
          className="text-center"
          text="Most launches fail quietly. Nobody tells you *why*. Crawler sends 100 simulated customers in first, and they tell you *everything*."
        />
      </div>

      {/* 2. the pinned story: the stage stays, the picture changes as you scroll */}
      <div className="page">
        <PinnedSteps steps={story} />
      </div>

      {/* 3. giant words that speed up when you scroll */}
      <ScrollMarquee
        label="Common reasons people don't buy"
        items={["Price hidden", "No proof", "Too many fields", "Unclear promise", "Card required", "No close button"]}
      />

      <div className="page space-y-32 sm:space-y-48">
        <StatsBand />
        {rest.map((f, i) => (
          <article key={f.n} className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
            <Reveal className={i % 2 ? "md:order-2" : ""}>
              <p className="t-number text-6xl text-accent sm:text-7xl" aria-hidden>
                {f.n}
              </p>
              <SplitReveal text={f.title} className="t-chunk mt-4" />
              <p className="t-lead mt-6 max-w-md">{f.text}</p>
            </Reveal>
            <Reveal delay={150} className="relative">
              {/* blue claw scratches behind every other picture */}
              {i % 2 === 0 && (
                <Claws color={BLUE} className="pointer-events-none absolute right-0 -top-12 -z-0 h-48 w-40 opacity-[0.12] sm:-right-6" />
              )}
              <div className="relative">{f.visual(i % 2 === 0)}</div>
            </Reveal>
          </article>
        ))}

        {/* honest note + the buttons */}
        <Reveal className="relative mx-auto max-w-3xl text-center">
          <Claws color={BLUE} className="mx-auto mb-8 h-32 w-28" />
          <SplitReveal text="Simulated customers. Real reasons." className="t-chunk" />
          <p className="t-lead mx-auto mt-6 max-w-xl">
            Crawler shows buying intent from simulated customers, not real purchases. A fast, honest signal on what to fix
            before launch day.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Magnetic>
              <Link href="/onboarding" className="btn btn-primary h-14 px-8 text-base">
                Test my product free
                <Arrow />
              </Link>
            </Magnetic>
            <Link href="/example" className="btn btn-secondary h-14 px-8 text-base">
              See an example report
            </Link>
          </div>
        </Reveal>

        <Faq />
      </div>
    </section>
  );
}

// A full-width blue band across the white sheet, with torn edges.
function StatsBand() {
  const stats: [number, string][] = [
    [100, "simulated customers per test"],
    [3, "crowds per app test, for an honest range"],
    [0, "credit cards needed to try it"],
  ];
  return (
    <Reveal>
      <div className="blue-band bleed py-24 text-white sm:py-32">
        <div className="page grid gap-12 sm:grid-cols-3">
          {stats.map(([n, label]) => (
            <div key={label}>
              {/* inline size: .t-wordmark sets its own (much bigger) size */}
              <p className="t-wordmark" style={{ fontSize: "clamp(4.5rem, 9vw, 8rem)" }}>
                <CountUp to={n} />
              </p>
              <p className="mt-4 max-w-[16rem] text-lg text-[#d6dbff]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

// ---------- the little pictures (all made-up examples) ----------

function Frame({ children, label, blue }: { children: React.ReactNode; label: string; blue: boolean }) {
  return (
    <div className={`${blue ? "card-blue" : "card-raised"} p-6 sm:p-8`}>
      <p className="t-label mb-6">{label}</p>
      {children}
    </div>
  );
}

function CheckDot({ ok = true }: { ok?: boolean }) {
  return (
    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ok ? "bg-accent text-accent-fg" : "bg-raised text-faint"}`} aria-hidden>
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
        <path d={ok ? "M3.5 8.5l3 3 6-7" : "M4.5 4.5l7 7M11.5 4.5l-7 7"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function LinkVisual({ blue }: { blue: boolean }) {
  return (
     <Frame blue={blue} label="example">
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

function CrowdVisual({ blue }: { blue: boolean }) {
  // 100 dots: 38 buy, 22 maybe, 40 no
  const dots = Array.from({ length: 100 }, (_, i) => (i < 38 ? "buy" : i < 60 ? "maybe" : "no"));
  return (
     <Frame blue={blue} label="example · 100 simulated customers">
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

function ExplorerVisual({ blue }: { blue: boolean }) {
  const steps: [string, boolean][] = [
    ["Opened the app", true],
    ["Typed a meal plan request", true],
    ["Clicked “Generate week”", true],
    ["Hit a paywall before seeing results", false],
  ];
  return (
     <Frame blue={blue} label="example · explorer, 4 steps · 21s">
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

function BlockersVisual({ blue }: { blue: boolean }) {
  const rows: [string, number][] = [
    ["Price hidden until signup", 34],
    ["Not sure it's trustworthy", 22],
    ["Unclear what it does", 18],
    ["Signup asks too much", 12],
  ];
  return (
     <Frame blue={blue} label="example · why people said no">
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

function FixesVisual({ blue }: { blue: boolean }) {
  const fixes: [string, number][] = [
    ["Show the price on the homepage", 11],
    ["Add a free week, no card", 7],
    ["Cut signup to email only", 4],
  ];
  return (
     <Frame blue={blue} label="example · fix these first">
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

function ReviewsVisual({ blue }: { blue: boolean }) {
  const reviews: [string, string][] = [
    ["Reddit", "“Love the recipes, but the price isn't clear.”"],
    ["App Store", "“Great idea, onboarding was confusing.”"],
    ["Review site", "“Saved me hours of planning every week.”"],
  ];
  return (
     <Frame blue={blue} label="example · what people say online">
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

function AppVisual({ blue }: { blue: boolean }) {
  const screens: [string, number][] = [
    ["Welcome", 4],
    ["Goals", 9],
    ["Notifications", 21],
    ["Paywall", 38],
  ];
  return (
    <Frame blue={blue} label="example · where people quit">
      <ol className="grid grid-cols-4 gap-2">
        {screens.map(([name, quit], i) => (
          <li key={name}>
            <div className={`flex aspect-[9/16] flex-col rounded-lg border p-2 ${i === 3 ? "border-fg" : "border-line"}`} aria-hidden>
              <span className="block h-1.5 w-3/4 rounded bg-accent" />
              <span className="mt-1.5 block h-1.5 w-1/2 rounded bg-raised" />
              <span className="mt-auto block h-3 w-full rounded bg-accent" />
            </div>
            <p className="t-label mt-2 truncate">{name}</p>
            <p className="t-number text-lg">−{quit}%</p>
          </li>
        ))}
      </ol>
    </Frame>
  );
}
