// The shareable scorecard image (1200x630, the size X / Slack / iMessage show).
// It's drawn with next/og (built into Next.js, no extra package): the page is
// described with simple HTML-like elements and turned into a PNG on the server.
// Only headline numbers go on it, nothing private.
import { ImageResponse } from "next/og";

export type Shared = {
  kind: "website" | "app";
  host: string | null; // "mealmate.app" (null for apps)
  goal: string | null;
  score: number | null;
  total: number | null;
  blocker: string | null; // the #1 reason people said no
  low: number | null; // app tests: lowest/highest crowd, 0..1
  high: number | null;
};

const BLUE = "#1a2aa6";

// The site's chunky headline font (Archivo 900), fetched once and kept in memory.
// If Google Fonts can't be reached, the image still draws, just in a plainer font.
let fontPromise: Promise<ArrayBuffer | null> | null = null;
function loadFont() {
  fontPromise ??= (async () => {
    try {
      // An old browser name makes Google return a plain .ttf file (the image maker can't read woff2).
      const css = await (
        await fetch("https://fonts.googleapis.com/css2?family=Archivo:wght@900", {
          headers: { "User-Agent": "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1" },
        })
      ).text();
      const url = css.match(/src: url\((https:[^)]+)\) format\('truetype'\)/)?.[1];
      if (!url) return null;
      return await (await fetch(url)).arrayBuffer();
    } catch {
      fontPromise = null; // try again next time
      return null;
    }
  })();
  return fontPromise;
}

async function options() {
  const data = await loadFont();
  return {
    width: 1200,
    height: 630,
    fonts: data ? [{ name: "Archivo", data, weight: 900 as const, style: "normal" as const }] : [],
  };
}
const HEAVY = "Archivo, sans-serif"; // used on the big words only

// Three tilted claw scratches (the logo), as simple rotated bars.
function Claws({ color }: { color: string }) {
  return (
    <div style={{ display: "flex", transform: "rotate(14deg)" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 14, height: 70 + (i === 1 ? 18 : 0), background: color, borderRadius: 14, marginRight: 9, transform: "skewX(-6deg)" }} />
      ))}
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: BLUE, color: "#fff", padding: "52px 72px", fontFamily: "sans-serif" }}>
      {children}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Claws color="#fff" />
          <div style={{ display: "flex", fontSize: 42, fontFamily: HEAVY, marginLeft: 18, letterSpacing: -2 }}>crawler</div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#aeb7f6" }}>simulated customers · buying intent, not real purchases</div>
      </div>
    </div>
  );
}

export async function scorecardImage(s: Shared) {
  const pct = (x: number) => Math.round(x * 100);
  const range = s.kind === "app" && s.low !== null && s.high !== null && pct(s.low) !== pct(s.high) ? `range ${pct(s.low)}–${pct(s.high)}%` : null;
  const what = s.kind === "app" ? "app onboarding + paywall" : (s.host ?? "a website");
  const goal = s.goal ? `would ${s.goal}` : "would convert";
  return new ImageResponse(
    (
      <Frame>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 30, color: "#d6dbff", letterSpacing: 2, textTransform: "uppercase" }}>{what}</div>
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: 4 }}>
            <div style={{ display: "flex", fontSize: 230, fontFamily: HEAVY, letterSpacing: -12, lineHeight: 1 }}>{s.score ?? "?"}</div>
            <div style={{ display: "flex", fontSize: 80, fontFamily: HEAVY, color: "#8c98ee", marginBottom: 20, marginLeft: 10 }}>/{s.total ?? 100}</div>
          </div>
          <div style={{ display: "flex", fontSize: 52, fontFamily: HEAVY, marginTop: 0, letterSpacing: -1 }}>{goal}</div>
          <div style={{ display: "flex", marginTop: 20, fontSize: 30, color: "#d6dbff" }}>
            {s.blocker ? `Biggest blocker: ${s.blocker}` : ""}
            {range ? `${s.blocker ? "  ·  " : ""}${range}` : ""}
          </div>
        </div>
      </Frame>
    ),
    await options(),
  );
}

// The card shown when someone shares the home page.
export async function brandImage() {
  return new ImageResponse(
    (
      <Frame>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 98, fontFamily: HEAVY, letterSpacing: -5, lineHeight: 1 }}>See what stops customers from buying.</div>
          <div style={{ display: "flex", fontSize: 30, color: "#d6dbff", marginTop: 18 }}>Simulated customers test your website or app before launch day.</div>
        </div>
      </Frame>
    ),
    await options(),
  );
}
