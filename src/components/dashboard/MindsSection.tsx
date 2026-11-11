"use client";
// "Customer minds": ready-made audiences you can test with right away, plus your own saved ones.
// Customize any ready-made mind (it becomes a copy you own), edit or delete your saved minds.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AudiencePicker from "@/components/AudiencePicker";
import { PRESET_HINT } from "@/components/wizard";
import { PRESETS } from "@/lib/presets";
import { MIND_TYPES } from "@/lib/playbook";
import type { DashboardData } from "@/lib/dashboard";
import type { Audience } from "@/lib/types";

type Editing = { id?: string; name: string; audience: Audience };

export default function MindsSection({ minds }: { minds: DashboardData["minds"] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(editing.id ? `/api/audiences/${editing.id}` : "/api/audiences", {
        method: editing.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editing.name, audience: editing.audience }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setEditing(null);
      router.refresh(); // reload the saved list from the server
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/audiences/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setConfirmDelete(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const ages = (a: Audience) => `${a.ageMin}–${a.ageMax}`;
  const chips = (a: Audience) => [...a.mindsets.slice(0, 3), ...a.budgets.slice(0, 1).map((b) => `${b} budget`)];

  return (
    <div className="space-y-8">
      {editing && (
        <div className="card space-y-6 p-6 sm:p-8" role="group" aria-label="Customer mind editor">
          <div>
            <label htmlFor="mind-edit-name" className="field-label">
              Name your customer mind
            </label>
            <input
              id="mind-edit-name"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              maxLength={60}
              placeholder="e.g. Skeptical students on a budget"
              className="field h-12"
              autoFocus
            />
          </div>
          <AudiencePicker audience={editing.audience} onChange={(a) => setEditing({ ...editing, audience: a })} suggested={null} />
          {error && (
            <p role="alert" className="text-sm">
              <span className="font-medium">Heads up: </span>
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={save} disabled={busy || !editing.name.trim()} className="btn btn-primary h-11 px-6">
              {busy ? "Saving…" : editing.id ? "Save changes" : "Save my mind"}
            </button>
            <button onClick={() => (setEditing(null), setError(null))} className="btn btn-text h-11">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ---- yours ---- */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="t-h3">My minds</h3>
          <button
            onClick={() => (setEditing({ name: "", audience: PRESETS["Gen Z students"] }), setError(null))}
            className="btn btn-secondary h-10 px-4 text-sm"
          >
            + Build a new mind
          </button>
        </div>
        {minds.length === 0 ? (
          <p className="card mt-4 p-6 text-sm text-muted">
            Nothing saved yet. Customize a ready-made mind below, or build one from scratch. Saved minds show up in every test.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {minds.map((m) => (
              <li key={m.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{m.name}</p>
                  <span className="t-label shrink-0">{ages(m.audience)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {chips(m.audience).map((c) => (
                    <span key={c} className="pill">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                  <Link href={`/onboarding?mind=${m.id}`} className="btn btn-primary h-10 px-4 text-sm">
                    Test with this
                  </Link>
                  <button onClick={() => (setEditing({ id: m.id, name: m.name, audience: m.audience }), setError(null))} className="btn btn-text h-10 text-sm">
                    Edit
                  </button>
                  {confirmDelete === m.id ? (
                    <button onClick={() => remove(m.id)} disabled={busy} className="btn btn-text h-10 text-sm font-medium">
                      Really delete?
                    </button>
                  ) : (
                    <button onClick={() => setConfirmDelete(m.id)} className="btn btn-text h-10 text-sm text-muted">
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!editing && error && (
          <p role="alert" className="mt-3 text-sm">
            <span className="font-medium">Heads up: </span>
            {error}
          </p>
        )}
      </div>

      {/* ---- ready-made ---- */}
      <div>
        <h3 className="t-h3">Ready-made minds</h3>
        <p className="mt-1 text-sm text-fg/70">Start from one of these, or customize it into your own.</p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(PRESETS).map(([name, a]) => (
            <li key={name} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{name}</p>
                <span className="t-label shrink-0">{ages(a)}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{PRESET_HINT[name] ?? ""}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {chips(a).map((c) => (
                  <span key={c} className="pill">
                    {c}
                  </span>
                ))}
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                <Link href={`/onboarding?preset=${encodeURIComponent(name)}`} className="btn btn-primary h-10 px-4 text-sm">
                  Test with this
                </Link>
                <button onClick={() => (setEditing({ name: `${name} (mine)`, audience: a }), setError(null))} className="btn btn-text h-10 text-sm">
                  Customize
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ---- the five mindsets ---- */}
      <div>
        <h3 className="t-h3">What each mindset cares about</h3>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {MIND_TYPES.map((m) => (
            <li key={m.name} className="card p-4">
              <p className="font-medium">{m.name}</p>
              <p className="mt-2 text-sm text-muted">Wants: {m.wants}</p>
              <p className="mt-1 text-sm">Wins them: {m.wins}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
