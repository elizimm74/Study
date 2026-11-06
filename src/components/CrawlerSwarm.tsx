// The landing page's hero picture: lots of little round AI customers ("agents")
// on both sides, each tied to the website in the middle by a string. Small
// light dots travel along the strings into the site, like the agents reading it.
//
// It's one plain SVG (shapes drawn with code) + CSS animation. No library, no
// JavaScript in the browser. Positions come from a fixed formula, not random,
// so the picture is the same on every load.

// Drawing area. The SVG scales to fit the screen, so these are just "units".
const W = 1000;
const H = 520;
// The website window in the middle.
const SITE = { x: 360, y: 120, w: 280, h: 280 };

// What each agent decided. Most real visitors don't buy, so most are "no".
type Verdict = "yes" | "maybe" | "no";
const FILL: Record<Verdict, string> = {
  yes: "url(#agent-yes)",
  maybe: "url(#agent-maybe)",
  no: "url(#agent-no)",
};

type Agent = { x: number; y: number; r: number; verdict: Verdict; side: "left" | "right" | "top" | "bottom" };

// Place agents on loose arcs around the site. sin/cos give a spread-out,
// organic look; the formula always gives the same answer.
function makeAgents(): Agent[] {
  const agents: Agent[] = [];
  let i = 0;
  const verdictFor = (n: number): Verdict => (n % 9 === 0 ? "yes" : n % 4 === 1 ? "maybe" : "no");
  const add = (x: number, y: number, side: Agent["side"]) => {
    agents.push({ x, y, r: 7 + ((i * 7) % 9), verdict: verdictFor(i), side });
    i++;
  };
  // Left and right: 3 columns of agents each.
  for (const [cx, count, jitter] of [
    [60, 7, 26],
    [150, 6, 20],
    [240, 5, 14],
  ] as const) {
    for (let k = 0; k < count; k++) {
      const t = (k + 0.5) / count; // 0..1 down the column
      const y = 40 + t * (H - 80) + Math.sin(k * 2.3 + cx) * jitter;
      const wobble = Math.cos(k * 1.7 + cx) * jitter;
      add(cx + wobble, y, "left");
      add(W - cx - wobble, H - y, "right");
    }
  }
  // A few above and below the site.
  for (let k = 0; k < 4; k++) {
    add(SITE.x + 30 + k * 75, 34 + (k % 2) * 22, "top");
    add(SITE.x + 50 + k * 70, H - 30 - (k % 2) * 18, "bottom");
  }
  return agents;
}

// Where an agent's string lands on the website's edge.
function anchor(a: Agent) {
  const clampY = Math.min(SITE.y + SITE.h - 30, Math.max(SITE.y + 30, SITE.y + SITE.h / 2 + (a.y - H / 2) * 0.45));
  const clampX = Math.min(SITE.x + SITE.w - 30, Math.max(SITE.x + 30, a.x));
  if (a.side === "left") return { x: SITE.x, y: clampY };
  if (a.side === "right") return { x: SITE.x + SITE.w, y: clampY };
  if (a.side === "top") return { x: clampX, y: SITE.y };
  return { x: clampX, y: SITE.y + SITE.h };
}

// A smooth curved string from the agent to the site (a cubic Bezier curve).
function stringPath(a: Agent) {
  const end = anchor(a);
  if (a.side === "left" || a.side === "right") {
    const mid = (a.x + end.x) / 2;
    return `M${a.x},${a.y} C${mid},${a.y} ${mid},${end.y} ${end.x},${end.y}`;
  }
  const mid = (a.y + end.y) / 2;
  return `M${a.x},${a.y} C${a.x},${mid} ${end.x},${mid} ${end.x},${end.y}`;
}

// Little speech chips next to a few agents (from the demo run).
const CHIPS = [
  { x: 10, y: 18, text: "16 · student · “what does it build?”" },
  { x: 690, y: 504, text: "31 · founder · “joining.”" },
  { x: 700, y: 18, text: "45 · owner · “no pricing?”" },
];

