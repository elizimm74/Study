"use client";
// ONE SCROLL-DRIVEN "LAB" ANIMATION (used twice on the home page: 01 Customer simulation and
// 03 Behavioral patterns). How it works, in plain words:
//   - A tall "track" holds a "pin" that is exactly one screen high and sticks to the screen
//     (CSS position: sticky) while you scroll through the track. Nothing hijacks the wheel:
//     the page scrolls normally, we only READ how far through the track you are.
//   - That progress (0..1) becomes the scene's stage value s (0..4). It chases the real scroll
//     with a short ease, so motion speeds up and settles like the rest of the site.
//   - The canvas scene is a pure function of s: scroll back up and it plays backwards.
//   - Each time a new stage starts, its note fades up in the top-right corner (fades DOWN when
//     you're scrolling back), and four tiny ticks fill as you go.
//   - The drawing loop only runs while the track is on screen.
// COMPACT mode (home page, 2026-11-27 conversion redesign): no tall track and no pin. The block is
// one screen-ish high and plays the four stages by itself on a loop (about 16 seconds) while it's on
// screen, so the page stays short.
// STEPS mode (home page, 2026-11-28, founder: "when you get to the diagram you should have to stop, and
// scrolling goes to the next 1/4, 2/4"): the block is pinned in the middle of the screen inside a glass
// frame. The track is 4 stops long (data-scroll-stops="4"): SmoothScroll parks the page on each stop and
// one scroll gesture moves one stop (mouse, trackpad, keyboard). On phones, CSS scroll-snap markers do the
// same. Stage pills under the picture ("1/4 Your crowd") show where you are and jump to a stage.
// Reduced motion (system setting) or the footer's "Calmer motion": no pin and no loop; the
// finished picture is drawn once and the four notes are listed under it (the CSS does the
// layout from the very first paint, see globals.css "LAB").
import { useEffect, useRef, useState } from "react";
import { patternsScene } from "./scenePatterns";
import { simulationScene } from "./sceneSimulation";
import type { Mix, Scene } from "./kit";

export type LabStage = { code: string; title: string; text: string };

const SCENES = { simulation: simulationScene, patterns: patternsScene };
const LOOP = 16; // compact mode: seconds per full run (the last 20% holds the finished picture)
const START = 0.05; // the first 5% of the track shows the starting state
const SPAN = 0.87; // the stages play over the next 87%; the rest holds the final picture

const damp = (from: number, to: number, lambda: number, dt: number) =>
  from + (to - from) * (1 - Math.exp(-lambda * dt));

function stillMode() {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    Boolean(document.documentElement.dataset.calm)
  );
}

