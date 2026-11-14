"use client";
// Inertial ("buttery") scrolling for the home page, in the spirit of Lenis (lenis.dev), written
// by hand so it needs no extra package.
//   - The mouse wheel / trackpad moves a TARGET position; the page eases toward it every frame.
//   - ONLY on desktop-style pointers (mouse / trackpad). Phones and tablets keep their own native
//     momentum scrolling. Anyone who asked for reduced motion keeps normal scrolling.
//   - Keyboard, scrollbar dragging and find-in-page still work (we notice and re-sync).
//   - Scrollable boxes inside the page, text fields and pinch-zoom are left alone.
//   - Links like <a href="#features"> glide to their spot instead of jumping.
import { useEffect } from "react";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

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
    root.style.scrollBehavior = "auto"; // the page CSS says "smooth"; we do the easing ourselves
    const maxScroll = () => Math.max(0, root.scrollHeight - window.innerHeight);

    let target = window.scrollY;
    let current = window.scrollY;
    let moving = false;
    let raf = 0;
    let last = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      current += (target - current) * (1 - Math.exp(-dt * 8)); // frame-rate independent easing
      if (Math.abs(target - current) < 0.4) {
        current = target;
        moving = false;
      }
      window.scrollTo(0, current);
      if (moving) raf = requestAnimationFrame(tick);
    };
    const go = () => {
      if (moving) return;
      moving = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const onWheel = (e: WheelEvent) => {
      if (root.dataset.calm) return; // "Calmer motion" switch in the footer: use normal scrolling
      if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (canScrollInside(e.target, e.deltaY)) return;
      e.preventDefault();
      if (!moving) target = current = window.scrollY;
      const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1;
      target = clamp(target + e.deltaY * unit, 0, maxScroll());
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
      target = clamp(el ? el.getBoundingClientRect().top + window.scrollY - 64 : 0, 0, maxScroll());
      history.replaceState(null, "", id ? `#${id}` : window.location.pathname);
      go();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(raf);
      root.style.scrollBehavior = before;
    };
  }, []);
  return null;
}
