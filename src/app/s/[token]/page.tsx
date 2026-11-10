// /s/{token}: a PUBLIC scorecard someone shared. Headline numbers only.
// It's also a landing page: the button starts a test of your own.
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getShared } from "@/lib/shared";
import { SITE_URL } from "@/lib/config";
import { Arrow } from "@/components/landing/UrlForm";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const s = await getShared(token);
  if (!s) return { title: "crawler", robots: { index: false } };
  const what = s.kind === "app" ? "an app" : (s.host ?? "a website");
  const title = `${s.score} of ${s.total} simulated customers ${s.goal ? `would ${s.goal}` : "would convert"} · ${what}`;
  return {
    title: `crawler: ${title}`,
    description: s.blocker ? `Biggest blocker: ${s.blocker}. Simulated customers show buying intent, not real purchases.` : "Simulated customers show buying intent, not real purchases.",
    robots: { index: false }, // private links stay out of search
    openGraph: { title, images: [{ url: `${SITE_URL}/api/og/${token}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [`${SITE_URL}/api/og/${token}`] },
  };
}

export default async function SharedScorecard({ params }: Props) {
  const { token } = await params;
  const s = await getShared(token);
  if (!s) notFound();
  const what = s.kind === "app" ? "App onboarding + paywall" : (s.host ?? "A website");
  const pct = (x: number) => Math.round(x * 100);

  return (
    <div className="mx-auto max-w-3xl">
      <section className="paper bleed py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <span className="t-label truncate">{what}</span>
            <span className="t-label shrink-0">scorecard</span>
          </div>
          <p className="mt-8 flex items-end gap-2">
            <span className="t-number text-8xl text-accent sm:text-9xl">{s.score}</span>
            <span className="t-number pb-2 text-3xl text-faint sm:text-4xl">/{s.total}</span>
          </p>
          <p className="mt-2 text-lg font-medium">simulated customers {s.goal ? `would ${s.goal}` : "would convert"}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {s.blocker && <span className="pill">Biggest blocker: {s.blocker}</span>}
            {s.kind === "app" && s.low !== null && s.high !== null && pct(s.low) !== pct(s.high) && (
              <span className="pill">
                range across 3 crowds: {pct(s.low)}–{pct(s.high)}%
              </span>
            )}
          </div>
          <p className="mt-8 border-t border-line pt-4 text-sm text-muted">
            These are simulated customers: they show buying intent, not real purchases. Crawler is a fast, honest signal on what to fix before launch day.
          </p>
        </div>
      </section>

      <div className="mt-16 text-center">
        <h1 className="t-h1">What would stop people from buying yours?</h1>
        <p className="t-lead mx-auto mt-4 max-w-md">Paste your site or drop in your app screens. Your first test is free.</p>
        <Link href="/onboarding" className="btn btn-primary mt-8 h-14 px-8 text-base">
          Test mine free <Arrow />
        </Link>
        <p className="mt-6">
          <Link href="/example" className="text-sm underline">
            See a full example report
          </Link>
        </p>
      </div>
    </div>
  );
}
