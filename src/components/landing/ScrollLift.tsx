"use client";
// The home page's scroll feel: the blue "crawler" screen stays put (sticky),
// and as you scroll the white sheet slides up OVER it, like it's being pulled.
// This component pushes the blue screen's content up, shrinks it a little and
// fades it, driven by how far you've scrolled (0 = top, 1 = one screen down).
// Uses requestAnimationFrame, so it's smooth and does nothing between frames.
// With "reduce motion" turned on, nothing moves.
import { useEffect, useRef } from "react";

export default function ScrollLift({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
      // Ease-in: barely moves at first, then speeds up, like a pull.
      const e = p * p;
      el.style.transform = `translateY(${-e * 140}px) scale(${1 - e * 0.18})`;
      el.style.opacity = String(1 - Math.min(1, p * 1.3));
      el.style.filter = p > 0.02 ? `blur(${e * 6}px)` : "";
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className={`will-change-transform ${className}`}>
      {children}
    </div>
  );
}
