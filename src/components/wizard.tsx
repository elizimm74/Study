"use client";
// Pieces shared by the website and app wizards on /app.
import { STEP_LABELS } from "./wizardSteps";

// One plain line under each preset (no emoji icons).
export const PRESET_HINT: Record<string, string> = {
  "High school teens": "Phones, short attention, rarely a card",
  "Gen Z students": "Price-sensitive, social-first",
  "Solo SaaS founders": "Skeptical, compare everything",
  "Busy moms": "Short on time, want it to just work",
  "Small business owners": "Care about ROI and support",
};

// ---------- pieces ----------

export function Stepper({ step, canGoTo, onGo }: { step: number; canGoTo: (i: number) => boolean; onGo: (i: number) => void }) {
  return (
    <nav aria-label="Steps" className="grid grid-cols-4 gap-2">
      {STEP_LABELS.map((label, i) => (
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

export function Heading({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <div>
      <p className="t-label">step {n} of 4</p>
      <h1 className="t-h1 mt-4">{title}</h1>
      <p className="t-lead mt-4">{sub}</p>
    </div>
  );
}

export function Nav({ onBack, onNext, nextLabel }: { onBack: () => void; onNext: () => void; nextLabel: string }) {
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

export function PresetCard({ name, hint, tag, active, onClick }: { name: string; hint: string; tag: string; active: boolean; onClick: () => void }) {
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

export function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 p-6">
      <dt className="t-label">{label}</dt>
      <dd className="mt-2 truncate font-medium">{value}</dd>
    </div>
  );
}

export function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform duration-200 group-open:rotate-180" aria-hidden>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="max-w-xl rounded-lg border border-line-strong bg-subtle p-4 text-sm">
      <span className="font-medium">Heads up: </span>
      {error}
    </p>
  );
}

// Checks the analysis every 1.5 seconds until it's done (about 10-30s), max 3 minutes.
export async function waitForCrawl(crawlId: string) {
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await fetch(`/api/crawls/${crawlId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.status === "done") return data;
    if (data.status === "error") throw new Error(data.error ?? "Couldn't read that site.");
    // On your own computer: still "queued" after ~30s means no worker picked it up,
    // i.e. the worker isn't running. Say so right away instead of spinning for 3 minutes.
    // (Only in development; real users never see this.)
    if (process.env.NODE_ENV === "development" && data.status === "queued" && i >= 20) {
      throw new Error("No worker picked this up after 30 seconds. Start it in a second Terminal window: npm run worker:dev");
    }
  }
  throw new Error("Reading the site is taking too long. Is the worker running?");
}
