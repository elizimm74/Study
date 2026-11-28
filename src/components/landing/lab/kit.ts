// Shared drawing helpers for the two scroll-driven "lab" animations on the home page
// (01 Customer simulation, 03 Behavioral patterns). Plain <canvas> 2D drawing, no library.
// Colours: black and white only (founder, 2026-11-25: "gray with black and white lettering, no blue
// or yellow"). The old names stay so the scenes didn't need rewriting: COBALT = mid gray,
// LIME = bright green #3e4a6e (v22), GREY = dark gray.

export const INK = "#111a10"; // deep moss (v30: from the hero photo) behind both animations
export const WHITE = "#f4f6fb";
export const COBALT = "#8e8e8a"; // mid gray: "hesitate" dots, the sketch's button (monochrome since 2026-11-25)
export const COBALT_SOFT = "#c8c8c4"; // light gray for thin lines and small labels on black
export const LIME = "#b9d6a6"; // light moss (v31: matches the site's moss "buy" colour; light so it reads on the dark panel)
export const GREY = "#4f4f4c"; // dark gray: "leave"
export const FONT = '"Space Grotesk", Geist, ui-sans-serif, system-ui, sans-serif';

/** A tiny seeded random generator, so the picture is identical on every visit. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** smooth start and smooth stop */
export const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
export const easeInOut = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/**
 * How far stage `k` (1..4) has blended in, for scene progress `s` (0..4). Each particle passes its
 * own small `delay` (0..1), so a crowd moves as a wave instead of all at once.
 */
export function stageWeight(s: number, k: number, delay = 0) {
  // done by ~70% of the stage, so each picture holds still for a moment before the next one
  return smooth((s - (k - 1) - delay * 0.25) / 0.45);
}

/** Pre-drawn soft dots (drawing an image is much faster than drawing hundreds of circles). */
export function dotSprite(color: string, size = 32, hardness = 0.55): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, color);
  grad.addColorStop(hardness, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/** A wide soft halo (for the glowing particles). */
export function glowSprite(color: string, size = 128): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, color);
  grad.addColorStop(0.18, color);
  grad.addColorStop(0.45, withAlpha(color, 0.22));
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/** "#f4f4f1" + 0.4 -> "rgba(255,255,255,0.4)" */
export function withAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function draw(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, r: number, alpha: number) {
  if (alpha <= 0.01 || r <= 0) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
}

/** Tiny uppercase label, letter-spaced (the scientific "instrument" look). */
export function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  alpha: number,
  opts: { align?: CanvasTextAlign; size?: number; weight?: number; spacing?: number; upper?: boolean; fit?: number } = {},
) {
  if (alpha <= 0.01) return;
  const { align = "left", size = 10.5, weight = 500, spacing = 0.14, upper = true, fit } = opts;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  // letterSpacing on canvas is fairly new; where it's missing the label is simply tighter
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ("letterSpacing" in c) c.letterSpacing = `${spacing * size}px`;
  const shown = upper ? text.toUpperCase() : text;
  if (fit) {
    // keep the whole label on screen (12px margin each side)
    const tw = ctx.measureText(shown).width;
    const left = align === "center" ? x - tw / 2 : align === "right" ? x - tw : x;
    x += Math.max(0, 12 - left) - Math.max(0, left + tw - (fit - 12));
  }
  ctx.fillText(shown, x, y);
  if ("letterSpacing" in c) c.letterSpacing = "0px";
}

/** Points packed in a disc like sunflower seeds (even spacing, no overlaps). */
export function seedDisc(k: number, spacing: number): [number, number] {
  const r = spacing * Math.sqrt(k + 0.5);
  const a = k * 2.399963; // the golden angle
  return [Math.cos(a) * r, Math.sin(a) * r];
}

/** The focal point of the picture: centre-right on desktop, lower-centre on phones (the notes sit on top). */
export function frame(w: number, h: number) {
  const mobile = w < 760;
  if (mobile) return { mobile, cx: w / 2, cy: h * 0.66, R: Math.min(w * 0.4, h * 0.24) };
  // desktop: fit the picture between the text blocks at the top (~200px) and the footnote,
  // so short laptop screens get a smaller picture instead of one running under the notes
  const top = 200;
  const bottom = h - 48;
  return { mobile, cx: w * 0.56, cy: (top + bottom) / 2, R: Math.max(120, Math.min(w * 0.25, (bottom - top) / 2)) };
}

export type Mix = { buy: number; maybe: number; no: number }; // shares, adding up to 1

export type Scene = (ctx: CanvasRenderingContext2D, s: number, t: number) => void;
export type SceneFactory = (w: number, h: number, mix: Mix) => Scene;
