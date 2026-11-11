"use client";
// "Send your score": makes a public scorecard link (headline numbers only), with a picture
// preview, and the buttons to send it (share sheet, WhatsApp, Messages, Email, X, Copy).
import { useState } from "react";
import SendBar from "./SendBar";

export default function ShareBox({ testId, headline }: { testId: string; headline: string }) {
  const [link, setLink] = useState<{ url: string; image: string } | null>(null);
  const [busy, setBusy] = useState(false);
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

  return (
    // id="share": the "Send this score" button at the top of the report scrolls here
    <section id="share" className="card scroll-mt-24 p-6 sm:p-8" aria-labelledby="share-title">
      <h2 id="share-title" className="t-h3">
        Send your score
      </h2>
      <p className="mt-1 text-sm text-muted">
        Brag a little. This makes a public scorecard with just the headline numbers: no quotes, no page text, no screenshots. It says clearly
        that the customers are simulated.
      </p>
      {!link ? (
        <button onClick={create} disabled={busy} className="btn btn-primary mt-4 h-12 px-6">
          {busy ? "Making link…" : "Create my scorecard link"}
        </button>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={link.image} alt="Your scorecard" className="w-full rounded-lg border border-line" width={1200} height={630} />
          <div className="min-w-0 space-y-4">
            <input readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} className="field h-11 text-sm" aria-label="Scorecard link" />
            <SendBar
              url={link.url}
              subject="My Crawler score"
              text={`${headline}. Tested with Crawler's simulated customers (buying intent, not real purchases).`}
            />
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <a href={link.image} download="crawler-scorecard.png" className="underline">
                Save the image
              </a>
              <button onClick={stop} disabled={busy} className="text-muted underline">
                Stop sharing (the link stops working)
              </button>
            </div>
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
