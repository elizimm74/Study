// Cleans what the browser sends for an app test before it's saved.
// Never trust the browser: only known screen files, known options, short text.
import { CLOSE_BUTTON, PERIODS, SCREEN_TYPES, APP_SOURCES, type AppScreen, type AppSettings, type PaywallFacts } from "./types";

const str = (x: unknown, max = 200) => (typeof x === "string" ? x.slice(0, max) : "");
const bool = (x: unknown) => x === true;
const list = (x: unknown, max = 8) => (Array.isArray(x) ? x.slice(0, max).map((v) => str(v, 120)).filter(Boolean) : []);
const oneOf = <T extends string>(x: unknown, options: readonly T[], fallback: T): T => (options.includes(x as T) ? (x as T) : fallback);

function screen(x: Partial<AppScreen>, file: string): AppScreen {
  return {
    file,
    type: oneOf(x.type, SCREEN_TYPES, "other"),
    title: str(x.title),
    summary: str(x.summary, 300),
    asks: list(x.asks),
    cta: str(x.cta, 80),
    canSkip: bool(x.canSkip),
  };
}

export function cleanPaywall(x: unknown): PaywallFacts | null {
  if (!x || typeof x !== "object") return null;
  const f = x as Partial<PaywallFacts>;
  return {
    plans: (Array.isArray(f.plans) ? f.plans : []).slice(0, 6).map((p) => ({
      name: str(p?.name, 60),
      price: str(p?.price, 30),
      period: oneOf(p?.period, PERIODS, "other"),
      trialDays: Math.min(90, Math.max(0, Math.round(Number(p?.trialDays) || 0))),
      highlighted: bool(p?.highlighted),
    })),
    closeButton: oneOf(f.closeButton, CLOSE_BUTTON, "visible"),
    restorePurchases: bool(f.restorePurchases),
    termsLink: bool(f.termsLink),
    privacyLink: bool(f.privacyLink),
    priceAfterTrialShown: bool(f.priceAfterTrialShown),
    autoRenewExplained: bool(f.autoRenewExplained),
    socialProof: list(f.socialProof),
    headline: str(f.headline),
    ctaText: str(f.ctaText, 80),
  };
}

// files / filesB: the screen files of the saved analysis, in order (the truth).
export function cleanAppSettings(raw: Partial<AppSettings>, files: string[], filesB: string[]): AppSettings {
  const byFile = (arr: unknown) => new Map((Array.isArray(arr) ? arr : []).map((s: Partial<AppScreen>) => [s?.file, s]));
  const a = byFile(raw.screens);
  const b = byFile(raw.screensB);
  const screensB = filesB.map((f) => ({ ...screen(b.get(f) ?? {}, f), type: "paywall" as const }));
  const pct = Math.round(Number(raw.iphonePct));
  return {
    screens: files.map((f) => screen(a.get(f) ?? {}, f)),
    screensB,
    paywall: cleanPaywall(raw.paywall),
    paywallB: screensB.length ? cleanPaywall(raw.paywallB) : null,
    iphonePct: Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 55,
    sources: (Array.isArray(raw.sources) ? raw.sources : []).filter((s) => APP_SOURCES.includes(s)).slice(0, 5),
  };
}
