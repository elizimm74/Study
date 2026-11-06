"use client";
// Shows what the explorer did inside the product: the current/selected
// screen, plus a step-by-step timeline. Used live (while running) and in
// the report afterwards.
import { useState } from "react";
import type { Journey } from "@/lib/types";
import { fileUrl } from "@/lib/urls";

const STATUS: Record<Journey["status"], { label: string; cls: string }> = {
  running: { label: "Exploring…", cls: "pill-maybe" },
  completed: { label: "Task completed", cls: "pill-buy" },
  stuck: { label: "Got stuck", cls: "pill-no" },
  blocked: { label: "Blocked (captcha)", cls: "pill-no" },
  "out of steps": { label: "Ran out of steps", cls: "pill-no" },
  error: { label: "Error", cls: "pill-no" },
};

// filesPrefix: where this test's screenshots are, e.g. "{userId}/tests/{id}".
export default function JourneyView({ filesPrefix, journey, live }: { filesPrefix: string; journey: Journey; live?: boolean }) {
  const [picked, setPicked] = useState<number | null>(null);
  const steps = journey.steps;
  // Live: always follow the newest step. Report: the one you click (default: first).
  const shown = live ? steps[steps.length - 1] : steps.find((s) => s.n === picked) ?? steps[0];
  const status = STATUS[journey.status];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`pill ${status.cls}`}>{status.label}</span>
        <span className="text-muted">
          Task: “{journey.task}” · {steps.length} steps · {journey.seconds}s
        </span>
      </div>

      {!live && journey.summary && <p>{journey.summary}</p>}
      {!live && journey.frictionPoints.length > 0 && (
        <ul className="list-disc space-y-1 pl-4 text-sm text-muted">
          {journey.frictionPoints.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 md:grid-cols-[3fr_2fr]">
        {/* The screen */}
        <div className="overflow-hidden rounded-xl border border-line bg-subtle">
          {shown ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileUrl(filesPrefix, shown.screenshot)} alt={`Step ${shown.n}`} className="w-full" />
              <div className="border-t border-line bg-bg p-4 text-sm">
                <p className="font-medium">
                  Step {shown.n}: {shown.observation}
                </p>
                <p className="mt-1 text-muted">→ {shown.action}</p>
              </div>
            </>
          ) : (
            <div className="flex aspect-[16/10] items-center justify-center text-sm text-faint">Opening the product…</div>
          )}
        </div>

        {/* The timeline */}
        <ol className="max-h-[28rem] space-y-1 overflow-y-auto pr-1">
          {steps.map((s) => (
            <li key={s.n}>
              <button
                type="button"
                onClick={() => setPicked(s.n)}
                aria-current={shown?.n === s.n ? "true" : undefined}
                className={`min-h-11 w-full rounded-lg border px-4 py-2 text-left text-sm transition-colors duration-150 ${
                  shown?.n === s.n ? "border-fg bg-subtle" : "border-transparent hover:bg-subtle"
                }`}
              >
                <span className="font-medium">{s.n}.</span> {s.action}
                {s.friction && <span className="mt-1 block text-xs text-accent-ink">Friction: {s.friction}</span>}
                {s.model === "Sonnet" && (
                  <span className="mt-1 block text-xs text-faint">
                    smarter model stepped in
                  </span>
                )}
              </button>
            </li>
          ))}
          {live && journey.status === "running" && <li className="px-4 py-2 text-sm text-faint">thinking…</li>}
        </ol>
      </div>
    </div>
  );
}
