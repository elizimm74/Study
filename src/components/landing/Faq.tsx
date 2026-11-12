// The honest FAQ at the bottom of the home page. The answers say what Crawler
// is and isn't, because trust is what makes people try it.
import Reveal from "../Reveal";
import SplitReveal from "./motion/SplitReveal";

const QA: [string, string][] = [
  [
    "Are the customers real?",
    "No. They're simulated by AI, built from the audience you pick (age, budget, mindset, device, patience). They show buying intent, not real purchases, so use them to find what to fix before launch, not to forecast revenue.",
  ],
  [
    "How accurate is it?",
    "The facts are as accurate as you make them: you confirm every price, button and screen before the test runs. Predictions can't be perfect, so we run apps 3 times to show a range, compare against published subscription-app benchmarks, and publish predicted vs real results on our accuracy page.",
  ],
  ["What does it cost?", "Your first test is free. After that you buy tests in one-time packs that never expire. No subscription."],
  [
    "Do you test apps too?",
    "Yes. Drop in screenshots of your onboarding and paywall. You get a screen-by-screen drop-off, App Store and Google Play rule checks, an A/B verdict for two paywalls, and rewritten copy.",
  ],
  [
    "What does it do with my site or login?",
    "It opens only public pages, like any visitor. If you let the explorer log in, you give it a test account: the password is encrypted, erased after one read, and never shown to the AI. It never gets around other sites' logins or CAPTCHAs.",
  ],
];

export default function Faq() {
  return (
    <Reveal className="mx-auto max-w-3xl">
      <p className="t-number text-6xl text-accent sm:text-7xl" aria-hidden>
        ?
      </p>
      <SplitReveal text="Fair questions." className="t-chunk mt-4" />
      <div className="mt-10 divide-y divide-line border-y border-line">
        {QA.map(([q, a]) => (
          <details key={q} className="group py-2">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-2 text-lg font-medium">
              {q}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden>
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <p className="pb-4 pr-8 text-muted">{a}</p>
          </details>
        ))}
      </div>
    </Reveal>
  );
}
