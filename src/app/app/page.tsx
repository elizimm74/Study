"use client";
// /app: the testing tool as a 4-step wizard, one decision per screen:
//   1. Site      paste a URL (we crawl it)
//   2. Review    check what we understood
//   3. Audience  pick who reviews it
//   4. Launch    optional extras, then start
// "use client" means this page runs in the browser, so it can react to clicks.
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AudiencePicker from "@/components/AudiencePicker";
import ProfileEditor from "@/components/ProfileEditor";
import ExplorePanel from "@/components/ExplorePanel";
import BotRush from "@/components/landing/BotRush";
import { Arrow } from "@/components/landing/UrlForm";
import { DEFAULT_AUDIENCE, PRESETS } from "@/lib/presets";
import type { Audience, Credentials, ExploreSettings, ProductProfile } from "@/lib/types";

type CrawlInfo = {
  id: string;
  url: string;
  pages: { step: string; url: string; title: string; screenshots: string[]; note?: string }[];
};

const STEPS = ["Site", "Review", "Audience", "Launch"] as const;
// One plain line under each preset (no emoji icons).
const PRESET_HINT: Record<string, string> = {
  "High school teens": "Phones, short attention, rarely a card",
  "Gen Z students": "Price-sensitive, social-first",
  "Solo SaaS founders": "Skeptical, compare everything",
  "Busy moms": "Short on time, want it to just work",
  "Small business owners": "Care about ROI and support",
};

export default function AppPage() {
  // Suspense: this page reads ?url= from the address bar.
  return (
    <Suspense>
      <Wizard />
    </Suspense>
  );
}

