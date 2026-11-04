"use client";
// Home page: 1) paste a URL  2) check the audience  3) start the run.
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
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
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
      const res = await fetch("/api/run", {
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
      router.push(`/run/${data.runId}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Would people actually buy?</h1>
        <p className="text-slate-600">
          Paste your landing page. 100 simulated customers will review it, your pricing and signup, and
          tell you what&apos;s stopping them.
        </p>
        <form onSubmit={analyze} className="flex flex-col gap-2 sm:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="yourproduct.com"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3"
            required
          />
          <button disabled={busy !== null} className="rounded-lg bg-slate-900 px-5 py-3 font-medium text-white disabled:opacity-50">
            {busy === "analyzing" ? "Reading your site…" : "Analyze"}
          </button>
        </form>
        {error && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
      </section>

      {crawl && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">What we captured</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {(["hero", "pricing", "signup"] as const).map((step) => {
                const p = crawl.pages.find((x) => x.step === step);
                return (
                  <div key={step} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {p?.screenshots[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.screenshots[0]} alt={`${step} page`} className="aspect-[16/10] w-full object-cover object-top" />
                    ) : (
                      <div className="flex aspect-[16/10] items-center justify-center bg-slate-100 text-sm text-slate-400">
                        not found
                      </div>
                    )}
                    <div className="p-2 text-xs">
                      <div className="font-medium capitalize">{step === "hero" ? "Landing page" : step}</div>
                      <div className="truncate text-slate-500">{p ? p.note ?? p.url : "Personas will notice this is missing"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {profile && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">What we understood</h2>
              <p className="text-sm text-slate-500">
                Every persona reads this. Fix anything that&apos;s wrong before you run.
              </p>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <ProfileEditor profile={profile} onChange={setProfile} />
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Who should review it?</h2>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <AudiencePicker audience={audience} onChange={setAudience} suggested={suggested} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">
              Try the product <span className="text-sm font-normal text-indigo-600">new</span>
            </h2>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <ExplorePanel
                settings={explore}
                onChange={setExplore}
                credentials={credentials}
                onCredentials={setCredentials}
                ownsProduct={ownsProduct}
                onOwnsProduct={setOwnsProduct}
              />
            </div>
            {error && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
            <button
              onClick={startRun}
              disabled={busy !== null}
              className="w-full rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white disabled:opacity-50"
            >
              {busy === "starting" ? "Starting…" : explore.enabled ? "Try the product + run 100 personas" : "Run 100 personas"}
            </button>
          </section>
        </>
      )}
    </div>
  );
}
