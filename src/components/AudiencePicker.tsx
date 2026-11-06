"use client";
// The audience form. It receives the current audience and calls onChange
// with an updated copy whenever the user edits anything.
import { useState } from "react";
import { PRESETS } from "@/lib/presets";
import {
  COMPANY_SIZES,
  BUDGETS,
  MINDSETS,
  TECH_LEVELS,
  type Audience,
} from "@/lib/types";

type Props = {
  audience: Audience;
  onChange: (a: Audience) => void;
  suggested: Audience | null; // the AI's guess, so the user can go back to it
};

export default function AudiencePicker({ audience, onChange, suggested }: Props) {
  // Helper: change one field, keep the rest.
  const set = <K extends keyof Audience>(key: K, value: Audience[K]) =>
    onChange({ ...audience, [key]: value });
  const setBiz = <K extends keyof Audience["business"]>(key: K, value: Audience["business"][K]) =>
    onChange({ ...audience, business: { ...audience.business, [key]: value } });

  return (
    <div className="space-y-8">
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {suggested && (
          <button type="button" onClick={() => onChange(suggested)} className={presetBtn}>
            AI suggestion
          </button>
        )}
        {Object.entries(PRESETS).map(([name, preset]) => (
          <button key={name} type="button" onClick={() => onChange(preset)} className={presetBtn}>
            {name}
          </button>
        ))}
      </div>

      {/* Consumer vs business */}
      <Field label="Product type">
        <Chips
          options={["consumer", "business"] as const}
          selected={[audience.mode]}
          onToggle={(m) => set("mode", m)}
          single
        />
      </Field>

      <div className="grid gap-8 md:grid-cols-2">
        <Field label="Age range">
          <div className="flex flex-wrap items-center gap-2">
            <Num value={audience.ageMin} onChange={(v) => set("ageMin", v)} />
            <span className="text-sm text-muted">to</span>
            <Num value={audience.ageMax} onChange={(v) => set("ageMax", v)} />
            <select
              value={audience.ageSkew}
              onChange={(e) => set("ageSkew", e.target.value as Audience["ageSkew"])}
              className={`${inputCls} w-auto`}
            >
              <option value="even">evenly spread</option>
              <option value="younger">skew younger</option>
              <option value="older">skew older</option>
            </select>
          </div>
        </Field>

        <Field label="Gender split (%)">
          <Split
            values={audience.genderSplit}
            onChange={(v) => set("genderSplit", v)}
          />
        </Field>

        <Field label="Countries" hint="comma separated">
          <ListInput value={audience.countries} onChange={(v) => set("countries", v)} />
        </Field>

        <Field label="Urban / suburban / rural (%)">
          <Split values={audience.areaMix} onChange={(v) => set("areaMix", v)} />
        </Field>

        <Field label="Occupations" hint="categories or anything, comma separated">
          <ListInput value={audience.occupations} onChange={(v) => set("occupations", v)} />
        </Field>

        <Field label="What they use now" hint="competitors or workarounds">
          <ListInput
            value={audience.currentSolutions}
            onChange={(v) => set("currentSolutions", v)}
          />
        </Field>
      </div>

      <Field label="Budget" hint="how much they can comfortably spend">
        <Chips options={BUDGETS} selected={audience.budgets} onToggle={(v) => set("budgets", toggle(audience.budgets, v))} />
      </Field>
      <Field label="Mindset">
        <Chips options={MINDSETS} selected={audience.mindsets} onToggle={(v) => set("mindsets", toggle(audience.mindsets, v))} />
      </Field>
      <Field label="Tech comfort">
        <Chips options={TECH_LEVELS} selected={audience.techComfort} onToggle={(v) => set("techComfort", toggle(audience.techComfort, v))} />
      </Field>

      {audience.mode === "business" && (
        <div className="space-y-8 rounded-xl border border-line bg-subtle p-6">
          <p className="font-medium">Business buyers</p>
          <div className="grid gap-8 md:grid-cols-2">
            <Field label="Roles" hint="comma separated">
              <ListInput value={audience.business.roles} onChange={(v) => setBiz("roles", v)} />
            </Field>
            <Field label="Industries" hint="comma separated">
              <ListInput value={audience.business.industries} onChange={(v) => setBiz("industries", v)} />
            </Field>
          </div>
          <Field label={`Who decides: ${audience.business.decisionSelfPct}% can buy on their own`}>
            <input
              type="range"
              min={0}
              max={100}
              value={audience.business.decisionSelfPct}
              onChange={(e) => setBiz("decisionSelfPct", Number(e.target.value))}
              className="w-full"
              aria-label="Share who can buy on their own"
            />
          </Field>
          <Field label="Company size">
            <Chips
              options={COMPANY_SIZES}
              selected={audience.business.companySizes}
              onToggle={(v) => setBiz("companySizes", toggle(audience.business.companySizes, v))}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

// ---------- small building blocks ----------

const inputCls = "field";
const presetBtn = "chip";

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="field-label">
        {label} {hint && <span className="field-hint">({hint})</span>}
      </div>
      {children}
    </div>
  );
}

function Chips<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: readonly T[];
  selected: T[];
  onToggle: (v: T) => void;
  single?: boolean; // only one can be picked (the parent handles that; selected = filled chip)
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            aria-pressed={on}
            className="chip"
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Num({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`${inputCls} w-20 px-2 text-center`}
    />
  );
}

// Three (or more) percentage boxes, e.g. female / male / nonbinary.
function Split<T extends Record<string, number>>({ values, onChange }: { values: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {Object.entries(values).map(([key, val]) => (
        <label key={key} className="flex items-center gap-2 text-sm text-muted">
          {key}
          <Num value={val} onChange={(v) => onChange({ ...values, [key]: v })} />
        </label>
      ))}
    </div>
  );
}

// A text box for comma-separated lists. We keep the raw text while typing,
// and turn it into a list when the box loses focus.
function ListInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const joined = value.join(", ");
  const [text, setText] = useState(joined);
  const [lastSeen, setLastSeen] = useState(joined);
  if (joined !== lastSeen) {
    // A preset or AI suggestion replaced the list: show the new value.
    setLastSeen(joined);
    setText(joined);
  }
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() =>
        onChange(
          text
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        )
      }
      className={`${inputCls} w-full`}
    />
  );
}