export default function LabSequence({
  id,
  index,
  name,
  heading,
  hint,
  note,
  scene,
  stages,
  mix,
  compact = false,
  steps = false,
}: {
  id: string;
  index: string;
  name: string;
  heading: string;
  hint: string;
  note: string;
  scene: keyof typeof SCENES;
  stages: LabStage[];
  mix: Mix;
  compact?: boolean;
  steps?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState(0);
  const [dir, setDir] = useState<"down" | "up">("down");
  const [still, setStill] = useState(false);
  const { buy, maybe, no } = mix;

  // follow the reduced-motion setting and the "Calmer motion" switch (it can change while open)
  useEffect(() => {
    const update = () => setStill(stillMode());
    update();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", update);
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-calm"],
    });
    return () => {
      mq.removeEventListener("change", update);
      mo.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = track.current;
    const box = pin.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!el || !box || !cv || !ctx) return;

    let draw: Scene | null = null;
    let w = 0;
    let h = 0;
    let shown = 0;
    let lastStage = -1;
    let raf = 0;
    let last = 0;
    let running = false;
    let t0 = 0;
    // compact mode: where the loop is, from the time since it came into view
    const loopS = (now: number) => {
      const phase = (((now - t0) / 1000) % LOOP) / LOOP;
      return Math.min(4, (phase / 0.8) * 4);
    };

    const target = () => {
      const r = el.getBoundingClientRect();
      if (steps) {
        // stop k (0..3) = the track's top k steps above the top of the screen = stage k+1 finished
        const step = Math.max(1, (r.height - window.innerHeight) / (stages.length - 1));
        const scrolled = -r.top;
        if (scrolled < 0) return Math.max(0, 1 + scrolled / (window.innerHeight * 0.7)); // arriving: 0 -> 1
        return Math.min(stages.length, 1 + scrolled / step);
      }
      const total = Math.max(1, r.height - box.offsetHeight);
      const p = Math.min(1, Math.max(0, -r.top / total));
      return Math.min(1, Math.max(0, (p - START) / SPAN)) * 4;
    };
    const paint = (s: number, t: number) => {
      if (!draw) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      draw(ctx, s, t);
      box.style.setProperty("--s", s.toFixed(3));
      // steps mode parks ON whole numbers (s = 2 means stage 2 is showing); the others play through them
      const st = s < 0.06 ? 0 : Math.min(stages.length, steps ? Math.max(1, Math.ceil(s - 0.05)) : Math.floor(s) + 1);
      if (st !== lastStage) {
        if (lastStage >= 0) setDir(st > lastStage ? "down" : "up");
        lastStage = st;
        setStage(st);
      }
    };
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = box.clientWidth;
      h = box.clientHeight;
      if (!w || !h) return;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      draw = SCENES[scene](w, h, { buy, maybe, no });
      if (still) paint(4, 0);
      else paint(shown, performance.now() / 1000);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      shown = compact ? loopS(now) : damp(shown, target(), 7, dt);
      paint(shown, now / 1000);
      if (running) raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (running || still) return;
      running = true;
      last = performance.now();
      t0 = last;
      shown = compact ? 0 : target(); // no catch-up sweep when it comes into view
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    const io = new IntersectionObserver(
      (entries) => (entries[0].isIntersecting ? start() : stop()),
      { rootMargin: "120px 0px" },
    );
    io.observe(el);
    // the canvas labels use Space Grotesk: redraw once it has loaded
    document.fonts?.ready
      .then(() => (still ? paint(4, 0) : null))
      .catch(() => {});

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
    };
  }, [scene, buy, maybe, no, stages.length, still, compact, steps]);

  const now = stage > 0 ? stages[stage - 1] : null;
  const stepped = steps && !still;

  // A stage pill: scroll to that stop (SmoothScroll glides there on desktop; phones scroll smoothly).
  const goTo = (k: number) => {
    const el = track.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const step = (r.height - window.innerHeight) / (stages.length - 1);
    const y = Math.round(r.top + window.scrollY + step * k);
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !document.documentElement.dataset.calm) {
      window.dispatchEvent(new CustomEvent("crawler:step-to", { detail: y }));
    } else {
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const frame = (
    <div
      ref={pin}
      className="lab-pin"
      style={{ "--s": 0 } as React.CSSProperties}
    >
      <canvas ref={canvas} className="lab-canvas" aria-hidden />
      <div className="lab-head">
        <div className="lab-id">
          <p className="lab-tag">
            {index} / {name}
          </p>
          <h2 id={`${id}-title`} className="lab-h">
            {heading}
          </h2>
        </div>
        <div className="lab-panel" aria-hidden>
          <div className="lab-ticks">
            {stages.map((_, k) => (
              <i key={k} style={{ "--k": k } as React.CSSProperties} />
            ))}
          </div>
          {now && (
            <div key={stage} className="lab-note" data-dir={dir}>
              <p className="lab-code">
                {now.code}
                <span> / {stages[stages.length - 1].code}</span>
              </p>
              <p className="lab-title">{now.title}</p>
              <p className="lab-text">{now.text}</p>
            </div>
          )}
        </div>
      </div>
      <p className="lab-hint" data-on={stage === 0 ? "1" : undefined} aria-hidden>
        {hint}
        <span />
      </p>
      <p className="lab-foot">{note}</p>
    </div>
  );

  if (steps) {
    return (
      <section
        id={id}
        className={`lab-seq is-steps${still ? " is-still" : ""}`}
        aria-labelledby={`${id}-title`}
      >
        <div ref={track} className="lab-track" data-scroll-stops={stepped ? stages.length : undefined}>
          {/* phones: one snap point per stage, so a swipe stops at each one */}
          {stepped &&
            stages.map((st, k) => (
              <span key={st.code} className="lab-snap" style={{ "--k": k } as React.CSSProperties} aria-hidden />
            ))}
          <div className="lab-sticky">
            <div className="lab-glass">
              {frame}
              <div className="lab-steps" role="group" aria-label="Stages">
                {stages.map((st, k) => (
                  <button
                    key={st.code}
                    type="button"
                    className="lab-step"
                    aria-current={stage === k + 1 ? "step" : undefined}
                    data-done={stage > k + 1 ? "1" : undefined}
                    onClick={() => goTo(k)}
                  >
                    <span className="lab-step-n">
                      {k + 1}/{stages.length}
                    </span>
                    <span className="lab-step-t">{st.title}</span>
                  </button>
                ))}
                {stepped && (
                  <span className="lab-step-hint" aria-hidden>
                    {stage >= stages.length ? "Keep scrolling" : "Scroll for the next stage"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <ol className="lab-list">
          {stages.map((st) => (
            <li key={st.code}>
              <p className="lab-code">{st.code}</p>
              <p className="lab-title">{st.title}</p>
              <p className="lab-text">{st.text}</p>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section
      id={id}
      className={`lab-seq${still ? " is-still" : ""}${compact ? " is-compact" : ""}`}
      aria-labelledby={`${id}-title`}
    >
      <div ref={track} className="lab-track">
        <div
          ref={pin}
          className="lab-pin"
          style={{ "--s": 0 } as React.CSSProperties}
        >
          <canvas ref={canvas} className="lab-canvas" aria-hidden />
          <div className="lab-head">
            <div className="lab-id">
              <p className="lab-tag">
                {index} / {name}
              </p>
              <h2 id={`${id}-title`} className="lab-h">
                {heading}
              </h2>
            </div>
            <div className="lab-panel" aria-hidden>
              <div className="lab-ticks">
                {stages.map((_, k) => (
                  <i key={k} style={{ "--k": k } as React.CSSProperties} />
                ))}
              </div>
              {now && (
                <div key={stage} className="lab-note" data-dir={dir}>
                  <p className="lab-code">
                    {now.code}
                    <span> / {stages[stages.length - 1].code}</span>
                  </p>
                  <p className="lab-title">{now.title}</p>
                  <p className="lab-text">{now.text}</p>
                </div>
              )}
            </div>
          </div>
          <p
            className="lab-hint"
            data-on={stage === 0 ? "1" : undefined}
            aria-hidden
          >
            {hint}
            <span />
          </p>
          <p className="lab-foot">{note}</p>
        </div>
      </div>
      {/* the four stages as plain text: read by screen readers, and shown under the picture in the still version */}
      <ol className="lab-list">
        {stages.map((st) => (
          <li key={st.code}>
            <p className="lab-code">{st.code}</p>
            <p className="lab-title">{st.title}</p>
            <p className="lab-text">{st.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
