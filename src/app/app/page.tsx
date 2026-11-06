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
import { DEFAULT_AUDIENCE, PRESETS } from "@/lib/presets";
import type { Audience, Credentials, ExploreSettings, ProductProfile } from "@/lib/types";

type CrawlInfo = {
  id: string;
  url: string;
  pages: { step: string; url: string; title: string; screenshots: string[]; note?: string }[];
};

const STEPS = ["Site", "Review", "Audience", "Launch"] as const;
const PRESET_EMOJI: Record<string, string> = {
  "High school teens": "🎒",
  "Gen Z students": "🎓",
  "Solo SaaS founders": "🧑‍💻",
  "Busy moms": "🍼",
  "Small business owners": "🏪",
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
      setProfile(data.profile);
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
    <div className="mx-auto max-w-3xl space-y-8">
      <Stepper step={step} canGoTo={(i) => i === 0 || Boolean(crawl)} onGo={setStep} />

      {/* ---------- 1. Site ---------- */}
      {step === 0 &&
        (busy === "analyzing" ? (
          <Reading url={url} />
        ) : (
          <section className="space-y-6 pt-4 text-center">
            <p className="meta text-indigo-600">{"//"} step 1 of 4</p>
            <h1 className="display text-5xl sm:text-6xl">What are we testing?</h1>
            <p className="text-slate-600">Paste your landing page. We&apos;ll open it like a first-time visitor.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void analyze();
              }}
              className="card mx-auto flex max-w-xl items-center gap-2 rounded-full p-1.5 pl-5"
            >
              <span className="meta text-slate-400">https://</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yourstartup.com"
                className="min-w-0 flex-1 bg-transparent py-2.5 outline-none placeholder:text-slate-400"
                required
                autoFocus
              />
              <button className="btn px-5 py-2.5 text-sm">
                Analyze →
              </button>
            </form>
            <ErrorNote error={error} />
          </section>
        ))}

      {/* ---------- 2. Review ---------- */}
      {step === 1 && crawl && profile && (
        <section className="space-y-6">
          <Heading n={2} title="Here's what we found" sub="Every AI customer reads this. Fix anything that's off." />
          <div className="grid grid-cols-3 gap-2">
            {(["hero", "pricing", "signup"] as const).map((s) => {
              const p = crawl.pages.find((x) => x.step === s);
              return (
                <div key={s} className="card overflow-hidden p-1.5">
                  {p?.screenshots[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.screenshots[0]} alt={`${s} page`} className="aspect-[16/10] w-full rounded-xl object-cover object-top" />
                  ) : (
                    <div className="flex aspect-[16/10] items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">not found</div>
                  )}
                  <p className="meta px-1.5 pb-1 pt-2 text-slate-500">
                    {p ? "✓" : "✗"} {s === "hero" ? "landing" : s}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="card p-5">
            <ProfileEditor profile={profile} onChange={setProfile} />
          </div>
          <ErrorNote error={error} />
          <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} nextLabel="Looks right →" />
        </section>
      )}

      {/* ---------- 3. Audience ---------- */}
      {step === 2 && (
        <section className="space-y-6">
          <Heading n={3} title="Who should review it?" sub="Pick a crowd. You can fine-tune every detail below." />
          <div className="grid gap-2 sm:grid-cols-3">
            {suggested && (
              <PresetCard
                emoji="✱"
                name="AI suggestion"
                hint="based on your site"
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
                emoji={PRESET_EMOJI[name] ?? "•"}
                name={name}
                hint={`ages ${preset.ageMin}–${preset.ageMax}`}
                active={presetName === name}
                onClick={() => {
                  setAudience(preset);
                  setPresetName(name);
                }}
              />
            ))}
          </div>
          <details className="card group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
              Fine-tune the audience
              <span className="meta text-slate-400 group-open:hidden">age, budget, mindset, device… +</span>
            </summary>
            <div className="mt-5">
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
          <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="Next →" />
        </section>
      )}

      {/* ---------- 4. Launch ---------- */}
      {step === 3 && crawl && profile && (
        <section className="space-y-6">
          <Heading n={4} title="Ready to launch" sub="Add an AI explorer if you want it to actually use your product first." />
          <div className="panel rounded-3xl p-6">
            <p className="meta text-white/40">{"//"} your test</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Summary label="site" value={crawl.url.replace(/^https?:\/\//, "").replace(/\/$/, "")} />
              <Summary label="audience" value={`100 · ${presetName.toLowerCase()}`} />
              <Summary label="goal" value={`would ${profile.goal}`} />
            </div>
          </div>
          <div className="card p-5">
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
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => setStep(2)} className="rounded-full px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-900">
              ← Back
            </button>
            <button
              onClick={launch}
              disabled={busy !== null}
              className="btn display flex-1 px-6 py-4 text-xl sm:flex-none sm:px-10"
            >
              {busy === "starting" ? "Launching…" : "Run 100 customers ✱"}
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
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <button
          key={label}
          type="button"
          disabled={!canGoTo(i)}
          onClick={() => onGo(i)}
          className="group flex flex-1 flex-col gap-2 text-left disabled:cursor-default"
        >
          <span className={`h-1 rounded-full transition-colors ${i <= step ? "bg-indigo-600" : "bg-slate-200"}`} />
          <span className={`meta ${i === step ? "text-slate-900" : "text-slate-400"}`}>
            0{i + 1} {label.toLowerCase()}
          </span>
        </button>
      ))}
    </div>
  );
}

