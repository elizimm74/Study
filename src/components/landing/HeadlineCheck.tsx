"use client";
// "Try it now": type a headline, get an instant 5-point checklist. No account, no AI, no cost:
// it only counts words and looks for a few patterns IN YOUR BROWSER. It is NOT the Crawler test
// (that uses 100 simulated customers), and the page says so. Its job is to give a visitor a
// real, useful result in 5 seconds and show what a Crawler finding feels like.
import { useState } from "react";
import Link from "next/link";
import { Arrow } from "./UrlForm";

const BUZZ = ["revolutionary", "seamless", "next-gen", "next generation", "all-in-one", "powerful", "innovative", "cutting-edge", "synergy", "world-class", "game-changing", "robust", "leverage"];

type Check = { ok: boolean; title: string; why: string };

export function checkHeadline(raw: string): Check[] {
  const text = raw.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const lower = text.toLowerCase();
  return [
    {
      ok: words.length >= 3 && words.length <= 12,
      title: "Short enough to skim (3–12 words)",
      why: "Most visitors skim and decide within about 10 seconds (Nielsen Norman Group).",
    },
    {
      ok: /\d/.test(text),
      title: "Has a number or proof point",
      why: "Specific beats vague: “in 2 minutes”, “100 customers”, “$19”.",
    },
    {
      ok: /\b(you|your|you're|yours)\b/.test(lower),
      title: "Talks to the visitor (“you”)",
      why: "People look for what is in it for them, not what you built.",
    },
    {
      ok: !BUZZ.some((b) => lower.includes(b)),
      title: "No empty buzzwords",
      why: "Words like “seamless” or “powerful” say nothing. Say what it does.",
    },
    {
      ok: /\b(for|helps?|lets?|turns?|makes?|get|find|see|stop|save|build|test|track|plan)\b/.test(lower),
      title: "Says what it does or who it is for",
      why: "A visitor should know the product in one read.",
    },
  ];
}

export default function HeadlineCheck() {
  const [text, setText] = useState("");
  const checks = text.trim() ? checkHeadline(text) : null;
  const passed = checks ? checks.filter((c) => c.ok).length : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="t-label text-center">try it now · free · no sign-up</p>
      <h2 className="t-chunk mt-3 text-center">Is your headline pulling its weight?</h2>
      <p className="t-lead mx-auto mt-4 max-w-xl text-center">Paste your main headline. You get a 5-point check in a second, right here in your browser.</p>

      <div className="card mt-8 p-5 sm:p-7">
        <label htmlFor="hc" className="field-label">
          Your headline
        </label>
        <input
          id="hc"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Plan your week's meals in 2 minutes, for busy parents"
          className="field h-12"
          maxLength={160}
          autoComplete="off"
        />

        <div aria-live="polite" className="mt-5">
          {checks ? (
            <>
              <p className="t-number text-4xl text-accent">
                {passed}
                <span className="text-xl text-faint">/5</span>
              </p>
              <ul className="mt-3 divide-y divide-line">
                {checks.map((c) => (
                  <li key={c.title} className="flex items-start gap-3 py-3">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${c.ok ? "bg-accent text-accent-fg" : "border border-line-strong text-muted"}`}
                      aria-hidden
                    >
                      {c.ok ? "✓" : "✕"}
                    </span>
                    <div>
                      <p className="font-medium">
                        <span className="sr-only">{c.ok ? "Passed: " : "Needs work: "}</span>
                        {c.title}
                      </p>
                      <p className="text-sm text-muted">{c.why}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted">Type a headline to see your checklist.</p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="max-w-md text-sm text-muted">
            This is a quick rule-of-thumb checklist, not the Crawler test. The real test sends 100 simulated customers through your whole page.
          </p>
          <Link href="/onboarding" className="btn btn-primary h-11 px-5">
            Run the real test
            <Arrow />
          </Link>
        </div>
      </div>
    </div>
  );
}
