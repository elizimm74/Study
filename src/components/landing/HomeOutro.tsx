// The last screen of the home page: an oversized "crawler" wordmark over the claws, and one button.
import Link from "next/link";
import Claws from "../Claws";
import Magnetic from "./motion/Magnetic";
import Reveal from "../Reveal";
import { Arrow } from "./UrlForm";

export default function HomeOutro() {
  return (
    <section className="bleed relative isolate overflow-hidden pb-24 pt-40 text-center sm:pt-56" aria-label="Get started">
      <Claws delay={0.1} className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[32rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 opacity-[0.1] sm:h-[48rem] sm:w-[40rem]" />
      <Reveal>
        <p className="t-label">ready when you are</p>
        <p className="t-wordmark mt-6" style={{ fontSize: "clamp(5rem, 23vw, 24rem)" }}>
          crawler
        </p>
        <div className="mt-12">
          <Magnetic>
            <Link href="/onboarding" className="btn btn-primary h-14 px-8 text-base">
              Test my product free
              <Arrow />
            </Link>
          </Magnetic>
        </div>
      </Reveal>
    </section>
  );
}
