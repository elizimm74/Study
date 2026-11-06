// The landing page hero, adapted from the Canva layout the founder liked:
// big headline with a hand-drawn underline on the key word, the URL box,
// and a slightly tilted report card on the right.
// Colors and type come from the design tokens in globals.css (blue accent).
import UrlForm from "./UrlForm";
import { EXAMPLE_BLOCKER, countVerdicts, EXAMPLE_PERSONAS } from "./example";

export default function Hero() {
  const counts = countVerdicts(EXAMPLE_PERSONAS);

  return (
    <section className="grid items-center gap-16 overflow-x-clip lg:grid-cols-[1.2fr_1fr] lg:gap-12">
      {/* ---------- Left: the message and the URL box ---------- */}
      <div className="max-w-xl">
        <p className="t-label uppercase">for founders about to launch</p>
        <h1 className="t-display mt-6 text-[clamp(3rem,5.4vw,5rem)]">
          Find out why
          <br />
          they{" "}
          <span className="relative inline-block whitespace-nowrap">
            won&apos;t buy.
            {/* hand-drawn style underline under the key words */}
            <svg
              className="pointer-events-none absolute -bottom-3 left-0 h-4 w-full text-accent"
              viewBox="0 0 300 16"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden
            >
              <path d="M4 10 C 60 2, 140 14, 200 7 S 280 4, 296 9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </span>
        </h1>
        <p className="t-lead mt-8">
          Paste your URL. 25 AI customers go through your site and tell you who&apos;d buy, who wouldn&apos;t, and what to fix.
        </p>
        <div className="mt-8">
          <UrlForm id="hero-url" />
          <p className="t-label mt-4">free · no card · about 2 minutes</p>
        </div>
      </div>

      {/* ---------- Right: the tilted report card ---------- */}
      <div className="relative mx-auto w-full max-w-xl px-4 lg:mx-0 lg:px-6">
        {/* soft accent shape behind the card, as in the Canva layout */}
        <div className="absolute inset-x-0 inset-y-10 -z-10 md:rotate-[-4deg] rounded-[2rem] bg-accent/10" aria-hidden />
        {/* the little handwritten-style sticker */}
        <p className="t-label absolute -bottom-10 right-6 hidden rotate-[-3deg] text-fg md:block" aria-hidden>
          real feedback. faster products.
        </p>

        <div className="card-raised p-6 sm:p-8 md:rotate-[2deg]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="t-h3">mealmate.app</p>
              <p className="t-label mt-1">25 AI customers</p>
            </div>
            <p className="t-label flex shrink-0 items-center gap-2 text-fg">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              completed · 1m 54s
            </p>
          </div>

          {/* three result tiles */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Tile icon="check" n={counts.buy} label="would buy" accent />
            <Tile icon="minus" n={counts.maybe} label="maybe" />
            <Tile icon="x" n={counts.no} label="wouldn't" />
          </div>

          {/* top reasons */}
          <div className="mt-6 rounded-xl border border-line p-4">
            <p className="text-sm font-medium">Top reasons</p>
            <ul className="mt-3 space-y-3 text-sm">
              <Reason text={EXAMPLE_BLOCKER.text} tone="accent" />
              <Reason text="Signup asks for too much" tone="fg" />
              <Reason text="Not clear what it builds" tone="muted" />
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// One result tile: a round icon, the number, and its label.
function Tile({ icon, n, label, accent }: { icon: "check" | "minus" | "x"; n: number; label: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-subtle p-4">
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${accent ? "bg-accent text-accent-fg" : "bg-raised text-fg"}`} aria-hidden>
        <Icon name={icon} />
      </span>
      <p className="t-number mt-4 text-3xl">{n}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

function Reason({ text, tone }: { text: string; tone: "accent" | "fg" | "muted" }) {
  const dot = tone === "accent" ? "bg-accent" : tone === "fg" ? "bg-fg" : "bg-line-strong";
  return (
    <li className="flex items-center gap-3">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      {text}
    </li>
  );
}

function Icon({ name }: { name: "check" | "minus" | "x" }) {
  const d = name === "check" ? "M3.5 8.5l3 3 6-7" : name === "minus" ? "M4 8h8" : "M4.5 4.5l7 7M11.5 4.5l-7 7";
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
