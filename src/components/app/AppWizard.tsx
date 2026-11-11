"use client";
// App tests on /app?kind=app (after the questions):
//   1. Screens   drop in onboarding + paywall screenshots, in order (+ optional version B)
//   2. Review    fix how each screen is labeled + the paywall facts (this is what makes it accurate)
//   3. Audience  who installs it, iPhone vs Android, where they found it
//   4. Launch
// Screenshots are shrunk IN THE BROWSER (max 1568px tall, JPEG) before upload:
// faster uploads, and that's the biggest size the AI uses anyway.
import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AudiencePicker from "@/components/AudiencePicker";
import Working from "@/components/Working";
import { MyMindsCards, SaveMind } from "@/components/dashboard/minds";
import { StarterNote, usePlan } from "@/components/dashboard/usePlan";
import { Arrow } from "@/components/landing/UrlForm";
import { Chevron, ErrorNote, Heading, Nav, PRESET_HINT, PresetCard, Stepper, Summary, waitForCrawl } from "@/components/wizard";
import PaywallEditor, { ChecksList } from "./PaywallEditor";
import { DEFAULT_AUDIENCE, PRESETS } from "@/lib/presets";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { checkPaywall } from "@/lib/app/checks";
import { APP_SOURCES, SCREEN_TYPES, type AppScreen, type AppSource, type PaywallFacts } from "@/lib/app/types";
import type { Audience, ProductProfile } from "@/lib/types";

const MAX_A = 15;
const MAX_B = 5;
type Shot = { id: string; file: File; preview: string };
type Screen = AppScreen & { image: string };

