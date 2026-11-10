"use client";
// "Did you launch this? Tell us what really happened." The founder enters their
// REAL conversion rate; it goes (anonymously) on the public /accuracy page next
// to Crawler's prediction. That track record is how we earn trust.
import { useState } from "react";

export default function ActualBox({ testId, kind }: { testId: string; kind: "website" | "app" }) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    try {
      const res = await fetch(`/api/tests/${testId}/actual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realPct: Number(value) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setState("done");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  }

  return (
    <section className="card p-6 sm:p-8" aria-labelledby="actual-title">
      <h2 id="actual-title" className="t-h3">
        Launched it? Tell us what really happened
      </h2>
      <p className="mt-1 text-sm text-muted">
        {kind === "app"
          ? "What share of people who installed your app really started a trial or subscribed?"
          : "What share of your real visitors really signed up or bought?"}{" "}
        We show predictions next to real results, anonymously, on the{" "}
        <a href="/accuracy" className="underline">
          accuracy page
        </a>
        .
      </p>
      {state === "done" ? (
        <p className="mt-4 rounded-lg border border-line-strong bg-subtle p-4 text-sm">Thank you. That helps make Crawler more honest.</p>
      ) : (
        <form onSubmit={save} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="actual-input" className="sr-only">
            Real conversion rate in percent
          </label>
          <div className="relative sm:w-48">
            <input
              id="actual-input"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 4.5"
              className="field h-12 pr-10"
              required
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">%</span>
          </div>
          <button className="btn btn-secondary h-12 px-6" disabled={state === "busy" || !value}>
            {state === "busy" ? "Saving…" : "Save my real result"}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm">
          <span className="font-medium">Heads up: </span>
          {error}
        </p>
      )}
    </section>
  );
}