function Wizard() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState(params.get("url") ?? "");
  const [busy, setBusy] = useState<null | "analyzing" | "starting">(null);
  const [error, setError] = useState<string | null>(null);
  const [crawl, setCrawl] = useState<CrawlInfo | null>(null);
  const [profile, setProfile] = useState<ProductProfile | null>(null);
  const [suggested, setSuggested] = useState<Audience | null>(null);
  const [audience, setAudience] = useState<Audience>(DEFAULT_AUDIENCE);
  const [presetName, setPresetName] = useState<string>("AI suggestion");
  const [explore, setExplore] = useState<ExploreSettings>({ enabled: false, task: "", access: "public", startUrl: "", reputation: false });
  // The test account stays in this page's memory and is sent only to start the test.
  const [credentials, setCredentials] = useState<Credentials>({ email: "", password: "" });
  const [ownsProduct, setOwnsProduct] = useState(false);
  const autoStarted = useRef(false);

  async function analyze(target = url) {
    setBusy("analyzing");
    setError(null);
    try {
      // 1) Queue the analysis. 2) Check every 1.5s until a worker finishes it.
      const res = await fetch("/api/crawls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const started = await res.json();
      if (!res.ok) throw new Error(started.error);
      const data = await waitForCrawl(started.crawlId);
      setCrawl(data.crawl);
      // From onboarding (?for=...): the founder's own "who it's for" beats the AI's guess.
      const forParam = params.get("for");
      setProfile(forParam && data.profile ? { ...data.profile, whoItsFor: forParam } : data.profile);
      setExplore((e) => ({ ...e, task: data.profile?.tryTask || e.task, startUrl: data.crawl.url }));
      if (data.audience) {
        setSuggested(data.audience);
        setAudience(data.audience);
        setPresetName("AI suggestion");
      } else {
        setSuggested(null);
        setPresetName("High school teens");
        setAudience(PRESETS["High school teens"]);
        setError(`We couldn't auto-fill everything (${data.suggestError}). Check it below.`);
      }
      setStep(1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  // Came from the landing page with ?url=...? Start right away.
  useEffect(() => {
    const fromLanding = params.get("url");
    if (fromLanding && !autoStarted.current) {
      autoStarted.current = true;
      void analyze(fromLanding);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function launch() {
    if (!crawl || !profile) return;
    setBusy("starting");
    setError(null);
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crawlId: crawl.id,
          audience,
          profile,
          explore,
          credentials: explore.enabled && explore.access === "account" ? credentials : undefined,
          ownsProduct,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/run/${data.testId}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <Stepper step={step} canGoTo={(i) => i === 0 || Boolean(crawl)} onGo={setStep} />

      {/* ---------- 1. Site ---------- */}
      {step === 0 &&
        (busy === "analyzing" ? (
          <Reading url={url} />
        ) : (
          <section className="space-y-8">
            <Heading n={1} title="What are we testing?" sub="Paste your landing page. We'll open it like a first-time visitor." />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void analyze();
              }}
              className="flex max-w-xl flex-col gap-2 sm:flex-row"
            >
              <label htmlFor="site-url" className="sr-only">
                Your website
              </label>
              <div className="relative flex-1">
                <span className="t-label field-prefix pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" aria-hidden>
                  https://
                </span>
                <input
                  id="site-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="yourstartup.com"
                  className="field h-12 pl-20"
                  inputMode="url"
                  required
                  autoFocus
                />
              </div>
              <button className="btn btn-primary h-12 px-6">Analyze</button>
            </form>
            <ErrorNote error={error} />
          </section>
        ))}

      {/* ---------- 2. Review ---------- */}
      {step === 1 && crawl && profile && (
        <section className="space-y-8">
          <Heading n={2} title="Here's what we found" sub="Every AI customer reads this. Fix anything that's off." />
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {(["hero", "pricing", "signup"] as const).map((s) => {
              const p = crawl.pages.find((x) => x.step === s);
              return (
                <figure key={s} className="card overflow-hidden">
                  {p?.screenshots[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.screenshots[0]} alt={`${s} page`} className="aspect-[16/10] w-full border-b border-line object-cover object-top" />
                  ) : (
                    <div className="flex aspect-[16/10] items-center justify-center border-b border-line bg-subtle text-xs text-faint">not found</div>
                  )}
                  <figcaption className="flex items-center justify-between gap-2 p-2 sm:px-4">
                    <span className="truncate text-sm">{s === "hero" ? "Landing" : s === "pricing" ? "Pricing" : "Signup"}</span>
                    <span className={`pill hidden sm:inline-flex ${p ? "" : "pill-no"}`}>{p ? "found" : "missing"}</span>
                  </figcaption>
                </figure>
              );
            })}
          </div>
          <div className="card p-6">
            <ProfileEditor profile={profile} onChange={setProfile} />
          </div>
          <ErrorNote error={error} />
          <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} nextLabel="Looks right" />
        </section>
      )}

      {/* ---------- 3. Audience ---------- */}
      {step === 2 && (
        <section className="space-y-8">
          <Heading n={3} title="Who should review it?" sub="Pick a crowd. You can fine-tune every detail below." />
          <div className="grid gap-2 sm:grid-cols-2">
            {suggested && (
              <PresetCard
                name="AI suggestion"
                hint="Based on what your site says"
                tag="auto"
                active={presetName === "AI suggestion"}
                onClick={() => {
                  setAudience(suggested);
                  setPresetName("AI suggestion");
                }}
              />
            )}
            {Object.entries(PRESETS).map(([name, preset]) => (
              <PresetCard
                key={name}
                name={name}
                hint={PRESET_HINT[name] ?? ""}
                tag={`${preset.ageMin}–${preset.ageMax}`}
                active={presetName === name}
                onClick={() => {
                  setAudience(preset);
                  setPresetName(name);
                }}
              />
            ))}
          </div>
          <details className="card group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-6 py-4">
              <span className="font-medium">Fine-tune the audience</span>
              <span className="flex items-center gap-2 text-sm text-faint">
                <span className="hidden sm:inline">age, budget, mindset, device</span>
                <Chevron />
              </span>
            </summary>
            <div className="border-t border-line p-6">
              <AudiencePicker
                audience={audience}
                onChange={(a) => {
                  setAudience(a);
                  setPresetName("Custom");
                }}
                suggested={suggested}
              />
            </div>
          </details>
          <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="Next" />
        </section>
      )}

      {/* ---------- 4. Launch ---------- */}
      {step === 3 && crawl && profile && (
        <section className="space-y-8">
          <Heading n={4} title="Ready to launch" sub="Optional: let an AI explorer actually use your product first." />
          <dl className="card grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Summary label="Site" value={crawl.url.replace(/^https?:\/\//, "").replace(/\/$/, "")} />
            <Summary label="Audience" value={`100 · ${presetName}`} />
            <Summary label="Goal" value={`Would ${profile.goal}`} />
          </dl>
          <div className="card p-6">
            <ExplorePanel
              settings={explore}
              onChange={setExplore}
              credentials={credentials}
              onCredentials={setCredentials}
              ownsProduct={ownsProduct}
              onOwnsProduct={setOwnsProduct}
            />
          </div>
          <ErrorNote error={error} />
          <div className="flex items-center justify-between gap-4 border-t border-line pt-6">
            <button onClick={() => setStep(2)} className="btn btn-text">
              Back
            </button>
            <button onClick={launch} disabled={busy !== null} className="btn btn-primary h-12 px-8">
              {busy === "starting" ? "Starting…" : "Run 100 customers"}
              {busy !== "starting" && <Arrow />}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

// ---------- pieces ----------

function Stepper({ step, canGoTo, onGo }: { step: number; canGoTo: (i: number) => boolean; onGo: (i: number) => void }) {
  return (
    <nav aria-label="Steps" className="grid grid-cols-4 gap-2">
      {STEPS.map((label, i) => (
        <button
          key={label}
          type="button"
          disabled={!canGoTo(i)}
          onClick={() => onGo(i)}
          aria-current={i === step ? "step" : undefined}
          className="flex min-h-11 flex-col justify-end gap-2 text-left disabled:cursor-default"
        >
          <span className={`h-0.5 rounded-full transition-colors duration-200 ${i <= step ? "bg-fg" : "bg-line"}`} />
          <span className={`text-xs sm:text-sm ${i === step ? "font-medium text-fg" : "text-faint"}`}>
            <span className="hidden sm:inline">{i + 1}. </span>
            {label}
          </span>
        </button>
      ))}
    </nav>
  );
}

function Heading({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <div>
      <p className="t-label">step {n} of 4</p>
      <h1 className="t-h1 mt-4">{title}</h1>
      <p className="t-lead mt-4">{sub}</p>
    </div>
  );
}

function Nav({ onBack, onNext, nextLabel }: { onBack: () => void; onNext: () => void; nextLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line pt-6">
      <button onClick={onBack} className="btn btn-text">
        Back
      </button>
      <button onClick={onNext} className="btn btn-secondary px-6">
        {nextLabel}
      </button>
    </div>
  );
}

function PresetCard({ name, hint, tag, active, onClick }: { name: string; hint: string; tag: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-20 items-start justify-between gap-4 rounded-xl border p-4 text-left transition-colors duration-150 ${
        active ? "border-fg bg-subtle" : "border-line bg-bg hover:border-line-strong"
      }`}
    >
      <span>
        <span className="block font-medium">{name}</span>
        <span className="mt-1 block text-sm text-muted">{hint}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="t-label">{tag}</span>
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? "border-fg bg-fg text-bg" : "border-line-strong"}`}
          aria-hidden
        >
          {active && (
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </span>
    </button>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 p-6">
      <dt className="t-label">{label}</dt>
      <dd className="mt-2 truncate font-medium">{value}</dd>
    </div>
  );
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform duration-200 group-open:rotate-180" aria-hidden>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="max-w-xl rounded-lg border border-line-strong bg-subtle p-4 text-sm">
      <span className="font-medium">Heads up: </span>
      {error}
    </p>
  );
}

// While the worker reads the site: a live checklist with a timer.
function Reading({ url }: { url: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const lines = [
    "Opening your site like a first-time visitor",
    "Looking for pricing and signup",
    "Taking screenshots on a laptop and a phone",
    "Working out what you sell and who it's for",
  ];
  // Light up one line every ~5 seconds, so it feels alive (the real work runs in parallel).
  const active = Math.min(lines.length - 1, Math.floor(seconds / 5));
  return (
    <section className="space-y-8" aria-live="polite">
      <div>
        <p className="t-label flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
          reading {url.replace(/^https?:\/\//, "")} · {seconds}s
        </p>
        <h1 className="t-h1 mt-4">Reading your site…</h1>
        <p className="t-lead mt-4">Usually 15–30 seconds.</p>
      </div>
      {/* the bots animation, live: the bar is an estimate from the timer (most sites take ~25s) */}
      <BotRush live={{ progress: Math.min(0.92, seconds / 25), label: "reading your site" }} />
      <ol className="card divide-y divide-line">
        {lines.map((l, i) => (
          <li key={l} className={`flex items-center gap-4 px-6 py-4 text-sm ${i <= active ? "text-fg" : "text-faint"}`}>
            <span className={`h-2 w-2 shrink-0 rounded-full ${i < active ? "bg-fg" : i === active ? "animate-pulse bg-accent" : "bg-line-strong"}`} aria-hidden />
            {l}
          </li>
        ))}
      </ol>
    </section>
  );
}

// Checks the analysis every 1.5 seconds until it's done (about 10-30s), max 3 minutes.
async function waitForCrawl(crawlId: string) {
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await fetch(`/api/crawls/${crawlId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.status === "done") return data;
    if (data.status === "error") throw new Error(data.error ?? "Couldn't read that site.");
  }
  throw new Error("Reading the site is taking too long. Is the worker running?");
}
