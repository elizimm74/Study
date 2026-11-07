"use client";
// /run/<id> — checks the server every 1.5 seconds until the run is done,
// then shows the report.
import { use, useEffect, useState } from "react";
import Report from "@/components/Report";
import BotRush from "@/components/landing/BotRush";
import JourneyView from "@/components/JourneyView";
import type { Run } from "@/lib/pipeline";
import type { Journey } from "@/lib/types";

type Progress = {
  status: "running";
  stage: string;
  progress: { done: number; total: number };
  journey?: Journey; // live explorer steps
  filesPrefix: string; // where this test's screenshots are
};

type Done = Run & { filesPrefix: string };

export default function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Done | Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A seconds counter, so the screen never looks frozen.
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let stopped = false;
    async function poll() {
      try {
        const res = await fetch(`/api/tests/${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (stopped) return;
        setData(json);
        if (json.status === "running") setTimeout(poll, 1500);
      } catch (err) {
        if (!stopped) setError((err as Error).message);
      }
    }
    poll();
    return () => {
      stopped = true; // stop polling if the user leaves the page
    };
  }, [id]);

  if (error)
    return (
      <p role="alert" className="mx-auto max-w-2xl rounded-lg border border-line-strong bg-subtle p-4">
        {error}
      </p>
    );
  if (!data) return <p className="t-label mx-auto max-w-2xl">loading…</p>;

  if (data.status === "running") {
    const pct = Math.round((data.progress.done / Math.max(1, data.progress.total)) * 100);
    // While the explorer works, show it live.
    if (data.stage.startsWith("The explorer")) {
      // Before the first step arrives, show an empty journey ("Opening the product…").
      const journey: Journey = data.journey ?? {
        task: "",
        access: "public",
        status: "running",
        summary: "",
        frictionPoints: [],
        steps: [],
        seconds: 0,
      };
      return (
        <div className="mx-auto max-w-4xl space-y-8">
          <div>
            <p className="t-label flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
              live · {seconds}s
            </p>
            <h1 className="t-h1 mt-4">The explorer is trying your product</h1>
          </div>
          <JourneyView filesPrefix={data.filesPrefix} journey={journey} live />
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-2xl space-y-8" aria-live="polite">
        <div>
          <p className="t-label flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
            working · {seconds}s
          </p>
          <h1 className="t-h1 mt-4">{data.stage}</h1>
        </div>
        {/* the bots animation, driven by the real progress */}
        <BotRush live={{ progress: pct / 100, label: `${data.progress.done} of ${data.progress.total} customers` }} />
        <p className="sr-only" role="status">
          {data.progress.done} of {data.progress.total} customers reviewed, {pct}%.
        </p>
        {data.stage.startsWith("Personas") && data.progress.done === 0 && (
          <p className="text-sm text-muted">
            The first 25 go alone so your site is saved for the rest (that makes the run cheaper). The other 75 then
            review at the same time.
          </p>
        )}
        {data.stage.startsWith("Writing") && (
          <p className="text-sm text-muted">The smarter model is turning the results into ranked fixes. About 15–30 seconds.</p>
        )}
      </div>
    );
  }

  if (data.status === "error") {
    return (
      <div role="alert" className="mx-auto max-w-2xl space-y-2 rounded-xl border border-line-strong bg-subtle p-6">
        <p className="font-medium">This run failed.</p>
        <p className="text-sm text-muted">{data.error}</p>
      </div>
    );
  }

  return <Report run={data} />;
}
