"use client";
// Inertial ("buttery") scrolling for EVERY page (mounted once in layout.tsx), in the spirit of Lenis (lenis.dev), written
// by hand so it needs no extra package.
//   - The mouse wheel / trackpad moves a TARGET position; the page eases toward it every frame.
//   - ONLY on desktop-style pointers (mouse / trackpad). Phones and tablets keep their own native
//     momentum scrolling. Anyone who asked for reduced motion keeps normal scrolling.
//   - Keyboard (space, page down, arrows), scrollbar dragging and find-in-page keep the browser's
//     own SMOOTH scrolling (CSS scroll-behavior); we only switch it off while our own glide runs,
//     so the two never fight.
//   - Scrollable boxes inside the page, text fields and pinch-zoom are left alone.
//   - Links like <a href="#features"> glide to their spot and stop just below the floating nav.
//   - It never locks or "snaps" the page, EXCEPT inside a "stepped" block (data-scroll-stops="4"):
//     there the page parks on each stop, and one scroll gesture moves exactly one stop (1/4 -> 2/4 ...).
//     A gesture that keeps going (trackpad momentum) is ignored until you pause, so you can't fly past.
//     Past the last stop (or before the first) the page scrolls normally again.
import { useEffect } from "react";

// How fast the page catches up with the wheel: the same feel as Lenis (lenis.dev) with lerp 0.1,
// the setting klad.design uses: each frame at 60fps closes 10% of the gap, i.e. 6 per second.
// The same everywhere (the home page used to be softer; matched to the reference the founder picked).
const EASE = 6;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// ---- stepped blocks ----
// A block with data-scroll-stops="N" is N stops: the page positions where its top is at the top of
// the screen, then one step further each time (the block's extra height split into N-1 equal steps).
const STEP_HOLD = 1000; // ms: a step always takes at least this long (the stage plays) before the next one
const STEP_QUIET = 280; // ms: ...and the wheel must have been still this long (one gesture = one step)
export function stopsOf(el: HTMLElement): number[] {
  const n = Math.max(2, Number(el.dataset.scrollStops) || 2);
  const top = el.getBoundingClientRect().top + window.scrollY;
  const span = Math.max(0, el.offsetHeight - window.innerHeight);
  return Array.from({ length: n }, (_, i) => Math.round(top + (span * i) / (n - 1)));
}
// Where one scroll from `from` (direction dir) should go, if a stepped block catches it.
// Returns null when no block is involved (normal scrolling).
export function stepTarget(groups: number[][], from: number, proposed: number, dir: 1 | -1): number | null {
  for (const stops of groups) {
    const first = stops[0];
    const lastStop = stops[stops.length - 1];
    // parked on (or between) the stops: move to the next one in that direction, unless leaving
    if (from >= first - 2 && from <= lastStop + 2) {
      const i = stops.findIndex((p) => Math.abs(p - from) <= 2);
      if (i >= 0) {
        const next = i + dir;
        if (next < 0 || next >= stops.length) continue; // leaving the block: normal scrolling
        return stops[next];
      }
      // between two stops (after a resize or a keyboard jump): the next one in that direction
      return dir > 0 ? stops.find((p) => p > from)! : [...stops].reverse().find((p) => p < from)!;
    }
    // arriving from above / below: park on the first / last stop instead of flying through
    if (dir > 0 && from < first && proposed >= first) return first;
    if (dir < 0 && from > lastStop && proposed <= lastStop) return lastStop;
  }
  return null;
}

function canScrollInside(start: EventTarget | null, deltaY: number): boolean {
  let el = start instanceof HTMLElement ? start : null;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.dataset.smoothPrevent !== undefined || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) {
      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) return true;
    }
    el = el.parentElement;
  }
  return false;
}