export default function CrawlerSwarm() {
  const agents = makeAgents();

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <svg viewBox={`0 0 ${W} ${H}`} className="swarm h-auto w-full" role="img" aria-label="AI customers connected by strings to a website">
        <defs>
          <radialGradient id="agent-yes" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#96a6ff" />
            <stop offset="100%" stopColor="#3448f5" />
          </radialGradient>
          <radialGradient id="agent-maybe" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#7ea6ff" />
          </radialGradient>
          <radialGradient id="agent-no" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#c6cdd7" />
          </radialGradient>
          <filter id="site-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="18" stdDeviation="22" floodColor="#3448f5" floodOpacity="0.35" />
          </filter>
          <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3448f5" stopOpacity="0" />
            <stop offset="100%" stopColor="#3448f5" stopOpacity="0.18" />
          </linearGradient>
          <clipPath id="site-clip">
            <rect x={SITE.x} y={SITE.y} width={SITE.w} height={SITE.h} rx="18" />
          </clipPath>
        </defs>

        {/* 1. The strings (thin gray lines) */}
        <g fill="none" stroke="#8e96a3" strokeOpacity="0.45" strokeWidth="1">
          {agents.map((a, i) => (
            <path key={i} d={stringPath(a)} />
          ))}
        </g>

        {/* 2. Light "signals" flowing along the strings into the site.
               Each is the same curve drawn as a short dash that slides along it. */}
        <g fill="none" strokeWidth="2" strokeLinecap="round">
          {agents.map((a, i) => (
            <path
              key={i}
              d={stringPath(a)}
              pathLength={100}
              className="swarm-signal"
              stroke={a.verdict === "yes" ? "#3448f5" : "#7ea6ff"}
              style={{ animationDelay: `${-((i * 0.37) % 3)}s`, animationDuration: `${2.4 + (i % 5) * 0.35}s` }}
            />
          ))}
        </g>

        {/* 3. The website in the middle */}
        <g filter="url(#site-shadow)">
          <rect x={SITE.x} y={SITE.y} width={SITE.w} height={SITE.h} rx="18" fill="#ffffff" stroke="#ffffff" />
        </g>
        <g clipPath="url(#site-clip)">
          {/* browser top bar */}
          <rect x={SITE.x} y={SITE.y} width={SITE.w} height="30" fill="#eceff4" />
          {[0, 1, 2].map((d) => (
            <circle key={d} cx={SITE.x + 18 + d * 13} cy={SITE.y + 15} r="4" fill="#c6cdd7" />
          ))}
          <rect x={SITE.x + 70} y={SITE.y + 9} width="150" height="12" rx="6" fill="#ffffff" />
          {/* a sketch of a landing page: headline, text, button, cards */}
          <rect x={SITE.x + 30} y={SITE.y + 56} width="190" height="16" rx="4" fill="#27292e" />
          <rect x={SITE.x + 30} y={SITE.y + 78} width="140" height="16" rx="4" fill="#3448f5" />
          <rect x={SITE.x + 30} y={SITE.y + 106} width="210" height="6" rx="3" fill="#dde2e9" />
          <rect x={SITE.x + 30} y={SITE.y + 118} width="170" height="6" rx="3" fill="#dde2e9" />
          <rect x={SITE.x + 30} y={SITE.y + 138} width="86" height="22" rx="11" fill="#3448f5" />
          {[0, 1, 2].map((c) => (
            <rect key={c} x={SITE.x + 30 + c * 76} y={SITE.y + 180} width="66" height="70" rx="8" fill="#f4f6f9" stroke="#dde2e9" />
          ))}
          {/* the "scan line": the crawler reading the page top to bottom */}
          <rect x={SITE.x} y={SITE.y + 30} width={SITE.w} height="46" className="swarm-scan" fill="url(#scan)" />
        </g>

        {/* 4. The agents themselves (drawn last so they sit on top of their strings) */}
        <g>
          {agents.map((a, i) => (
            <g key={i} className="swarm-agent" style={{ animationDelay: `${-((i * 0.53) % 4)}s` }}>
              <circle cx={a.x} cy={a.y} r={a.r + 4} fill="#ffffff" fillOpacity="0.55" />
              <circle cx={a.x} cy={a.y} r={a.r} fill={FILL[a.verdict]} stroke="#ffffff" strokeWidth="1.5" />
            </g>
          ))}
        </g>

        {/* 5. A few speech chips (hidden on small screens: too tiny to read) */}
        <g className="hidden sm:inline">
          {CHIPS.map((c) => (
            <g key={c.text}>
              <rect x={c.x} y={c.y - 14} width={c.text.length * 6.7 + 20} height="24" rx="12" fill="#ffffff" fillOpacity="0.85" stroke="#ffffff" />
              <text x={c.x + 10} y={c.y + 2} fontSize="11" fill="#4c525c" fontFamily="var(--font-mono)">
                {c.text}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {/* Live-looking score badge pinned to the website */}
      <div className="card absolute left-1/2 top-[73%] flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-1.5 sm:bottom-[16%]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-600" />
        <span className="meta whitespace-nowrap text-slate-600">100 customers reading</span>
      </div>
    </div>
  );
}
