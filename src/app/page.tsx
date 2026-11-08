// The home page: just the word "crawler" (huge, chunky) and one button.
// The button starts the onboarding: 3 quick questions, then the first test.
// (The intro animation that tears the page open lives in layout.tsx.)
import Link from "next/link";
import Claws from "@/components/Claws";
import { Arrow } from "@/components/landing/UrlForm";

export default function Home() {
  return (
    <section className="relative isolate flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center text-center">
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
    </section>
  );
}
