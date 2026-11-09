// The home page: the word "crawler" (huge, chunky) and one button, then, as you
// scroll down, the white sheet with every feature slides UP over the blue
// screen (the blue screen is sticky; ScrollLift pushes it back as you scroll).
// The button starts the questions, then the first test.
// (The intro animation that tears the page open lives in layout.tsx.)
import Link from "next/link";
import Claws from "@/components/Claws";
import { Arrow } from "@/components/landing/UrlForm";
import Features from "@/components/landing/Features";
import ScrollLift from "@/components/landing/ScrollLift";

export default function Home() {
  return (
    <>
      {/* sticky: stays in place while the white sheet scrolls over it.
          -mt cancels main's top padding; the height is the screen minus the header. */}
      <section className="sticky top-16 -mt-12 h-[calc(100svh-4rem)] sm:-mt-16">
        <ScrollLift className="relative isolate flex h-full flex-col items-center justify-center text-center">
          {/* faint claw scratches behind the word */}
          <Claws
            delay={0.3}
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[22rem] w-72 -translate-x-1/2 -translate-y-1/2 opacity-[0.12] sm:h-[34rem] sm:w-[28rem]"
          />
          <h1 className="t-wordmark rise">crawler</h1>
          <p className="t-lead rise d1 mt-8 max-w-md px-4">Simulated customers test your website or app before launch day.</p>
          <Link href="/onboarding" className="btn btn-primary rise d2 mt-10 h-14 px-8 text-base">
            Test my product
            <Arrow />
          </Link>
          {/* a small hint that there's more below; glides down when clicked */}
          <a href="#features" className="t-label rise d4 absolute bottom-8 flex flex-col items-center gap-2 text-white/80 hover:text-white">
            scroll
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-bounce" aria-hidden>
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </ScrollLift>
      </section>

      <Features />
    </>
  );
}
