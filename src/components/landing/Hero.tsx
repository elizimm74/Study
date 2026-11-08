// The landing page hero: the promise ("See what stops customers from buying—before you launch."),
// the URL box, and the animation of bots streaming into a website (BotRush).
// Sits on the blue page, so text is white and the main button is white.
import UrlForm from "./UrlForm";
import BotRush from "./BotRush";
import Claws from "../Claws";

export default function Hero() {
  return (
    <section className="relative isolate grid items-center gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-8">
      {/* ---------- Left: the message and the URL box ---------- */}
      <div className="relative max-w-2xl">
        {/* big faint claw scratches behind the headline */}
        <Claws delay={0.35} className="pointer-events-none absolute -left-8 -top-10 -z-10 h-72 w-60 opacity-[0.14] sm:-left-16" />
        <p className="t-label rise uppercase">for founders about to launch</p>
        <h1 className="t-display rise d1 mt-6 text-[clamp(2.75rem,4.2vw,3.5rem)] leading-[1.08]">
          {/* line breaks only on big screens, so it reads in three clean lines */}
          See what stops <br className="hidden lg:block" />
          customers from{" "}
          {/* "buying—" is glued together (nowrap) so the dash never wraps onto its own line */}
          <span className="whitespace-nowrap">
          <span className="relative inline-block">
            buying
            {/* hand-drawn style underline under the key word */}
            <svg
              className="pointer-events-none absolute -bottom-1.5 left-0 h-3 w-full text-white"
              viewBox="0 0 300 16"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden
            >
              <path d="M4 10 C 60 2, 140 14, 200 7 S 280 4, 296 9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </span>
          {"\u2014"}
          </span>
          <br className="hidden lg:block" />
          before you launch.
        </h1>
        <p className="t-lead rise d2 mt-8">
          Paste your URL. Simulated customers click through your landing page, pricing and signup, then tell you whether
          they&apos;d buy, what stopped them, and what would change their mind.
        </p>
        <div className="rise d3 mt-8">
          <UrlForm id="hero-url" />
          <p className="t-label mt-4">simulated customers · buying intent, not real purchases</p>
        </div>
      </div>

      {/* ---------- Right: bots streaming into a website ---------- */}
      <div className="rise d4 -mx-4 sm:mx-0">
        <BotRush />
      </div>
    </section>
  );
}
