// POST /api/analyze  { url }
// Crawls the site, then asks Haiku what the product is and who it's for.
import { NextResponse } from "next/server";
import { crawlSite } from "@/lib/crawl";
import { understandSite, EMPTY_PROFILE } from "@/lib/suggest";
import { logRunCost } from "@/lib/cost";
import type { Crawl } from "@/lib/types";

export const runtime = "nodejs"; // Playwright needs full Node.js
export const maxDuration = 120;

export async function POST(req: Request) {
  const { url } = (await req.json()) as { url?: string };
  const cleanUrl = normalizeUrl(url);
  if (!cleanUrl) {
    return NextResponse.json({ error: "Please enter a valid website address." }, { status: 400 });
  }

  let crawl: Crawl;
  try {
    crawl = await crawlSite(cleanUrl);
  } catch (err) {
    console.error("[analyze] crawl failed:", err);
    return NextResponse.json(
      { error: `Couldn't open that site: ${(err as Error).message.split("\n")[0]}` },
      { status: 502 },
    );
  }

  // If the AI step fails (e.g. no API key yet), still return the crawl so
  // the user can fill in the profile and audience by hand.
  try {
    const { profile, audience, cost } = await understandSite(crawl);
    logRunCost(`analyze ${crawl.id}`, [...crawl.costs, cost]);
    return NextResponse.json({ crawl: publicCrawl(crawl), profile, audience });
  } catch (err) {
    console.error("[analyze] understanding failed:", (err as Error).message);
    if (crawl.costs.length) logRunCost(`analyze ${crawl.id}`, crawl.costs);
    return NextResponse.json({
      crawl: publicCrawl(crawl),
      profile: EMPTY_PROFILE,
      audience: null,
      suggestError: (err as Error).message,
    });
  }
}

function normalizeUrl(input?: string) {
  if (!input) return null;
  const withProtocol = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
  try {
    const u = new URL(withProtocol);
    // Allow real domains, plus localhost so you can test /demo/ on your own computer.
    return u.hostname.includes(".") || u.hostname === "localhost" ? u.toString() : null;
  } catch {
    return null;
  }
}

// Send the browser only what it needs to display (not the full page text).
function publicCrawl(crawl: Crawl) {
  return {
    id: crawl.id,
    url: crawl.url,
    pages: crawl.pages.map((p) => ({
      step: p.step,
      url: p.url,
      title: p.title,
      screenshots: p.screenshotFiles.map((f) => `/api/screenshot/${crawl.id}/${f}`),
      note: p.note,
    })),
  };
}
