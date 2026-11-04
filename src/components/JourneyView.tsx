"use client";
// Shows what the explorer did inside the product: the current/selected
// screen, plus a step-by-step timeline. Used live (while running) and in
// the report afterwards.
import { useState } from "react";
import type { Journey } from "@/lib/types";

const STATUS: Record<Journey["status"], { label: string; cls: string }> = {
  running: { label: "Exploring…", cls: "bg-indigo-100 text-indigo-800" },
  completed: { label: "Task completed", cls: "bg-emerald-100 text-emerald-800" },
  stuck: { label: "Got stuck", cls: "bg-amber-100 text-amber-800" },
  blocked: { label: "Blocked (captcha)", cls: "bg-rose-100 text-rose-800" },
  "out of steps": { label: "Ran out of steps", cls: "bg-amber-100 text-amber-800" },
  error: { label: "Error", cls: "bg-rose-100 text-rose-800" },
};

export default function JourneyView({ runId, journey, live }: { runId: string; journey: Journey; live?: boolean }) {
  const [picked, setPicked] = useState<number | null>(null);
  const steps = journey.steps;
  // Live: always follow the newest step. Report: the one you click (default: first).
  const shown = live ? steps[steps.length - 1] : steps.find((s) => s.n === picked) ?? steps[0];
  const status = STATUS[journey.status];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded-full px-2.5 py-0.5 font-medium ${status.cls}`}>{status.label}</span>
        <span className="text-slate-500">
          Task: “{journey.task}” · {steps.length} steps · {journey.seconds}s
        </span>
      </div>

      {!live && journey.summary && <p className="text-slate-700">{journey.summary}</p>}
      {!live && journey.frictionPoints.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-rose-800">
          {journey.frictionPoints.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 md:grid-cols-[3fr_2fr]">
        {/* The screen */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {shown ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/screenshot/${runId}/${shown.screenshot}`} alt={`Step ${shown.n}`} className="w-full" />
              <div className="bg-white p-3 text-sm">
                <p className="font-medium">
                  Step {shown.n}: {shown.observation}
                </p>
                <p className="text-slate-500">→ {shown.action}</p>
              </div>
            </>
          ) : (
            <div className="flex aspect-[16/10] items-center justify-center text-sm text-slate-400">Opening the product…</div>
          )}
        </div>

        {/* The timeline */}
        <ol className="max-h-[28rem] space-y-1 overflow-y-auto pr-1">
          {steps.map((s) => (
            <li key={s.n}>
              <button
                type="button"
                onClick={() => setPicked(s.n)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  shown?.n === s.n ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"
                }`}
              >
                <span className="font-medium">{s.n}.</span> {s.action}
                {s.friction && <span className={`block text-xs ${shown?.n === s.n ? "text-rose-200" : "text-rose-700"}`}>⚠ {s.friction}</span>}
                {s.model === "Sonnet" && (
                  <span className={`block text-xs ${shown?.n === s.n ? "text-indigo-200" : "text-indigo-600"}`}>
                    smarter model stepped in
                  </span>
                )}
              </button>
            </li>
          ))}
          {live && journey.status === "running" && <li className="px-3 py-2 text-sm text-slate-400">thinking…</li>}
        </ol>
      </div>
    </div>
  );
}
