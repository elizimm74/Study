"use client";
// "What we understood": the product profile the AI wrote after crawling.
// The founder can fix anything wrong before the personas see it.
import { useState } from "react";
import { GOALS, type Goal, type ProductProfile } from "@/lib/types";

type Props = { profile: ProductProfile; onChange: (p: ProductProfile) => void };

export default function ProfileEditor({ profile, onChange }: Props) {
  const setText = (key: "whatItIs" | "whoItsFor" | "mainPromise", value: string) =>
    onChange({ ...profile, [key]: value });
  // Lists are edited as one item per line.
  const setList = (key: "prices" | "proof" | "friction", value: string) =>
    onChange({ ...profile, [key]: value.split("\n").map((s) => s.trim()).filter(Boolean) });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <label className="block md:col-span-2">
        <span className="field-label">
          Goal <span className="field-hint">(what counts as a win on this site)</span>
        </span>
        <select
          value={profile.goal}
          onChange={(e) => onChange({ ...profile, goal: e.target.value as Goal })}
          className={boxCls + " md:w-64"}
        >
          {GOALS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>
      <TextBox label="What it is" value={profile.whatItIs} onChange={(v) => setText("whatItIs", v)} />
      <TextBox label="Who it's for" value={profile.whoItsFor} onChange={(v) => setText("whoItsFor", v)} />
      <TextBox label="Main promise" value={profile.mainPromise} onChange={(v) => setText("mainPromise", v)} />
      <ListBox label="Prices shown" hint="one per line" value={profile.prices} onChange={(v) => setList("prices", v)} />
      <ListBox label="Proof shown" hint="reviews, logos, user counts" value={profile.proof} onChange={(v) => setList("proof", v)} />
      <ListBox label="Friction" hint="what slows people down" value={profile.friction} onChange={(v) => setList("friction", v)} />
    </div>
  );
}

const boxCls = "field";

function TextBox({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className={boxCls} />
    </label>
  );
}

// Keeps its own text while typing (so blank lines don't vanish mid-edit),
// and saves the cleaned-up list when you click away.

function ListBox({ label, hint, value, onChange }: { label: string; hint: string; value: string[]; onChange: (v: string) => void }) {
  const joined = value.join("\n");
  const [text, setText] = useState(joined);
  const [lastSeen, setLastSeen] = useState(joined);
  if (joined !== lastSeen) {
    setLastSeen(joined);
    setText(joined);
  }
  return (
    <label className="block">
      <span className="field-label">
        {label} <span className="field-hint">({hint})</span>
      </span>
      <textarea
        rows={3}
        value={text}
        placeholder="none"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onChange(text)}
        className={boxCls}
      />
    </label>
  );
}
