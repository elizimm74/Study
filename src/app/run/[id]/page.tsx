"use client";
// /run/<id> — checks the server every 1.5 seconds until the run is done,
// then shows the report.
import { use, useEffect, useState } from "react";
import Report from "@/components/Report";
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

  if (error) return <p className="text-rose-300">{error}</p>;
  if (!data) return <p className="text-slate-500">Loading…</p>;

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
        <div className="space-y-4">
          <p className="meta flex items-center gap-2 text-slate-500">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
            live · {seconds}s
          </p>
          <p className="display text-4xl sm:text-5xl">The explorer is trying your product</p>
          <JourneyView filesPrefix={data.filesPrefix} journey={journey} live />
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-xl space-y-5 py-16 text-center">
        <p className="meta text-slate-400">✱ working · {seconds}s</p>
        <p className="display text-5xl sm:text-6xl">{data.stage}</p>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-indigo-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-slate-500">
          {data.progress.done} of {data.progress.total} customers reviewed
        </p>
        {data.stage.startsWith("Personas") && data.progress.done === 0 && (
          <p className="text-xs text-slate-400">
            The first 25 go alone so your site is saved for the rest (that makes the run cheaper). The other 75 then
            review at the same time.
          </p>
        )}
        {data.stage.startsWith("Writing") && (
          <p className="text-xs text-slate-400">The smarter model is turning the results into ranked fixes. About 15–30 seconds.</p>
        )}
      </div>
    );
  }

  if (data.status === "error") {
    return (
      <div className="space-y-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
        <p className="font-medium">This run failed.</p>
        <p className="text-sm">{data.error}</p>
      </div>
    );
  }

  return <Report run={data} />;
}