export default function SmoothScroll() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    const root = document.documentElement;
    const before = root.style.scrollBehavior;
    const maxScroll = () => Math.max(0, root.scrollHeight - window.innerHeight);
    // Where a jump to a section should stop: its own scroll-margin, else just below the floating nav.
    const offsetFor = (el: Element) => {
      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      const nav = document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 64;
      return Math.max(margin, nav + 16);
    };

    let target = window.scrollY;
    let current = window.scrollY;
    let moving = false;
    let raf = 0;
    let last = 0;
    let stepAt = 0; // when the last step started
    let lastWheel = 0;
    const groups = () => [...document.querySelectorAll<HTMLElement>("[data-scroll-stops]")].map(stopsOf);
    // One step: glide to `to`, and hold further wheel input until the gesture has stopped.
    const step = (to: number) => {
      if (!moving) target = current = window.scrollY;
      target = clamp(to, 0, maxScroll());
      stepAt = performance.now();
      go();
    };
    // Held = the step is still playing, or the wheel hasn't paused since (you have to stop to go on).
    const stepping = (now: number) => now - stepAt < STEP_HOLD || (stepAt > 0 && now - lastWheel < STEP_QUIET);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      current += (target - current) * (1 - Math.exp(-dt * EASE)); // frame-rate independent easing
      if (Math.round(current) === Math.round(target)) { // done once it's on the same pixel (like Lenis)
        current = target;
        moving = false;
      }
      window.scrollTo(0, current);
      if (moving) raf = requestAnimationFrame(tick);
      else root.style.scrollBehavior = before; // glide finished: keyboard scrolling is smooth again
    };
    const go = () => {
      if (moving) return;
      moving = true;
      root.style.scrollBehavior = "auto"; // while WE glide, the browser mustn't animate each step too
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const onWheel = (e: WheelEvent) => {
      if (root.dataset.calm) return; // "Calmer motion" switch in the footer: use normal scrolling
      if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (canScrollInside(e.target, e.deltaY)) return;
      e.preventDefault();
      const now = performance.now();
      const held = stepping(now);
      lastWheel = now;
      if (held) return; // still the same gesture as the last step: ignore it
      if (!moving) target = current = window.scrollY;
      const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1;
      const proposed = clamp(target + e.deltaY * unit, 0, maxScroll());
      if (e.deltaY !== 0) {
        const stop = stepTarget(groups(), moving ? target : window.scrollY, proposed, e.deltaY > 0 ? 1 : -1);
        if (stop !== null) return step(stop);
      }
      stepAt = 0;
      target = proposed;
      go();
    };
    // Something else scrolled the page (keyboard, scrollbar, find-in-page): follow it.
    const onScroll = () => {
      if (!moving && Math.abs(window.scrollY - current) > 1) target = current = window.scrollY;
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href^='#']") as HTMLAnchorElement | null;
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const id = a.getAttribute("href")!.slice(1);
      const el = id ? document.getElementById(id) : null;
      if (id && !el) return;
      e.preventDefault();
      if (!moving) target = current = window.scrollY;
      target = clamp(el ? el.getBoundingClientRect().top + window.scrollY - offsetFor(el) : 0, 0, maxScroll());
      const oldUrl = window.location.href;
      history.replaceState(null, "", id ? `#${id}` : window.location.pathname);
      // replaceState is silent, so tell the page the #hash changed (e.g. the pricing page opens its
      // "Need more Crawlers?" form when the address says #custom)
      if (window.location.href !== oldUrl) window.dispatchEvent(new HashChangeEvent("hashchange", { oldURL: oldUrl, newURL: window.location.href }));
      go();
    };

    // Any OTHER way of scrolling (keyboard, grabbing the scrollbar) instantly ends our glide and
    // hands control back to the browser, so the two never fight over the page.
    const stop = () => {
      if (!moving) return;
      moving = false;
      cancelAnimationFrame(raf);
      target = current = window.scrollY;
      root.style.scrollBehavior = before;
    };
    const SCROLL_KEYS = ["PageDown", "PageUp", "Home", "End", "ArrowDown", "ArrowUp", " ", "Spacebar"];
    const DOWN_KEYS = ["PageDown", "ArrowDown", " ", "Spacebar"];
    const UP_KEYS = ["PageUp", "ArrowUp"];
    const onKey = (e: KeyboardEvent) => {
      if (!SCROLL_KEYS.includes(e.key)) return;
      const t = e.target as HTMLElement | null;
      const typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || (t.tagName === "BUTTON" && e.key === " "));
      // inside a stepped block, the keyboard steps too (Space / Page Down / arrows)
      if (!typing && !root.dataset.calm && !e.altKey && !e.metaKey && !e.ctrlKey) {
        const down = DOWN_KEYS.includes(e.key) && !(e.key === " " && e.shiftKey);
        const up = UP_KEYS.includes(e.key) || (e.key === " " && e.shiftKey);
        if (down || up) {
          const from = moving ? target : window.scrollY;
          const stop = stepTarget(groups(), from, from + (down ? 1 : -1) * window.innerHeight * 0.8, down ? 1 : -1);
          if (stop !== null) {
            e.preventDefault();
            if (!stepping(performance.now())) step(stop);
            return;
          }
        }
      }
      stop();
    };
    // a stepped block's own buttons ("2/4") ask for a step this way
    const onStepTo = (e: Event) => {
      const y = (e as CustomEvent<number>).detail;
      if (typeof y === "number") step(y);
    };
    window.addEventListener("crawler:step-to", onStepTo);

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey, { capture: true });
    window.addEventListener("pointerdown", stop, { passive: true });
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey, { capture: true });
      window.removeEventListener("pointerdown", stop);
      document.removeEventListener("click", onClick);
      window.removeEventListener("crawler:step-to", onStepTo);
      cancelAnimationFrame(raf);
      root.style.scrollBehavior = before;
    };
  }, []);
  return null;
}
