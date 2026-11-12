"use client";
// Makes a button lean toward the mouse when it gets close (a small "magnet"). Desktop pointers only.
import { useEffect, useRef } from "react";

export default function Magnetic({ children, pull = 0.28, reach = 90 }: { children: React.ReactNode; pull?: number; reach?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const near = Math.abs(dx) < r.width / 2 + reach && Math.abs(dy) < r.height / 2 + reach;
      el.style.transform = near ? `translate(${Math.max(-14, Math.min(14, dx * pull))}px, ${Math.max(-10, Math.min(10, dy * pull))}px)` : "";
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [pull, reach]);
  return (
    <span ref={ref} className="inline-block transition-transform duration-200 ease-out">
      {children}
    </span>
  );
}
