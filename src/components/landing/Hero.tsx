// The landing page hero: the big headline with a hand-drawn underline,
// the URL box, and the animation of bots streaming into a website (BotRush).
// Sits on the blue page, so text is white and the main button is white.
import UrlForm from "./UrlForm";
import BotRush from "./BotRush";

export default function Hero() {
  return (
    <section className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-8">
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
              className="pointer-events-none absolute -bottom-3 left-0 h-4 w-full text-white"
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

      {/* ---------- Right: bots streaming into a website ---------- */}
      <div className="-mx-4 sm:mx-0">
        <BotRush />
      </div>
    </section>
  );
}
