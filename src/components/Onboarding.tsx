"use client";
// First-run onboarding: 3 quick questions, one per screen, then straight into
// the first test.
//   1. What's your site?            → the URL to test
//   2. What is it, and when's launch? → saved to the account (for later features)
//   3. Who is it for?               → pre-fills "who it's for" in the test
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

export default function Onboarding({ startUrl }: { startUrl: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState(startUrl);
  const [what, setWhat] = useState("");
  const [when, setWhen] = useState("");
  const [who, setWho] = useState("");
  const [whoText, setWhoText] = useState("");
  const [busy, setBusy] = useState(false);

  const audience = whoText.trim() || who; // their own words win over the chip
  const canNext = step === 0 ? url.trim().length > 3 : step === 1 ? what.trim().length > 1 : true;

  async function finish() {
    setBusy(true);
    const answers = { url, what, when, who: audience };
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
    const params = new URLSearchParams({ url: url.trim() });
    if (audience) params.set("for", audience);
    router.push(`/app?${params}`); // signed out → sign-up first, then the test starts reading the site
  }

  function next(e: React.FormEvent) {
    e.preventDefault();
    if (!canNext) return;
    if (step < 2) setStep(step + 1);
    else void finish();
  }

  return (
    <form onSubmit={next} className="paper mx-auto max-w-lg px-6 py-12 sm:px-10">
      {/* progress: 3 short bars */}
      <div className="flex items-center gap-2" aria-label={`Question ${step + 1} of 3`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i <= step ? "bg-accent" : "bg-line"}`} />
        ))}
      </div>
      <p className="t-label mt-6">question {step + 1} of 3</p>

      {step === 0 && (
        <div className="mt-2">
          <h1 className="t-h2">What are you launching?</h1>
          <p className="mt-2 text-muted">Paste the page people land on. We&apos;ll test it first.</p>
          <label htmlFor="ob-url" className="sr-only">
            Your website
          </label>
          <div className="relative mt-6">
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
              required
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mt-2">
          <h1 className="t-h2">What is it, and when does it launch?</h1>
          <label htmlFor="ob-what" className="field-label mt-6">
            In a few words
          </label>
          <input
            id="ob-what"
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            placeholder="e.g. a meal-planning app for busy parents"
            className="field"
            autoFocus
          />
          <p className="field-label mt-6">Launching</p>
          <div className="flex flex-wrap gap-2">
            {WHEN.map((w) => (
              <button key={w} type="button" aria-pressed={when === w} onClick={() => setWhen(when === w ? "" : w)} className="chip">
                {w}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-2">
          <h1 className="t-h2">Who is it for?</h1>
          <p className="mt-2 text-muted">We&apos;ll use this to pick your simulated customers. You can fine-tune it later.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {WHO.map((w) => (
              <button key={w} type="button" aria-pressed={who === w} onClick={() => setWho(who === w ? "" : w)} className="chip">
                {w}
              </button>
            ))}
          </div>
          <label htmlFor="ob-who" className="field-label mt-6">
            Or describe them <span className="field-hint">(optional)</span>
          </label>
          <input
            id="ob-who"
            value={whoText}
            onChange={(e) => setWhoText(e.target.value)}
            placeholder="e.g. college students who cook on a budget"
            className="field"
          />
        </div>
      )}

      <div className="mt-10 flex items-center justify-between gap-4">
        {step > 0 ? (
          <button type="button" onClick={() => setStep(step - 1)} className="btn btn-text -ml-3">
            Back
          </button>
        ) : (
          <span />
        )}
        <button type="submit" disabled={!canNext || busy} className="btn btn-primary px-6">
          {step < 2 ? "Next" : busy ? "Starting…" : "Run my first test"}
          {!busy && <Arrow />}
        </button>
      </div>
    </form>
  );
}
