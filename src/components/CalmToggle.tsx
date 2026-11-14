"use client";
// Footer switch: "Calmer motion". Turns off animations and the smooth-scroll easing on this
// device (it also happens automatically if your system says "reduce motion"). Saved in this
// browser only. A before-paint script in layout.tsx re-applies it on every visit.
import { useEffect, useState } from "react";

export default function CalmToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(!!document.documentElement.dataset.calm), []);
  const flip = () => {
    const next = !on;
    setOn(next);
    if (next) document.documentElement.dataset.calm = "1";
    else delete document.documentElement.dataset.calm;
    try {
      localStorage.setItem("crawler-calm", next ? "1" : "0");
    } catch {
      // not saved, still applies for this visit
    }
  };
  return (
    <button type="button" onClick={flip} aria-pressed={on} className="min-h-11 rounded-lg px-1 underline-offset-4 hover:text-fg hover:underline">
      Calmer motion: {on ? "on" : "off"}
    </button>
  );
}
