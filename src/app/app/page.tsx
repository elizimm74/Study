"use client";
// /app: the testing tool. 1) paste a URL  2) check the audience  3) start the run.
// "use client" means this page runs in the browser, so it can react to clicks.
import { useState } from "react";
import { useRouter } from "next/navigation";
import AudiencePicker from "@/components/AudiencePicker";
import ProfileEditor from "@/components/ProfileEditor";
import ExplorePanel from "@/components/ExplorePanel";
import { DEFAULT_AUDIENCE } from "@/lib/presets";
import type { Audience, Credentials, ExploreSettings, ProductProfile } from "@/lib/types";

type CrawlInfo = {
  id: string;
  url: string;
  pages: { step: string; url: string; title: string; screenshots: string[]; note?: string }[];
};

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<null | "analyzing" | "starting">(null);
  const [error, setError] = useState<string | null>(null);
  const [crawl, setCrawl] = useState<CrawlInfo | null>(null);
  const [profile, setProfile] = useState<ProductProfile | null>(null);
  const [suggested, setSuggested] = useState<Audience | null>(null);
  const [audience, setAudience] = useState<Audience>(DEFAULT_AUDIENCE);
  const [explore, setExplore] = useState<ExploreSettings>({
    enabled: false,
    task: "",
    access: "public",
    startUrl: "",
    reputation: false,
  });
  // The test account stays in this page's memory and is sent only to start the run.
  const [credentials, setCredentials] = useState<Credentials>({ email: "", password: "" });
  const [ownsProduct, setOwnsProduct] = useState(false);

  async function analyze(e: React.FormEvent) {
    e.preventDefault(); // stop the browser from reloading the page
    setBusy("analyzing");
    setError(null);
    setCrawl(null);
    try {
      // 1) Queue the analysis. 2) Check every 1.5s until a worker finishes it.
      const res = await fetch("/api/crawls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const started = await res.json();
      if (!res.ok) throw new Error(started.error);
      const data = await waitForCrawl(started.crawlId);
      setCrawl(data.crawl);
      setProfile(data.profile);
      setExplore((e) => ({ ...e, task: data.profile?.tryTask || e.task, startUrl: data.crawl.url }));
      if (data.audience) {
        setSuggested(data.audience);
        setAudience(data.audience);
      } else {
        setSuggested(null);
        setError(`Couldn't auto-fill the profile and audience (${data.suggestError}). Fill them in below.`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function startRun() {
    if (!crawl || !profile) return;
    setBusy("starting");
    setError(null);
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crawlId: crawl.id,
          audience,
          profile,
          explore,
          credentials: explore.enabled && explore.access === "account" ? credentials : undefined,
          ownsProduct,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/run/${data.testId}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="space-y-14">
      {/* ---------- Hero: sky-grain band + giant headline (from the Creative Brief) ---------- */}
      <section className="sky relative overflow-hidden rounded-3xl px-6 pb-8 pt-6 sm:px-10 sm:pb-10">
        <div className="meta flex justify-between text-white/85">
          <span>✱ crawler</span>
          <span>test before you launch</span>
        </div>
        <h1 className="display mt-10 text-[17vw] text-white sm:text-8xl">
          New
          <br />
          test.
        </h1>
        <p className="mt-5 max-w-md text-base text-white/90">
          Paste your site. 100 AI customers check your landing page, pricing and signup, then tell you what&apos;s
          stopping them.
        </p>
        <form onSubmit={analyze} className="mt-6 flex flex-col gap-2 rounded-2xl bg-white p-1.5 sm:flex-row sm:rounded-full">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="yourproduct.com"
            className="flex-1 rounded-full bg-transparent px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400"
            required
          />
          <button
            disabled={busy !== null}
            className="rounded-full bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-50"
          >
            {busy === "analyzing" ? "Reading your site…" : "Analyze ↗"}
          </button>
        </form>
        <div className="meta mt-6 flex justify-between text-white/80">
          <span>~1 min</span>
          <span>under 5¢ per test</span>
        </div>
      </section>
      {error && !crawl && <p className="rounded-2xl bg-white p-4 text-sm text-slate-700">⚠ {error}</p>}

      {crawl && (
        <>
          <Step n="01" title="What we captured">
            <div className="grid gap-3 sm:grid-cols-3">
              {(["hero", "pricing", "signup"] as const).map((step) => {
                const p = crawl.pages.find((x) => x.step === step);
                return (
                  <div key={step} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {p?.screenshots[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.screenshots[0]} alt={`${step} page`} className="aspect-[16/10] w-full object-cover object-top" />
                    ) : (
                      <div className="flex aspect-[16/10] items-center justify-center bg-slate-100 text-sm text-slate-400">
                        not found
                      </div>
                    )}
                    <div className="p-3">
                      <div className="meta text-slate-900">{step === "hero" ? "Landing page" : step}</div>
                      <div className="truncate text-xs text-slate-500">{p ? p.note ?? p.url : "Personas will notice this is missing"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Step>

          {profile && (
            <Step n="02" title="What we understood" hint="Every persona reads this. Fix anything that's wrong.">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <ProfileEditor profile={profile} onChange={setProfile} />
              </div>
            </Step>
          )}

          <Step n="03" title="Who reviews it">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <AudiencePicker audience={audience} onChange={setAudience} suggested={suggested} />
            </div>
          </Step>

          <Step n="04" title="Try the product" hint="Optional: an AI actually uses it first.">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <ExplorePanel
                settings={explore}
                onChange={setExplore}
                credentials={credentials}
                onCredentials={setCredentials}
                ownsProduct={ownsProduct}
                onOwnsProduct={setOwnsProduct}
              />
            </div>
          </Step>

          <div className="space-y-3">
            {error && <p className="rounded-2xl bg-white p-4 text-sm text-slate-700">⚠ {error}</p>}
            <button
              onClick={startRun}
              disabled={busy !== null}
              className="display w-full rounded-full bg-indigo-600 px-6 py-5 text-2xl text-white transition hover:bg-slate-900 disabled:opacity-50"
            >
              {busy === "starting" ? "Starting…" : explore.enabled ? "Try it + run 100 ↗" : "Run 100 customers ↗"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// A numbered section: "01." in huge type with a thin line (from the Creative Brief).
function Step({ n, title, hint, children }: { n: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4 border-b border-slate-900 pb-2">
        <h2 className="flex items-baseline gap-3">
          <span className="display text-4xl sm:text-5xl">{n}.</span>
          <span className="meta text-sm text-slate-900">{title}</span>
        </h2>
        {hint && <span className="hidden text-right text-xs text-slate-500 sm:block">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

// Checks the analysis every 1.5 seconds until it's done (about 10-30s), max 3 minutes.
async function waitForCrawl(crawlId: string) {
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await fetch(`/api/crawls/${crawlId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.status === "done") return data;
    if (data.status === "error") throw new Error(data.error ?? "Couldn't read that site.");
  }
  throw new Error("Reading the site is taking too long. Is the worker running?");
}
