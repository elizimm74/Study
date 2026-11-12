"use client";
// A big statement whose words light up one by one as you scroll through it.
// *word* = a blue accent word. Words start pale and end solid; no animation of its own,
// it is pure scroll position, so it stops when you stop.
import { useEffect, useMemo, useRef } from "react";

export default function Manifesto({ text, className = "" }: { text: string; className?: string }) {
  const box = useRef<HTMLParagraphElement>(null);
  const words = useMemo(() => {
    let emph = false;
    return text.split(/\s+/).map((tok) => {
      if (tok.startsWith("*")) emph = true;
      const w = { w: tok.replace(/\*/g, ""), emph };
      if (/\*[.,!?]*$/.test(tok)) emph = false;
      return w;
    });
  }, [text]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const spans = [...el.querySelectorAll<HTMLElement>("[data-w]")];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      spans.forEach((s) => (s.style.opacity = "1"));
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.45 + r.height))); // 0 as it enters, 1 as it leaves the middle
      const t = p * (spans.length + 4);
      spans.forEach((s, i) => (s.style.opacity = String(0.16 + 0.84 * Math.min(1, Math.max(0, t - i)))));
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
  }, [words]);

  return (
    <p ref={box} className={`t-chunk mx-auto max-w-5xl text-balance ${className}`}>
      {words.map((w, i) => (
        <span key={i} data-w className={w.emph ? "text-accent" : ""} style={{ opacity: 1 }}>
          {w.w}{" "}
        </span>
      ))}
    </p>
  );
}
