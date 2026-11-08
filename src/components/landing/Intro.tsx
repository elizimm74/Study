"use client";
// The opening animation on the landing page:
//   1. a plain white page,
//   2. blue claw scratches rip down the middle,
//   3. the white page tears in two along a jagged line and the halves fly apart,
//      revealing the blue site underneath.
// Plays once per browser tab (sessionStorage), and never for people who turn
// off animations. A tiny script in layout.tsx decides BEFORE the page is drawn
// (html data-intro="play" or "skip"), so the site never flashes first.
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Claws from "../Claws";

const DRAW_MS = 850; // scratches finish drawing
const DONE_MS = 1700; // halves have flown off; remove the overlay

// Lives in layout.tsx (outside <main>, so "position: fixed" really covers the whole
// screen), but only shows on the home page.
export default function Intro() {
  const onHome = usePathname() === "/";
  const [phase, setPhase] = useState<"draw" | "open" | "done">("draw");

  useEffect(() => {
    const root = document.documentElement;
    if (!onHome || root.dataset.intro !== "play") {
      root.dataset.intro = "skip"; // no intro this time, so the hero shouldn't wait for one
      setPhase("done");
      return;
    }
    try {
      sessionStorage.setItem("crawler-intro-seen", "1");
    } catch {
      // private browsing can block storage; it just plays again next time
    }
    document.body.style.overflow = "hidden"; // no scrolling while it plays
    const open = setTimeout(() => setPhase("open"), DRAW_MS);
    const done = setTimeout(() => {
      setPhase("done");
      document.body.style.overflow = "";
    }, DONE_MS);
    return () => {
      clearTimeout(open);
      clearTimeout(done);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!onHome || phase === "done") return null;
  return (
    <div className={`intro ${phase === "open" ? "intro-open" : ""}`} aria-hidden>
      <div className="intro-half intro-left" />
      <div className="intro-half intro-right" />
      <div className="intro-claws">
        <Claws color="#1a2aa6" delay={0.1} className="h-72 w-56 sm:h-[26rem] sm:w-80" />
      </div>
    </div>
  );
}
