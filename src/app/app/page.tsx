"use client";
// /app: the testing tool. The questions come first (website or app, the URL,
// who it's for), then a 4-step wizard, one decision per screen:
//   1. Questions → we read the site (or the app's screenshots)
//   2. Review    check what we understood
//   3. Audience  pick who reviews it
//   4. Launch    optional extras, then start
// "use client" means this page runs in the browser, so it can react to clicks.
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AudiencePicker from "@/components/AudiencePicker";
import ProfileEditor from "@/components/ProfileEditor";
import ExplorePanel from "@/components/ExplorePanel";
import Working from "@/components/Working";
import Onboarding from "@/components/Onboarding";
import AppWizard from "@/components/app/AppWizard";
import { Chevron, ErrorNote, Heading, Nav, PRESET_HINT, PresetCard, Stepper, Summary, waitForCrawl } from "@/components/wizard";
import { Arrow } from "@/components/landing/UrlForm";
import { DEFAULT_AUDIENCE, PRESETS } from "@/lib/presets";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import type { Audience, Credentials, ExploreSettings, ProductProfile } from "@/lib/types";

type CrawlInfo = {
  id: string;
  url: string;
  pages: { step: string; url: string; title: string; screenshots: string[]; note?: string }[];
};

export default function AppPage() {
  // Suspense: this page reads ?url= from the address bar.
  return (
    <Suspense>
      <Entry />
    </Suspense>
  );
}

// The questions always come first. Then:
//   ?url=...    a website test (the analysis starts right away)
//   ?kind=app   an app test (upload screenshots next)
function Entry() {
  const params = useSearchParams();
  // Answered onboarding before signing up? Save those answers to the account now.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem("crawler-onboarding");
    } catch {}
    if (!saved || !AUTH_ENABLED) return;
    sessionStorage.removeItem("crawler-onboarding");
    void supabaseBrowser()
      .auth.updateUser({ data: { onboarded: true, onboarding: JSON.parse(saved) } })
      .catch(() => null);
  }, []);

  if (params.get("kind") === "app") return <AppWizard key={params.toString()} />;
  if (params.get("url")) return <Wizard key={params.toString()} />;
  return <Onboarding startUrl="" />;
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
          <Working
            label={`reading ${url.replace(/^https?:\/\//, "").replace(/\/$/, "")}`}
            title="Reading your site…"
            lines={[
              "Opening it like a first-time visitor",
              "Finding pricing and signup",
              "Screenshots on a laptop and a phone",
              "Working out what you sell and who it's for",
            ]}
          />
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
