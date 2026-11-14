"use client";
// "What can I test?" Four tabs, each with a typical problem, what Crawler looks at, and the kind
// of fix it suggests. These are EXAMPLES of what the tool looks for, not results from real tests.
import { useState } from "react";
import Link from "next/link";
import { Arrow } from "./UrlForm";

const CASES = [
  {
    id: "saas",
    tab: "SaaS landing page",
    problem: "Visitors can't tell what it does in 10 seconds, and the price is hidden behind “Contact us”.",
    looks: ["The headline and first screen", "Whether the price is easy to find", "Signup form length and card requirements"],
    fix: "Say who it is for in the headline, and show at least a starting price.",
  },
  {
    id: "app",
    tab: "App onboarding + paywall",
    problem: "The paywall appears before the person has felt any value, and the trial terms are unclear.",
    looks: ["Each onboarding screen, in order", "The paywall's price, trial and cancel wording", "App Store / Google Play rule checks"],
    fix: "Show the first win before the paywall, and put the price and trial length next to the button.",
  },
  {
    id: "waitlist",
    tab: "Waitlist page",
    problem: "People like the idea but see no reason to join now, and no proof anyone else did.",
    looks: ["The promise and the proof", "How much you ask for (email only vs more)", "What happens after joining"],
    fix: "Add a reason to join now (early access, a perk) and one real proof point.",
  },
  {
    id: "pricing",
    tab: "Pricing page",
    problem: "Three similar plans, no clear recommendation, and a feature list nobody understands.",
    looks: ["How plans compare", "The call to action on each plan", "Objections like “is it worth it?”"],
    fix: "Highlight one plan, shorten the list, and add a money-back or cancel-anytime line.",
  },
] as const;

export default function UseCases() {
  const [id, setId] = useState<(typeof CASES)[number]["id"]>("saas");
  const c = CASES.find((x) => x.id === id)!;
  return (
    <div className="mx-auto max-w-4xl">
      <p className="t-label text-center">what can I test?</p>
      <h2 className="t-chunk mt-3 text-center">Pages, apps and paywalls.</h2>

      <div className="mt-8 flex flex-wrap justify-center gap-2" role="group" aria-label="Choose a product type">
        {CASES.map((x) => (
          <button key={x.id} type="button" className="chip" aria-pressed={id === x.id} onClick={() => setId(x.id)}>
            {x.tab}
          </button>
        ))}
      </div>

      <div className="card mt-6 grid gap-6 p-6 sm:p-8 md:grid-cols-3" aria-live="polite">
        <div>
          <p className="t-label">a common problem</p>
          <p className="mt-2 font-medium">{c.problem}</p>
        </div>
        <div>
          <p className="t-label">what Crawler looks at</p>
          <ul className="mt-2 space-y-2 text-sm text-muted">
            {c.looks.map((l) => (
              <li key={l} className="flex gap-2">
                <span aria-hidden className="text-accent">
                  ✱
                </span>
                {l}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="t-label">a typical fix</p>
          <p className="mt-2 font-medium">{c.fix}</p>
          <Link href={c.id === "app" ? "/onboarding?kind=app" : "/onboarding"} className="btn btn-text mt-3 h-10 px-0 text-sm">
            Test {c.id === "app" ? "my app" : "my page"}
            <Arrow />
          </Link>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-faint">Examples of what the test looks for, not results from real tests.</p>
    </div>
  );
}