export default function AppWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const plan = usePlan(); // how many customers per crowd this account gets (25 starter / 100 full)
  const customers = plan?.customers ?? 100;
  const [shots, setShots] = useState<Shot[]>([]);
  const [shotsB, setShotsB] = useState<Shot[]>([]);
  const [busy, setBusy] = useState<null | "uploading" | "reading" | "starting">(null);
  const [error, setError] = useState<string | null>(null);
  const [crawlId, setCrawlId] = useState<string | null>(null);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [screensB, setScreensB] = useState<Screen[]>([]);
  const [paywall, setPaywall] = useState<PaywallFacts | null>(null);
  const [paywallB, setPaywallB] = useState<PaywallFacts | null>(null);
  const [profile, setProfile] = useState<ProductProfile | null>(null);
  const [suggested, setSuggested] = useState<Audience | null>(null);
  const [audience, setAudience] = useState<Audience>(DEFAULT_AUDIENCE);
  const [presetName, setPresetName] = useState("AI suggestion");
  const [iphonePct, setIphonePct] = useState(55);
  const [sources, setSources] = useState<AppSource[]>(["App Store search", "TikTok / Instagram ad"]);

  async function analyze() {
    setError(null);
    setBusy("uploading");
    try {
      const supabase = supabaseBrowser();
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Please sign in first.");
      const batch = randomId();
      const upload = async (shot: Shot, name: string) => {
        const jpeg = await shrink(shot.file);
        const { error: e } = await supabase.storage
          .from("screenshots")
          .upload(`${data.user!.id}/uploads/${batch}/${name}`, jpeg, { contentType: "image/jpeg", upsert: true });
        if (e) throw new Error(`Upload failed: ${e.message}`);
        return name;
      };
      const names = await Promise.all(shots.map((s, i) => upload(s, `${i + 1}.jpg`)));
      const namesB = await Promise.all(shotsB.map((s, i) => upload(s, `b${i + 1}.jpg`)));

      setBusy("reading");
      const res = await fetch("/api/app-crawls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch, screens: names, screensB: namesB }),
      });
      const started = await res.json();
      if (!res.ok) throw new Error(started.error);
      const d = await waitForCrawl(started.crawlId);
      setCrawlId(started.crawlId);
      setScreens(d.screens);
      setScreensB(d.screensB);
      setPaywall(d.paywall ?? (d.screens.some((s: Screen) => s.type === "paywall") ? emptyPaywall() : null));
      setPaywallB(d.paywallB ?? (d.screensB.length ? emptyPaywall() : null));
      const forParam = params.get("for");
      setProfile(forParam ? { ...d.profile, whoItsFor: forParam } : d.profile);
      if (d.audience) {
        setSuggested(d.audience);
        setAudience(d.audience);
        setPresetName("AI suggestion");
      } else {
        setPresetName("High school teens");
        setAudience(PRESETS["High school teens"]);
        setError(`We couldn't read everything automatically (${d.suggestError}). Please fill it in below.`);
      }
      setStep(1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function launch() {
    if (!crawlId || !profile) return;
    setBusy("starting");
    setError(null);
    try {
      const strip = (s: Screen): AppScreen => ({ file: s.file, type: s.type, title: s.title, summary: s.summary, asks: s.asks, cta: s.cta, canSkip: s.canSkip });
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crawlId,
          audience,
          profile,
          app: { screens: screens.map(strip), screensB: screensB.map(strip), paywall, paywallB, iphonePct, sources },
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

  const hasPaywall = screens.some((s) => s.type === "paywall");
  const checks = useMemo(() => checkPaywall(hasPaywall ? paywall : null), [paywall, hasPaywall]);
  const failedRules = checks.filter((c) => c.kind === "store rule" && !c.ok).length;

  // A paywall picked on the Review step needs facts to edit.
  const setScreen = (i: number, patch: Partial<Screen>) => {
    setScreens((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)));
    if (patch.type === "paywall" && !paywall) setPaywall(emptyPaywall());
  };

  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <Stepper step={step} canGoTo={(i) => i === 0 || Boolean(crawlId)} onGo={setStep} />

      {/* ---------- 1. Screens ---------- */}
      {step === 0 &&
        (busy === "uploading" || busy === "reading" ? (
          <Working
            label={busy === "uploading" ? `uploading ${shots.length + shotsB.length} screens` : `reading ${shots.length + shotsB.length} screens`}
            title="Reading your app…"
            expectSeconds={30}
            lines={[
              "Uploading your screenshots",
              "Labeling every screen in order",
              "Reading the paywall's small print",
              "Working out who it's for",
            ]}
          />
        ) : (
          <section className="space-y-8">
            <Heading n={1} title="Add your screens" sub="Screenshots of your onboarding, in the order people see them, ending with the paywall." />
            <Dropzone shots={shots} onChange={setShots} max={MAX_A} label="Onboarding + paywall" />
            <details className="card group" open={shotsB.length > 0}>
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-6 py-4">
                <span>
                  <span className="font-medium">A/B test a second paywall</span>
                  <span className="ml-2 text-sm text-muted">optional</span>
                </span>
                <Chevron />
              </summary>
              <div className="border-t border-line p-6">
                <p className="mb-4 text-sm text-muted">
                  The same customers see both versions, so the comparison is fair. Add only the paywall screen(s) of version B.
                </p>
                <Dropzone shots={shotsB} onChange={setShotsB} max={MAX_B} label="Version B paywall" />
              </div>
            </details>
            <ErrorNote error={error} />
            <div className="flex items-center justify-between gap-4 border-t border-line pt-6">
              <span className="text-sm text-muted">{shots.length ? `${shots.length} screen${shots.length === 1 ? "" : "s"}` : "No screens yet"}</span>
              <button onClick={analyze} disabled={!shots.length || busy !== null} className="btn btn-primary h-12 px-6">
                Read my screens <Arrow />
              </button>
            </div>
          </section>
        ))}

      {/* ---------- 2. Review ---------- */}
      {step === 1 && profile && (
        <section className="space-y-8">
          <Heading n={2} title="Check what we read" sub="Customers see exactly this, so fix anything that's off. The paywall facts matter most." />
          <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {screens.map((s, i) => (
              <li key={s.file} className="card overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.image} alt={`Screen ${i + 1}`} className="aspect-[9/16] w-full border-b border-line object-cover object-top" />
                <div className="space-y-2 p-4">
                  <p className="t-label">screen {i + 1}</p>
                  <label className="sr-only" htmlFor={`type-${i}`}>
                    Screen {i + 1} type
                  </label>
                  <select id={`type-${i}`} value={s.type} onChange={(e) => setScreen(i, { type: e.target.value as Screen["type"] })} className="field h-10 text-sm">
                    {SCREEN_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <p className="line-clamp-2 text-sm text-muted">{s.summary || s.title || "—"}</p>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={s.canSkip} onChange={(e) => setScreen(i, { canSkip: e.target.checked })} />
                    Can be skipped
                  </label>
                </div>
              </li>
            ))}
          </ol>

          {hasPaywall && paywall ? (
            <div className="card space-y-8 p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="t-h3">Paywall facts</h2>
                <span className={`pill ${failedRules ? "pill-no" : "pill-buy"}`}>
                  {failedRules ? `${failedRules} store rule${failedRules === 1 ? "" : "s"} may be flagged` : "store rules look fine"}
                </span>
              </div>
              <PaywallEditor facts={paywall} onChange={setPaywall} />
              <ChecksList checks={checks} />
            </div>
          ) : (
            <p className="card p-6 text-sm text-muted">
              No paywall among these screens. Mark one as &quot;paywall&quot; above, or the test will only measure who finishes your onboarding.
            </p>
          )}

          {screensB.length > 0 && paywallB && (
            <div className="card space-y-8 p-6">
              <h2 className="t-h3">Version B paywall facts</h2>
              <div className="flex gap-2 overflow-x-auto">
                {screensB.map((s) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={s.file} src={s.image} alt="Version B" className="h-48 rounded-lg border border-line" />
                ))}
              </div>
              <PaywallEditor facts={paywallB} onChange={setPaywallB} />
              <ChecksList checks={checkPaywall(paywallB)} />
            </div>
          )}
          <ErrorNote error={error} />
          <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} nextLabel="Looks right" />
        </section>
      )}

      {/* ---------- 3. Audience ---------- */}
      {step === 2 && (
        <section className="space-y-8">
          <Heading n={3} title="Who installs it?" sub="Pick a crowd, then tell us how they find the app." />
          <div className="grid gap-2 sm:grid-cols-2">
            {suggested && (
              <PresetCard name="AI suggestion" hint="Based on your screens" tag="auto" active={presetName === "AI suggestion"} onClick={() => (setAudience(suggested), setPresetName("AI suggestion"))} />
            )}
            <MyMindsCards presetName={presetName} onPick={(name, a) => (setAudience(a), setPresetName(name))} />
            {Object.entries(PRESETS).map(([name, preset]) => (
              <PresetCard
                key={name}
                name={name}
                hint={PRESET_HINT[name] ?? ""}
                tag={`${preset.ageMin}–${preset.ageMax}`}
                active={presetName === name}
                onClick={() => (setAudience(preset), setPresetName(name))}
              />
            ))}
          </div>
          <div className="card space-y-6 p-6">
            <div>
              <label htmlFor="iphone" className="field-label">
                iPhone vs Android: <span className="tabular-nums">{iphonePct}% iPhone</span>
              </label>
              <input id="iphone" type="range" min={0} max={100} step={5} value={iphonePct} onChange={(e) => setIphonePct(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
            </div>
            <div>
              <p className="field-label">Where they find the app</p>
              <div className="flex flex-wrap gap-2">
                {APP_SOURCES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={sources.includes(s)}
                    onClick={() => setSources((all) => (all.includes(s) ? all.filter((x) => x !== s) : [...all, s]))}
                    className="chip"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <details className="card group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-6 py-4">
              <span className="font-medium">Fine-tune the audience</span>
              <Chevron />
            </summary>
            <div className="border-t border-line p-6">
              <AudiencePicker audience={audience} onChange={(a) => (setAudience(a), setPresetName("Custom"))} suggested={suggested} />
            </div>
          </details>
          <SaveMind audience={audience} />
          <ErrorNote error={sources.length ? null : "Pick at least one place people find your app."} />
          <Nav onBack={() => setStep(1)} onNext={() => sources.length && setStep(3)} nextLabel="Next" />
        </section>
      )}

      {/* ---------- 4. Launch ---------- */}
      {step === 3 && profile && (
        <section className="space-y-8">
          <Heading n={4} title="Ready to launch" sub={`${customers} customers, run 3 times with different people, so you get an honest range instead of one lucky number.`} />
          <dl className="card grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Summary label="Screens" value={`${screens.length}${screensB.length ? ` + B (${screensB.length})` : ""}`} />
            <Summary label="Audience" value={`${customers} × 3 · ${presetName}`} />
            <Summary label="Goal" value={hasPaywall ? `Would ${profile.goal}` : "Finish onboarding"} />
          </dl>
          <StarterNote plan={plan} />
          <ErrorNote error={error} />
          <div className="flex items-center justify-between gap-4 border-t border-line pt-6">
            <button onClick={() => setStep(2)} className="btn btn-text">
              Back
            </button>
            <button onClick={launch} disabled={busy !== null} className="btn btn-primary h-12 px-8">
              {busy === "starting" ? "Starting…" : "Run the test"}
              {busy !== "starting" && <Arrow />}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

// ---------- the upload box: drag in, reorder, remove ----------
function Dropzone({ shots, onChange, max, label }: { shots: Shot[]; onChange: (s: Shot[]) => void; max: number; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const add = (files: FileList | null) => {
    if (!files) return;
    const images = [...files]
      .filter((f) => f.type.startsWith("image/"))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })); // "2.png" before "10.png"
    const added = images.map((file) => ({ id: randomId(), file, preview: URL.createObjectURL(file) }));
    onChange([...shots, ...added].slice(0, max));
  };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= shots.length) return;
    const next = [...shots];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => (e.preventDefault(), setOver(false), add(e.dataTransfer.files))}
        disabled={shots.length >= max}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors duration-150 ${
          over ? "border-fg bg-subtle" : "border-line-strong hover:border-fg"
        } disabled:opacity-50`}
      >
        <span className="font-medium">{shots.length >= max ? `That's the max (${max})` : `Drop ${label.toLowerCase()} screenshots here`}</span>
        <span className="text-sm text-muted">or click to choose · PNG or JPG · up to {max}</span>
      </button>
      <input ref={input} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => (add(e.target.files), (e.target.value = ""))} />
      {shots.length > 0 && (
        <ol className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {shots.map((s, i) => (
            <li key={s.id} className="w-24 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.preview} alt={`Screen ${i + 1}`} className="aspect-[9/16] w-full rounded-lg border border-line object-cover object-top" />
              <div className="mt-1 flex items-center justify-between text-xs">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-1 py-2 disabled:opacity-30" aria-label={`Move screen ${i + 1} earlier`}>
                  ←
                </button>
                <span className="t-label">{i + 1}</span>
                <button type="button" onClick={() => move(i, 1)} disabled={i === shots.length - 1} className="px-1 py-2 disabled:opacity-30" aria-label={`Move screen ${i + 1} later`}>
                  →
                </button>
              </div>
              <button type="button" onClick={() => onChange(shots.filter((x) => x.id !== s.id))} className="w-full text-xs text-muted underline">
                remove
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ---------- helpers ----------

// Shrink to max 1568px on the long side, as JPEG. The AI doesn't use more.
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1568 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read an image."))), "image/jpeg", 0.85));
}

function randomId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => chars[b % chars.length]).join("");
}

function emptyPaywall(): PaywallFacts {
  return {
    plans: [{ name: "Yearly", price: "", period: "year", trialDays: 0, highlighted: true }],
    closeButton: "visible",
    restorePurchases: false,
    termsLink: false,
    privacyLink: false,
    priceAfterTrialShown: false,
    autoRenewExplained: false,
    socialProof: [],
    headline: "",
    ctaText: "",
  };
}
