// THE HOME PAGE (v9, 2026-11-27: conversion redesign). ONE goal: a visitor pastes a URL and runs a
// free simulation. Every section either pushes toward that or builds the trust needed to do it:
//   1. Hero: the promise, the URL box ("Run simulation") + "See a sample report", what's free,
//      the launch offer and (once there's enough) real proof numbers; the example customer card.
//   2. The simulation diagram: the page stops on it and each scroll shows the next stage (1/4 ... 4/4).
//   3. How it works: 3 steps, full sentences, 3 columns on desktop.
//   4. The interactive sample report (the strongest trust asset) + the full sample report link.
//   5. Pricing, with the free test as the highlighted default.
//   6. A real founder spotlight.
//   7. Honest by design (4 points, the rest folded).
//   8. Fair questions (4 visible, the rest folded).
//   9. The same URL box again.
// Brand kept: concrete texture, washed denim, the big "crawler" wordmark, the persona card.
// The long science section, personas, "what you can analyze" bento, illustrative case scenarios
// and the second animation were removed from here; the science lives on /science.
import Link from "next/link";
import HeroForm from "@/components/landing/home/HeroForm";
import PhotoHero from "@/components/landing/PhotoHero";
import ReportLab from "@/components/landing/home/ReportLab";
import LabSequence, { type LabStage } from "@/components/landing/lab/LabSequence";
import Reveal from "@/components/Reveal";
import Faq from "@/components/landing/Faq";
import StickyRun from "@/components/landing/StickyRun";
import { homeDemo } from "@/lib/homeDemo";
import { PACKS, PLANS, STARTER_CUSTOMERS } from "@/lib/plans";
import { launchState, proofStats } from "@/lib/launch";
import { publishedCaseStudies } from "@/lib/caseStudies";

export const metadata = {
  title: { absolute: "Crawler: meet your customers before they meet your website" },
  description:
    "Would your customers actually buy? Paste your website and run a free simulation: see who would buy, what stops the rest, and what to fix first. 25 simulated customers free, no card.",
  alternates: { canonical: "/" },
};

// The four stages of the compact simulation (each one sentence).
const STAGES: LabStage[] = [
  { code: "01", title: "Your crowd", text: "Up to 1,000 simulated customers per test, each with their own budget, patience and reason to visit." },
  { code: "02", title: "Different minds", text: "Every customer weighs price, trust and effort differently, the way real visitors do." },
  { code: "03", title: "The visit", text: "They land on your page, look for the price and the signup, and decide whether to keep going." },
  { code: "04", title: "The decision", text: "Buy, hesitate or leave, with the reason in their own words." },
];

// How it works: three steps, in full sentences.
const STEPS = [
  {
    title: "Paste your website",
    text: "Crawler opens it like a first-time visitor, on a laptop and a phone, and finds your pricing and signup. You check what it found and pick who your customers are.",
  },
  {
    title: "Simulated customers visit",
    text: "Each one has their own budget, patience, mindset and reason to be there. They read your page, hit your price, try your signup and decide: buy, maybe or leave.",
  },
  {
    title: "Get the why, and the fix",
    text: "You see how many would buy, exactly what stopped the rest, where they dropped off, and a ranked list of fixes with how many customers each could win back.",
  },
];

// Honest by design: four points up front, the rest folded.
const HONEST: [string, string][] = [
  ["Simulated intent, not real purchases", "The customers are AI simulations. Use them to find what to fix before launch, not to forecast revenue."],
  ["You confirm the facts first", "You check every price, button and screen Crawler found before a single customer runs."],
  ["Public pages only", "Crawler visits your site like any visitor. It never gets around logins, paywalls or bot checks."],
  ["Predictions are checked in public", "Add your real results after launch and we show predicted vs real on the accuracy page."],
];
const HONEST_MORE: [string, string][] = [
  ["Grounded in research", "How long visitors stay, what they look for and what makes them quit comes from published studies. Everything we assumed is labelled as an assumption."],
  ["Counted in code", "Scores, drop-offs and win-back numbers are counted by our code from every customer's answer, not guessed by the AI."],
  ["Checked for copy-paste answers", "Each report checks that customers gave different reasons and quotes, and tells you if they didn't."],
];

