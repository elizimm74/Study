"use client";
// /run/<id> — checks the server every 1.5 seconds until the run is done,
// then shows the report.
import { use, useEffect, useState } from "react";
import Report from "@/components/Report";
import type { Run } from "@/lib/pipeline";

type Progress = { status: "running"; stage: string; progress: { done: number; total: number } };

export default function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Run | Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    async function poll() {
      try {
        const res = await fetch(`/api/run/${id}`);
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

  if (error) return <p className="text-red-700">{error}</p>;
  if (!data) return <p className="text-slate-500">Loading…</p>;

  if (data.status === "running") {
    const pct = Math.round((data.progress.done / Math.max(1, data.progress.total)) * 100);
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <p className="text-lg font-medium">{data.stage}…</p>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-indigo-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-slate-500">
          {data.progress.done} of {data.progress.total} personas reviewed
        </p>
      </div>
    );
  }

  if (data.status === "error") {
    return (
      <div className="space-y-2 rounded-lg bg-red-50 p-4 text-red-900">
        <p className="font-medium">This run failed.</p>
        <p className="text-sm">{data.error}</p>
      </div>
    );
  }

  return <Report run={data} />;
}
