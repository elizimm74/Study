"use client";
// Saved "customer minds" inside the test wizards:
//   <MyMindsCards>  the person's saved minds, shown as picks in the audience step
//                   (and it applies ?mind=<id> or ?preset=<name> when you arrive from the dashboard)
//   <SaveMind>      a small "save this audience for later" box under the audience editor
// Both talk to /api/audiences. Saving tells the other pieces on the page through a window event.
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PresetCard } from "@/components/wizard";
import { PRESETS } from "@/lib/presets";
import type { Audience } from "@/lib/types";

export type Mind = { id: string; name: string; audience: Audience; updated_at: string };

export function useMinds() {
  const [minds, setMinds] = useState<Mind[] | null>(null);
  const load = useCallback(() => {
    fetch("/api/audiences")
      .then((r) => r.json())
      .then((d) => setMinds(d.audiences ?? []))
      .catch(() => setMinds([]));
  }, []);
  useEffect(() => {
    load();
    window.addEventListener("minds-changed", load);
    return () => window.removeEventListener("minds-changed", load);
  }, [load]);
  return minds;
}

export function MyMindsCards({ presetName, onPick }: { presetName: string; onPick: (name: string, audience: Audience) => void }) {
  const minds = useMinds();
  const params = useSearchParams();
  const applied = useRef(false);

  // Coming from the dashboard ("Test with this mind")? Pick it once.
  useEffect(() => {
    if (applied.current || minds === null) return;
    const id = params.get("mind");
    const preset = params.get("preset");
    const mind = id ? minds.find((m) => m.id === id) : undefined;
    if (mind) onPick(mind.name, mind.audience);
    else if (preset && PRESETS[preset]) onPick(preset, PRESETS[preset]);
    applied.current = true;
  }, [minds, params, onPick]);

  return (
    <>
      {(minds ?? []).map((m) => (
        <PresetCard
          key={m.id}
          name={m.name}
          hint="Your saved customer mind"
          tag="saved"
          active={presetName === m.name}
          onClick={() => onPick(m.name, m.audience)}
        />
      ))}
    </>
  );
}

export function SaveMind({ audience }: { audience: Audience }) {
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    try {
      const res = await fetch("/api/audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, audience }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      window.dispatchEvent(new Event("minds-changed"));
      setState("saved");
      setName("");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  }

  return (
    <form onSubmit={save} className="card p-4 sm:p-6">
      <p className="font-medium">Keep this audience for next time</p>
      <p className="mt-1 text-sm text-muted">Save it as a customer mind. It will be here in every test, and on your dashboard.</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="mind-name" className="sr-only">
          Name for this customer mind
        </label>
        <input
          id="mind-name"
          value={name}
          onChange={(e) => (setName(e.target.value), setState("idle"))}
          maxLength={60}
          placeholder="e.g. Skeptical students"
          className="field h-11 flex-1"
        />
        <button className="btn btn-secondary h-11 px-5" disabled={!name.trim() || state === "busy"}>
          {state === "busy" ? "Saving…" : state === "saved" ? "Saved ✓" : "Save"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm">
          <span className="font-medium">Heads up: </span>
          {error}
        </p>
      )}
    </form>
  );
}
