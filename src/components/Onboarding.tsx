"use client";
// The questions asked BEFORE every test (and as first-run onboarding):
// ONE screen, ONE required answer: website or app (+ the URL). Fewer questions = more people
// reach their result. What it is, when it launches and who it's for are OPTIONAL (a fold that
// opens on request); they only make the simulated customers a bit more accurate.
// It's the first thing new visitors see (the home page button), no account needed.
// The answers are saved on the account (Supabase "user metadata"), which also marks
// onboarding as done. Signed-out visitors sign up at the end (on the way to the test).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { Arrow } from "@/components/landing/UrlForm";

const WHEN = ["This week", "This month", "Later", "Already live"];
const WHO = ["Students", "Founders", "Parents", "Small businesses", "Developers", "Everyone"];

export default function Onboarding({ startUrl, startKind = "website", mind, preset }: { startUrl: string; startKind?: "website" | "app"; mind?: string; preset?: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<"website" | "app">(startKind);
  const [url, setUrl] = useState(startUrl);
  const [what, setWhat] = useState("");
  const [when, setWhen] = useState("");
  const [who, setWho] = useState("");
  const [whoText, setWhoText] = useState("");
  const [busy, setBusy] = useState(false);

  const audience = whoText.trim() || who; // their own words win over the chip
  const canNext = kind === "app" || url.trim().length > 3;

  async function finish() {
    setBusy(true);
    const answers = { kind, url: kind === "website" ? url : "", what, when, who: audience };
    if (AUTH_ENABLED) {
      // Signed in: save the answers + "onboarded" on the account now.
      // Signed out: keep them in this tab; the test page saves them right after sign-up.
      const { data } = await supabaseBrowser().auth.getUser();
      if (data.user) {
        await supabaseBrowser().auth.updateUser({ data: { onboarded: true, onboarding: answers } }).catch(() => null);
      } else {
        try {
          sessionStorage.setItem("crawler-onboarding", JSON.stringify(answers));
        } catch {
          // storage blocked: the answers just aren't saved to the account
        }
      }
    }
    // Website: the analysis starts right away. App: next you upload screenshots.
    const params = new URLSearchParams(kind === "app" ? { kind: "app" } : { url: url.trim() });
    if (audience) params.set("for", audience);
    if (what.trim()) params.set("what", what.trim());
    if (mind) params.set("mind", mind); // from the dashboard: "Test with this mind"
    if (preset) params.set("preset", preset);
    router.push(`/app?${params}`); // signed out → sign-up first, then the test starts
  }

  function next(e: React.FormEvent) {
    e.preventDefault();
    if (canNext) void finish();
  }

  return (
    <form onSubmit={next} className="paper mx-auto max-w-lg px-6 py-12 sm:px-10">
      <p className="t-label">takes about a minute</p>
      <h1 className="t-h2 mt-2">What are you testing?</h1>
      <div className="mt-6 grid grid-cols-2 gap-2" role="radiogroup" aria-label="What are you testing?">
        {(
          [
            ["website", "A website", "Landing page, pricing, signup"],
            ["app", "A mobile app", "Onboarding + paywall screenshots"],
          ] as const
        ).map(([k, name, hint]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-xl border p-4 text-left transition-colors duration-150 ${
              kind === k ? "border-accent bg-subtle ring-1 ring-accent" : "border-line hover:border-line-strong"
            }`}
          >
            <span className="block font-medium">{name}</span>
            <span className="mt-1 block text-sm text-muted">{hint}</span>
          </button>
        ))}
      </div>

      {kind === "website" ? (
        <>
          <label htmlFor="ob-url" className="field-label mt-6">
            The page people land on
          </label>
          <div className="relative">
            <span className="t-label field-prefix pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" aria-hidden>
              https://
            </span>
            <input
              id="ob-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="yourstartup.com"
              className="field h-12 pl-20"
              inputMode="url"
              autoFocus
            />
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm text-muted">After this you&apos;ll drop in screenshots of your onboarding and paywall, in order.</p>
      )}

      {/* optional: makes the simulated customers a little more accurate */}
      <details className="mt-6 rounded-xl border border-line">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium">
          Add details for a sharper test
          <span className="text-faint">optional</span>
        </summary>
        <div className="space-y-5 border-t border-line p-4">
          <div>
            <label htmlFor="ob-what" className="field-label">What is it?</label>
            <input
              id="ob-what"
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder={kind === "app" ? "e.g. a habit tracker for students" : "e.g. a meal-planning site for busy parents"}
              className="field"
            />
          </div>
          <div>
            <p className="field-label">Launching</p>
            <div className="flex flex-wrap gap-2">
              {WHEN.map((w) => (
                <button key={w} type="button" aria-pressed={when === w} onClick={() => setWhen(when === w ? "" : w)} className="chip">
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="field-label">Who is it for?</p>
            <div className="flex flex-wrap gap-2">
              {WHO.map((w) => (
                <button key={w} type="button" aria-pressed={who === w} onClick={() => setWho(who === w ? "" : w)} className="chip">
                  {w}
                </button>
              ))}
            </div>
            <input
              value={whoText}
              onChange={(e) => setWhoText(e.target.value)}
              placeholder="or describe them, e.g. college students who cook on a budget"
              className="field mt-3"
              aria-label="Describe who it is for"
            />
          </div>
        </div>
      </details>

      <div className="mt-8">
        <button type="submit" disabled={!canNext || busy} className="btn btn-primary w-full px-6">
          {busy ? "Starting…" : kind === "app" ? "Next: add screens" : "Analyze my site"}
          {!busy && <Arrow />}
        </button>
        <p className="mt-3 text-center text-xs text-faint">Free first test. Simulated customers, buying intent, not real purchases.</p>
      </div>
    </form>
  );
}
