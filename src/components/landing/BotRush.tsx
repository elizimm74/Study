"use client";
// The hero animation: little bots stream along glowing trails into a website.
// While they arrive, the page's progress bar fills; when it's full a check mark
// pops in, holds, and the loop starts again.
//
// It's one SVG using the browser's built-in SVG animation (<animate>,
// <animateMotion>), so there's no animation library to install.
// People who turned animations off in their settings get a still frame.
// Rule for <animate>: keyTimes must start at 0 and END AT 1, or the browser ignores it.
import { useEffect, useRef } from "react";

const BLUE = "#1a2aa6";
const NAVY = "#0e1873";

// The website window (in the drawing's own units: 640 × 420).
const SITE = { x: 360, y: 70, w: 250, h: 280 };

// 12 bots. Start points are spread on the left, and each one lands at a different
// height on the website's left edge. A fixed formula, so it's the same every load.
const BOTS = Array.from({ length: 12 }, (_, i) => {
  const sx = -20 + (i % 4) * 45;
  const sy = 40 + ((i * 67) % 340);
  const ty = SITE.y + 50 + ((i * 37) % (SITE.h - 90));
  const path = `M ${sx} ${sy} C ${sx + 140} ${sy}, ${SITE.x - 110} ${ty}, ${SITE.x} ${ty}`;
  return { path, ty, delay: i * 0.22, dur: 2.4 + (i % 3) * 0.2 };
});

const LOOP = "6s"; // how long one "read the site → check" cycle takes

