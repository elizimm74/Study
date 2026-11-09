"use client";
// "Ask about this test": a small chat under every report (website + app).
// 2 free questions per test. If something in the test was wrong (like a price
// the crawler misread), the AI says so and we offer a fresh test with the fix.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Arrow } from "@/components/landing/UrlForm";

type Msg = { id: number | string; role: "user" | "assistant"; content: string; needs_rerun?: boolean };

const IDEAS = ["Why did most people say no?", "What's the single best fix?", "Something here looks wrong…"];

export default function AskBox({ testId, rerunHref }: { testId: string; rerunHref: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [remaining, setRemaining] = useState<number | null | undefined>(undefined); // null = unlimited
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let stopped = false;
    fetch(`/api/tests/${testId}/messages`)
      .then((r) => r.json())
      .then((d) => {
        if (stopped || !d.messages) return;
        setMessages(d.messages);
        setRemaining(d.remaining);
      })
      .catch(() => null);
    return () => {
      stopped = true;
    };
  }, [testId]);

  useEffect(() => {
    if (messages.length) end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages]);

  async function send(content: string) {
    const q = content.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    setText("");
    setMessages((m) => [...m, { id: `tmp-${m.length}`, role: "user", content: q }]);
    try {
      const res = await fetch(`/api/tests/${testId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: q }),
      });
      const d = await res.json();
      if (!res.ok) {
        // Not answered: take the question back off the screen and put it in the box again.
        setMessages((m) => m.slice(0, -1));
        setText(q);
        if (d.limitReached) {
          setRemaining(0); // the grey "used your free questions" note says it; no second message
          return;
        }
        throw new Error(d.error);
      }
      setMessages((m) => [...m, { id: `a-${m.length}`, role: "assistant", content: d.answer, needs_rerun: d.needsRerun }]);
      setRemaining(d.remaining);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const used = remaining === 0;
  return (
    <section className="card p-6 sm:p-8" aria-labelledby="ask-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="ask-title" className="t-h3">
          Ask about this test
        </h2>
        {remaining !== undefined && (
          <span className="t-label">{remaining === null ? "unlimited" : `${remaining} free question${remaining === 1 ? "" : "s"} left`}</span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">Something look off? Tell it. Ask why, or say what&apos;s wrong, like a price it misread.</p>

      {messages.length > 0 && (
        <ol className="mt-6 space-y-4" aria-live="polite">
          {messages.map((m) => (
            <li key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
              <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${m.role === "user" ? "bg-accent text-accent-fg" : "bg-subtle"}`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.needs_rerun && (
                  <Link href={rerunHref} className="btn btn-primary mt-3 h-10 px-4 text-sm">
                    Fix it and run a new test <Arrow />
                  </Link>
                )}
              </div>
            </li>
          ))}
          {busy && (
            <li>
              <div className="inline-block rounded-xl bg-subtle px-4 py-3 text-sm text-muted">
                <span className="animate-pulse">thinking…</span>
              </div>
            </li>
          )}
          <div ref={end} />
        </ol>
      )}

      {used ? (
        <p className="mt-6 rounded-lg border border-line-strong bg-subtle p-4 text-sm">
          You&apos;ve used your free questions for this test. More questions come with packs (coming soon). You can still{" "}
          <Link href={rerunHref} className="underline">
            run a new test
          </Link>
          .
        </p>
      ) : (
        <>
          {messages.length === 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {IDEAS.map((i) => (
                <button key={i} type="button" onClick={() => setText(i.replace("…", ": "))} className="chip">
                  {i}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(text);
            }}
            className="mt-4 flex flex-col gap-2 sm:flex-row"
          >
            <label htmlFor="ask-input" className="sr-only">
              Your question
            </label>
            <input
              id="ask-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={600}
              placeholder="e.g. The price is $9.99, not $19"
              className="field h-12 flex-1"
              disabled={busy}
            />
            <button className="btn btn-primary h-12 px-6" disabled={busy || !text.trim()}>
              {busy ? "Asking…" : "Ask"}
            </button>
          </form>
        </>
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
