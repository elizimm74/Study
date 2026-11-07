// The Crawler mark: a hand-drawn asterisk, solid blue with a white border.
// It's the logo from the design files, drawn as code so it stays sharp at any size.
// `className="text-accent"` colors the blue part (it uses the current text color).
import { useId } from "react";

export default function Mark({ size = 24, className = "" }: { size?: number; className?: string }) {
  // Each copy needs its own filter id, so several marks on one page don't clash.
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden>
      <defs>
        {/* hand-drawn edge: a little wobble on every outline */}
        <filter id={`wobble-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter={`url(#wobble-${id})`} fill="none" strokeLinecap="round">
        {/* white border (draws first, so it sits underneath) */}
        <g stroke="#ffffff" strokeWidth={104}>
          <line x1="256" y1="110" x2="256" y2="402" />
          <line x1="124" y1="186" x2="388" y2="326" />
          <line x1="124" y1="326" x2="388" y2="186" />
        </g>
        {/* solid blue fill */}
        <g stroke="currentColor" strokeWidth={84}>
          <line x1="256" y1="110" x2="256" y2="402" />
          <line x1="124" y1="186" x2="388" y2="326" />
          <line x1="124" y1="326" x2="388" y2="186" />
        </g>
      </g>
    </svg>
  );
}