export default function BotRush() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      svg.setCurrentTime(4.6); // a moment where the check is showing
      svg.pauseAnimations();
    }
  }, []);

  return (
    <svg
      ref={ref}
      viewBox="0 0 640 420"
      className="h-auto w-full"
      role="img"
      aria-label="Animation: small bots fly into a website, a progress bar fills up, and a check mark appears."
    >
      <defs>
        {/* soft glow used for the streaks and bot halos */}
        <filter id="br-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="br-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="16"
            stdDeviation="18"
            floodColor="#050a3c"
            floodOpacity="0.45"
          />
        </filter>
      </defs>

      {/* ---------- 1. The trails (faint dotted paths) ---------- */}
      <g
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.2"
        strokeWidth="1.5"
        strokeDasharray="2 7"
        strokeLinecap="round"
      >
        {BOTS.map((b, i) => (
          <path key={i} d={b.path} />
        ))}
      </g>

      {/* ---------- 2. Streaks that race along each trail behind its bot ---------- */}
      {BOTS.map((b, i) => (
        <g key={i} fill="none" strokeLinecap="round">
          {/* blurred copy = the glow */}
          <path
            d={b.path}
            pathLength={100}
            stroke="#9fb0ff"
            strokeWidth="6"
            strokeDasharray="16 100"
            filter="url(#br-glow)"
            opacity="0.9"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="16;-84"
              dur={`${b.dur}s`}
              begin={`${b.delay}s`}
              repeatCount="indefinite"
            />
          </path>
          {/* sharp core */}
          <path
            d={b.path}
            pathLength={100}
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeDasharray="16 100"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="16;-84"
              dur={`${b.dur}s`}
              begin={`${b.delay}s`}
              repeatCount="indefinite"
            />
          </path>
        </g>
      ))}

      {/* ---------- 3. The website ---------- */}
      <g filter="url(#br-shadow)">
        <rect
          x={SITE.x}
          y={SITE.y}
          width={SITE.w}
          height={SITE.h}
          rx="16"
          fill="#ffffff"
        />
      </g>
      <rect
        x={SITE.x}
        y={SITE.y}
        width={SITE.w}
        height="30"
        rx="16"
        fill="#f3f5fb"
      />
      <rect
        x={SITE.x}
        y={SITE.y + 16}
        width={SITE.w}
        height="14"
        fill="#f3f5fb"
      />
      {[0, 1, 2].map((d) => (
        <circle
          key={d}
          cx={SITE.x + 18 + d * 13}
          cy={SITE.y + 15}
          r="4"
          fill="#c3c9da"
        />
      ))}
      <rect
        x={SITE.x + 70}
        y={SITE.y + 9}
        width="120"
        height="12"
        rx="6"
        fill="#ffffff"
      />
      {/* a sketch of a landing page */}
      <rect
        x={SITE.x + 24}
        y={SITE.y + 54}
        width="160"
        height="14"
        rx="4"
        fill="#0c0e1f"
      />
      <rect
        x={SITE.x + 24}
        y={SITE.y + 76}
        width="120"
        height="14"
        rx="4"
        fill={BLUE}
      />
      <rect
        x={SITE.x + 24}
        y={SITE.y + 104}
        width="200"
        height="6"
        rx="3"
        fill="#dfe3ee"
      />
      <rect
        x={SITE.x + 24}
        y={SITE.y + 118}
        width="168"
        height="6"
        rx="3"
        fill="#dfe3ee"
      />
      <rect
        x={SITE.x + 24}
        y={SITE.y + 140}
        width="74"
        height="24"
        rx="12"
        fill={BLUE}
      />
      {[0, 1, 2].map((c) => (
        <rect
          key={c}
          x={SITE.x + 24 + c * 68}
          y={SITE.y + 180}
          width="60"
          height="44"
          rx="8"
          fill="#f3f5fb"
          stroke="#dfe3ee"
        />
      ))}

      {/* progress: label + bar that fills, then the label switches to "done" */}
      <text
        x={SITE.x + 24}
        y={SITE.y + 248}
        fontSize="11"
        fill="#5f6780"
        fontFamily="var(--font-mono)"
      >
        reading · 25 customers
        <animate
          attributeName="opacity"
          values="1;1;0;0;1"
          keyTimes="0;0.64;0.66;0.97;1"
          dur={LOOP}
          repeatCount="indefinite"
        />
      </text>
      <text
        x={SITE.x + 24}
        y={SITE.y + 248}
        fontSize="11"
        fill={BLUE}
        fontFamily="var(--font-mono)"
        opacity="0"
      >
        all checks passed
        <animate
          attributeName="opacity"
          values="0;0;1;1;0"
          keyTimes="0;0.64;0.66;0.94;1"
          dur={LOOP}
          repeatCount="indefinite"
        />
      </text>
      <rect
        x={SITE.x + 24}
        y={SITE.y + 258}
        width="202"
        height="6"
        rx="3"
        fill="#e8ebf6"
      />
      <rect
        x={SITE.x + 24}
        y={SITE.y + 258}
        width="0"
        height="6"
        rx="3"
        fill={BLUE}
      >
        <animate
          attributeName="width"
          values="0;202;202;0"
          keyTimes="0;0.64;0.94;1"
          dur={LOOP}
          repeatCount="indefinite"
        />
      </rect>

      {/* ---------- 4. Bots + a flash where each one lands ---------- */}
      {BOTS.map((b, i) => (
        <g key={i}>
          {/* landing flash on the website's edge */}
          <circle
            cx={SITE.x}
            cy={b.ty}
            r="0"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            opacity="0"
          >
            <animate
              attributeName="r"
              values="0;0;16"
              keyTimes="0;0.82;1"
              dur={`${b.dur}s`}
              begin={`${b.delay}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;0;1;0"
              keyTimes="0;0.8;0.84;1"
              dur={`${b.dur}s`}
              begin={`${b.delay}s`}
              repeatCount="indefinite"
            />
          </circle>
          {/* the bot itself, drawn around (0,0) and moved along its trail */}
          <g opacity="0">
            <animateMotion
              path={b.path}
              dur={`${b.dur}s`}
              begin={`${b.delay}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0;0"
              keyTimes="0;0.1;0.84;0.9;1"
              dur={`${b.dur}s`}
              begin={`${b.delay}s`}
              repeatCount="indefinite"
            />
            {/* drawn 30% bigger than its basic size */}
            <g transform="scale(1.3)">
              <circle
                r="17"
                fill="#9fb0ff"
                opacity="0.5"
                filter="url(#br-glow)"
              />
              <line
                x1="0"
                y1="-10"
                x2="0"
                y2="-16"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="0" cy="-17" r="2.5" fill="#ffffff" />
              <rect
                x="-12"
                y="-10"
                width="24"
                height="20"
                rx="7"
                fill="#ffffff"
              />
              <circle cx="-5" cy="0" r="2.6" fill={NAVY} />
              <circle cx="5" cy="0" r="2.6" fill={NAVY} />
            </g>
          </g>
        </g>
      ))}

      {/* ---------- 5. The check mark: pops in when the bar is full ---------- */}
      <g transform={`translate(${SITE.x + SITE.w - 6} ${SITE.y + SITE.h - 6})`}>
        <g opacity="0">
          <animate
            attributeName="opacity"
            values="0;0;1;1;0;0"
            keyTimes="0;0.64;0.67;0.92;0.97;1"
            dur={LOOP}
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="scale"
            values="0.2;0.2;1.18;1;1"
            keyTimes="0;0.64;0.7;0.74;1"
            dur={LOOP}
            repeatCount="indefinite"
          />
          <circle r="34" fill="#9fb0ff" opacity="0.55" filter="url(#br-glow)" />
          <circle r="28" fill="#ffffff" />
          <circle r="22" fill={BLUE} />
          <path
            d="M-9 1 l6 6 l12 -14"
            fill="none"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
}