function Heading({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <div>
      <p className="meta text-indigo-600">{"//"} step {n} of 4</p>
      <h1 className="display mt-2 text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-2 text-slate-600">{sub}</p>
    </div>
  );
}

function Nav({ onBack, onNext, nextLabel }: { onBack: () => void; onNext: () => void; nextLabel: string }) {
  return (
    <div className="flex items-center justify-between">
      <button onClick={onBack} className="rounded-full px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-900">
        ← Back
      </button>
      <button onClick={onNext} className="btn px-6 py-3 text-sm">
        {nextLabel}
      </button>
    </div>
  );
}

function PresetCard({ emoji, name, hint, active, onClick }: { emoji: string; name: string; hint: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[1.25rem] border p-4 text-left transition ${
        active ? "border-indigo-600 bg-indigo-50 shadow-[0_0_0_3px_rgba(52,72,245,0.15)]" : "border-slate-200 bg-white hover:border-slate-400"
      }`}
    >
      <span className="text-2xl">{emoji}</span>
      <span className="mt-3 block font-semibold">{name}</span>
      <span className="meta text-slate-500">{hint}</span>
    </button>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="meta text-white/40">{label}</p>
      <p className="mt-1 truncate font-semibold">{value}</p>
    </div>
  );
}

function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="card mx-auto max-w-xl border-indigo-200 bg-indigo-50 p-4 text-left text-sm text-slate-800">⚠ {error}</p>;
}

// While the worker reads the site: a dark "live" panel with a timer.
function Reading({ url }: { url: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const lines = [
    "opening your site like a first-time visitor",
    "looking for pricing and signup (links, buttons, pop-ups)",
    "taking screenshots on a laptop and a phone",
    "figuring out what you sell and who it's for",
  ];
  return (
    <section className="panel space-y-6 rounded-3xl p-8">
      <div className="meta flex justify-between text-white/40">
        <span>
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
          reading {url.replace(/^https?:\/\//, "")}
        </span>
        <span>{seconds}s</span>
      </div>
      <p className="display text-4xl sm:text-5xl">Reading your site…</p>
      <ul className="space-y-2 font-mono text-[13px] text-white/60">
        {lines.map((l) => (
          <li key={l}>
            <span className="text-sky-400">→</span> {l}
          </li>
        ))}
      </ul>
      <p className="meta text-white/30">usually 15–30 seconds</p>
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
