// The home page: the word "crawler" (huge, chunky) and one button, then, as you
// scroll down, every feature on white paper with blue text (Features).
// The button starts the onboarding: 3 quick questions, then the first test.
// (The intro animation that tears the page open lives in layout.tsx.)
import Link from "next/link";
import Claws from "@/components/Claws";
import { Arrow } from "@/components/landing/UrlForm";
import Features from "@/components/landing/Features";

export default function Home() {
  return (
    <>
    <section className="relative isolate flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center text-center">
      {/* faint claw scratches behind the word */}
      <Claws
        delay={0.3}
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[22rem] w-72 -translate-x-1/2 -translate-y-1/2 opacity-[0.12] sm:h-[34rem] sm:w-[28rem]"
      />
      <h1 className="t-wordmark rise">crawler</h1>
      <Link href="/onboarding" className="btn btn-primary rise d2 mt-12 h-14 px-8 text-base">
        Test my site
        <Arrow />
      </Link>
      {/* a small hint that there's more below; glides down when clicked */}
      <a href="#features" className="t-label rise d4 absolute bottom-0 flex flex-col items-center gap-2 text-white/80 hover:text-white">
        see everything it does
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-bounce" aria-hidden>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </section>

    <Features />
    </>
  );
}
