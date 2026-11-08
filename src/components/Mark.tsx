// The Crawler logo: three claw scratches (crawler → claws), tilted like a swipe.
// A chunkier, still version of the animated scratches (Claws.tsx), so it stays
// readable even tiny (header, browser tab).
// It draws in the current text color: `className="text-white"` = white scratches.

// Each scratch is a crescent: thin at both ends, thick in the middle.
export const LOGO_SCRATCHES = [
  "M22 10 C 36 40, 40 74, 30 108 C 56 76, 52 38, 22 10 Z",
  "M52 4 C 68 38, 72 76, 62 114 C 90 78, 86 36, 52 4 Z",
  "M82 14 C 96 42, 98 72, 90 102 C 114 74, 110 42, 82 14 Z",
];

export default function Mark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} fill="currentColor" aria-hidden>
      {/* tilted 14° around the center, like a swipe */}
      <g transform="rotate(14 60 60)">
        {LOGO_SCRATCHES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