export default async function Home() {
  const demo = homeDemo();
  const s = demo.sample;
  const mix = { buy: s.buy / s.total, maybe: s.maybe / s.total, no: s.no / s.total };
  const real = publishedCaseStudies();
  const [launch, proof] = await Promise.all([launchState(), proofStats()]);
  const paid = PLANS.filter((pl) => pl.priceUsd > 0);
  const cheapestTest = PACKS[0];

  return (
    <div className="v14 home27 bleed-full">
      {/* ================= 1. HERO: full-screen nature photo + glass (PhotoHero.tsx) ================= */}
      <PhotoHero launch={launch} starter={STARTER_CUSTOMERS} proof={proof} />

      {/* ================= 2. ONE COMPACT SIMULATION ================= */}
      <section className="night18 lab lab27" aria-label="A simulation, illustrated">
        <LabSequence
          steps
          id="simulation"
          index="Live"
          name="How a simulation runs"
          heading="A focus group that never sleeps."
          hint=""
          note="Illustration. Group sizes follow Crawler's demo run, not real customers."
          scene="simulation"
          stages={STAGES}
          mix={mix}
        />
      </section>

      {/* ================= 3. HOW IT WORKS (3 columns) ================= */}
      <section id="how" className="home-wide scroll-mt-24 py-16 sm:py-24" aria-labelledby="how-title">
        <div className="max-w-2xl">
          <p className="t-label">How it works</p>
          <h2 id="how-title" className="t-h1 mt-3">
            From your URL to ranked fixes in a few minutes.
          </h2>
        </div>
        <ol className="steps27 mt-10">
          {STEPS.map((st, k) => (
            <li key={st.title} className="step27">
              <span className="step27-n" aria-hidden>
                {k + 1}
              </span>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">{st.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{st.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ================= 4. SAMPLE REPORT (the strongest trust asset) ================= */}
      <section id="report" className="home-wide scroll-mt-24 pb-16 sm:pb-24" aria-labelledby="report-title">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="t-label">Sample report</p>
            <h2 id="report-title" className="t-h1 mt-3">
              This is what you get back.
            </h2>
            <p className="mt-3 text-muted">Click through the tabs: who would buy, what stopped them, where they dropped off, and what to fix first.</p>
          </div>
          <Link href="/example" className="btn btn-secondary h-12 px-6">
            See the full sample report
          </Link>
        </div>
        <Reveal className="mt-10">
          <ReportLab data={s} funnel={demo.funnel} />
        </Reveal>
      </section>

      {/* ================= 5. PRICING (free test first) ================= */}
      <section id="pricing" className="home-wide scroll-mt-24 pb-16 sm:pb-24" aria-labelledby="price-title">
        <div className="max-w-2xl">
          <p className="t-label">Pricing</p>
          <h2 id="price-title" className="t-h1 mt-3">
            Start free. Pay only when it&apos;s useful.
          </h2>
        </div>
        <div className="price27 mt-10">
          <div className="price27-free">
            <p className="chip14 w-max">Start here</p>
            <p className="mt-4 text-sm font-semibold">Free test</p>
            <p className="mt-1 text-5xl font-semibold tracking-tight">$0</p>
            <p className="mt-3 text-[15px]">
              One simulation with {STARTER_CUSTOMERS} customers on your website, store or app. No card. See your score and the top reasons people said no.
            </p>
            <Link href="#hero-url" className="btn btn-primary mt-6 h-12 w-full sm:w-auto sm:px-8">
              Run simulation
            </Link>
          </div>
          <ul className="price27-paid">
            {paid.map((pl) => (
              <li key={pl.id} className="price27-row">
                <span className="font-semibold">{pl.name}</span>
                <span className="text-sm text-muted">{pl.customers.toLocaleString("en-US")} customers / month{pl.ads ? " · ads too" : ""}</span>
                <span className="ml-auto font-semibold tabular-nums">${pl.priceUsd}<span className="text-sm font-normal text-faint"> / mo</span></span>
              </li>
            ))}
            <li className="price27-row">
              <span className="font-semibold">One test</span>
              <span className="text-sm text-muted">no subscription</span>
              <span className="ml-auto font-semibold tabular-nums">from ${cheapestTest.priceUsd}</span>
            </li>
            <li className="pt-3">
              <Link href="/pricing" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
                Compare plans →
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {/* ================= 6. A REAL FOUNDER ================= */}
      {real.slice(0, 1).map((c) => (
        <section key={c.slug} className="home-wide pb-16 sm:pb-24" aria-label={`Founder spotlight: ${c.founder}`}>
          <Link href={`/case-studies/${c.slug}`} className="spot23 group">
            <span className="spot23-faces" aria-hidden>
              {/* small copies of the photos: they're shown at ~64px */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.photo.replace(/\.jpg$/, "-thumb.jpg")} alt="" className="spot23-face" width={96} height={96} loading="lazy" decoding="async" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.icon.replace(/\.jpg$/, "-thumb.jpg")} alt="" className="spot23-icon" width={48} height={48} loading="lazy" decoding="async" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#56554f]">Founder spotlight</span>
              <span className="mt-1 block text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
                {c.founder}, {c.age}, tested {c.product} with Crawler.
              </span>
            </span>
            <span className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium underline underline-offset-4">Read his story →</span>
          </Link>
        </section>
      ))}

      {/* ================= 7. HONEST BY DESIGN ================= */}
      <section className="home-wide pb-16 sm:pb-24" aria-labelledby="honest-title">
        <div className="max-w-2xl">
          <p className="t-label">Honest by design</p>
          <h2 id="honest-title" className="t-h1 mt-3">
            Simulated customers. Real reasons.
          </h2>
        </div>
        <ul className="honest27 mt-10">
          {HONEST.map(([t, d]) => (
            <li key={t}>
              <p className="font-semibold">{t}</p>
              <p className="mt-1.5 text-[15px] text-muted">{d}</p>
            </li>
          ))}
        </ul>
        <details className="mt-6">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-sm font-medium underline underline-offset-4">How we keep it honest ({HONEST_MORE.length} more)</summary>
          <ul className="honest27 mt-4">
            {HONEST_MORE.map(([t, d]) => (
              <li key={t}>
                <p className="font-semibold">{t}</p>
                <p className="mt-1.5 text-[15px] text-muted">{d}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">
            The research, the assumptions and the limits are all on{" "}
            <Link href="/science" className="underline underline-offset-2">
              the science page
            </Link>
            .
          </p>
        </details>
      </section>

      {/* ================= 8. FAIR QUESTIONS ================= */}
      <section className="home-wide pb-16 sm:pb-24">
        <Faq visible={4} />
      </section>

      {/* ================= 9. FINAL CTA ================= */}
      <section className="home-wide pb-4" aria-labelledby="final-title">
        <div className="final14 relative overflow-hidden">
          <h2 id="final-title" className="h2-14 relative mx-auto max-w-3xl">
            Stop guessing. <span className="hl14">Start validating.</span>
          </h2>
          <p className="relative mx-auto mt-5 max-w-lg text-muted">Paste your website. Your first simulation is free, with {STARTER_CUSTOMERS} customers and no card.</p>
          <div className="url14 relative mx-auto mt-8 max-w-2xl text-left">
            <HeroForm cta="Run simulation" id="final-url" />
          </div>
        </div>
      </section>

      {/* phones: a "Run simulation" bar within thumb reach once the hero box is off screen */}
      <StickyRun />
    </div>
  );
}
