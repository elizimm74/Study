"use client";
// A pinned storytelling stage: the stage stays on screen while you scroll, and the picture + words
// change step by step (the idea you see on Parker-style sites). The section is a few screens tall;
// the sticky stage reads how far through it you are and cross-fades the steps.
// On phones (narrow screens) there's no pinning: the steps simply stack, one under the other.
import { useEffect, useRef, useState } from "react";
import Reveal from "../../Reveal";

export type Step = { n: string; title: string; text: string; visual: React.ReactNode };

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

export default function PinnedSteps({ steps }: { steps: Step[] }) {
  const section = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0); // 0 .. steps.length (a step is "centered" at i + 0.5)

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const run = Math.max(1, r.height - window.innerHeight);
      const p = clamp(-r.top / run);
      setPos((old) => (Math.abs(old - p * steps.length) > 0.002 ? p * steps.length : old));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [steps.length]);

  const active = clamp(Math.floor(pos), 0, steps.length - 1);

  return (
    <>
      {/* ---------- wide screens: pinned ---------- */}
      <div ref={section} className="relative hidden md:block" style={{ height: `${steps.length * 85 + 20}vh` }}>
        <div className="sticky top-16 flex h-[calc(100svh-4rem)] items-center">
          <div className="relative grid w-full items-center gap-16 md:grid-cols-2">
            {/* progress rail */}
            <div className="absolute -left-2 top-1/2 hidden h-72 -translate-y-1/2 lg:block" aria-hidden>
              <div className="relative h-full w-px bg-line-strong">
                <div className="absolute left-0 top-0 w-px bg-accent" style={{ height: `${clamp(pos / steps.length) * 100}%` }} />
                {steps.map((s, i) => (
                  <span
                    key={s.n}
                    className={`absolute -left-[5px] h-[11px] w-[11px] rounded-full border-2 transition-colors duration-300 ${
                      i <= active ? "border-accent bg-accent" : "border-line-strong bg-bg"
                    }`}
                    style={{ top: `calc(${(i / (steps.length - 1)) * 100}% - 5px)` }}
                  />
                ))}
              </div>
            </div>

            <div className="relative h-[26rem] lg:pl-12">
              {steps.map((s, i) => {
                const d = pos - (i + 0.5);
                const o = clamp(1.5 - Math.abs(d) * 2.8);
                return (
                  <div key={s.n} className="absolute inset-0 flex flex-col justify-center lg:pl-12" style={{ opacity: o, transform: `translateY(${d * -70}px)`, pointerEvents: o > 0.5 ? "auto" : "none" }}>
                    <p className="t-number text-6xl text-accent sm:text-7xl" aria-hidden>
                      {s.n}
                    </p>
                    <h2 className="t-chunk mt-4">{s.title}</h2>
                    <p className="t-lead mt-6 max-w-md">{s.text}</p>
                  </div>
                );
              })}
            </div>

            <div className="relative h-[30rem]">
              {steps.map((s, i) => {
                const d = pos - (i + 0.5);
                const o = clamp(1.5 - Math.abs(d) * 2.8);
                return (
                  <div key={s.n} className="absolute inset-0 flex items-center" style={{ opacity: o, transform: `translateY(${d * -110}px) scale(${1 - Math.min(0.08, Math.abs(d) * 0.08)})`, pointerEvents: o > 0.5 ? "auto" : "none" }} aria-hidden={i !== active}>
                    <div className="w-full">{s.visual}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- phones: stacked ---------- */}
      <div className="space-y-24 md:hidden">
        {steps.map((s) => (
          <article key={s.n} className="space-y-10">
            <Reveal>
              <p className="t-number text-6xl text-accent" aria-hidden>
                {s.n}
              </p>
              <h2 className="t-chunk mt-4">{s.title}</h2>
              <p className="t-lead mt-6 max-w-md">{s.text}</p>
            </Reveal>
            <Reveal delay={150}>{s.visual}</Reveal>
          </article>
        ))}
      </div>
    </>
  );
}
