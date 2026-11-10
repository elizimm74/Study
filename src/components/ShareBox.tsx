"use client";
// "Share this result": makes a public scorecard link (headline numbers only),
// with a picture preview, Copy, Post on X, and Stop sharing.
import { useState } from "react";

export default function ShareBox({ testId, headline }: { testId: string; headline: string }) {
  const [link, setLink] = useState<{ url: string; image: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/${testId}/share`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setLink(d);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function stop() {
    setBusy(true);
    await fetch(`/api/tests/${testId}/share`, { method: "DELETE" }).catch(() => null);
    setLink(null);
    setBusy(false);
  }
  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Couldn't copy. Select the link and copy it by hand.");
    }
  }

  const tweet = link ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${headline}\n\nTested with @crawler's simulated customers (buying intent, not real purchases).`)}&url=${encodeURIComponent(link.url)}` : "#";

  return (
    <section className="card p-6 sm:p-8" aria-labelledby="share-title">
      <h2 id="share-title" className="t-h3">
        Share this result
      </h2>
      <p className="mt-1 text-sm text-muted">Makes a public scorecard with just the headline numbers. No quotes, no page text, no screenshots.</p>
      {!link ? (
        <button onClick={create} disabled={busy} className="btn btn-primary mt-4 h-12 px-6">
          {busy ? "Making link…" : "Create share link"}
        </button>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={link.image} alt="Your scorecard" className="w-full rounded-lg border border-line" width={1200} height={630} />
          <div className="min-w-0 space-y-3">
            <input readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} className="field h-11 text-sm" aria-label="Share link" />
            <div className="flex flex-wrap gap-2">
              <button onClick={copy} className="btn btn-primary h-11 px-5">
                {copied ? "Copied ✓" : "Copy link"}
              </button>
              <a href={tweet} target="_blank" rel="noreferrer" className="btn btn-secondary h-11 px-5">
                Post on X
              </a>
              <a href={link.image} download="crawler-scorecard.png" className="btn btn-secondary h-11 px-5">
                Save image
              </a>
            </div>
            <button onClick={stop} disabled={busy} className="text-sm text-muted underline">
              Stop sharing (the link stops working)
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm">
          <span className="font-medium">Heads up: </span>
          {error}
        </p>
      )}
    </section>
  );
}
