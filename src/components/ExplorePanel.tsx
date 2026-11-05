"use client";
// "Try the product" settings: should the explorer use the product, how it's
// allowed in, and what it should try to do.
import type { Credentials, ExploreAccess, ExploreSettings } from "@/lib/types";

type Props = {
  settings: ExploreSettings;
  onChange: (s: ExploreSettings) => void;
  credentials: Credentials;
  onCredentials: (c: Credentials) => void;
  ownsProduct: boolean;
  onOwnsProduct: (v: boolean) => void;
};

const ACCESS: { value: ExploreAccess; title: string; detail: string }[] = [
  { value: "public", title: "Public parts only", detail: "Anything that works without an account. Fine for any site." },
  { value: "account", title: "My test account", detail: "For your own product. Never saved, and the AI never sees the password." },
  { value: "preview", title: "Preview link (login off)", detail: "For your own product, e.g. a Vercel preview with login turned off." },
];

export default function ExplorePanel(props: Props) {
  const { settings: s, onChange } = props;
  const set = <K extends keyof ExploreSettings>(k: K, v: ExploreSettings[K]) => onChange({ ...s, [k]: v });

  return (
    <div className="space-y-5">
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={s.enabled} onChange={(e) => set("enabled", e.target.checked)} className="mt-1" />
        <span>
          <span className="font-medium">Have an AI explorer actually use the product</span>
          <span className="block text-sm text-slate-500">
            It clicks around like a first-time user, then the personas react to what it saw. About 2–5¢ and 1–2 minutes.
          </span>
        </span>
      </label>

      {s.enabled && (
        <>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">What should it try?</span>
            <input
              value={s.task}
              onChange={(e) => set("task", e.target.value)}
              placeholder='e.g. "Find a birthday card template and open it"'
              className={inputCls}
            />
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-medium">How is it allowed in?</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {ACCESS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => set("access", a.value)}
                  className={`rounded-lg border p-3 text-left text-sm ${
                    s.access === a.value ? "border-indigo-600 bg-indigo-50" : "border-slate-300 bg-white"
                  }`}
                >
                  <span className="block font-medium">{a.title}</span>
                  <span className="text-slate-500">{a.detail}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              {s.access === "preview" ? "Preview link" : "Where to start"}{" "}
              <span className="font-normal text-slate-400">(e.g. the app page instead of the homepage)</span>
            </span>
            <input value={s.startUrl} onChange={(e) => set("startUrl", e.target.value)} className={inputCls} />
          </label>

          {s.access === "account" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={props.credentials.email}
                onChange={(e) => props.onCredentials({ ...props.credentials, email: e.target.value })}
                placeholder="Test account email"
                autoComplete="off"
                className={inputCls}
              />
              <input
                type="password"
                value={props.credentials.password}
                onChange={(e) => props.onCredentials({ ...props.credentials, password: e.target.value })}
                placeholder="Test account password"
                autoComplete="new-password"
                className={inputCls}
              />
              <p className="text-xs text-slate-500 sm:col-span-2">
                Use a throwaway test account, never your real one. It&apos;s only kept in memory for this one test.
              </p>
            </div>
          )}

          {s.access !== "public" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={props.ownsProduct} onChange={(e) => props.onOwnsProduct(e.target.checked)} />
              This is my own product (or I have permission to test it).
            </label>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.reputation} onChange={(e) => set("reputation", e.target.checked)} />
            Also look up what real people say online (Reddit, app stores, reviews). About 5–10¢ more.
          </label>
        </>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm";
