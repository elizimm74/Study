"use client";
// A heading whose words slide up out of a mask, one after another, when it scrolls into view.
import { useEffect, useRef, useState } from "react";

export default function SplitReveal({ text, as = "h2", className = "" }: { text: string; as?: "h2" | "h3" | "p"; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Tag = as;
  return (
    <Tag ref={ref as React.RefObject<never>} className={`split ${on ? "is-in" : ""} ${className}`}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="split-word">
          <span style={{ transitionDelay: `${i * 70}ms` }}>{w}&nbsp;</span>
        </span>
      ))}
    </Tag>
  );
}
