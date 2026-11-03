// POST /api/analyze  { url }
// Crawls the site, then asks Haiku to guess the audience.
import { NextResponse } from "next/server";
import { crawlSite } from "@/lib/crawl";
import { suggestAudience } from "@/lib/suggest";
import { logRunCost } from "@/lib/cost";

export const runtime = "nodejs"; // Playwright needs full Node.js
export const maxDuration = 120;

export async function POST(req: Request) {
  const { url } = (await req.json()) as { url?: string };
  const cleanUrl = normalizeUrl(url);
  if (!cleanUrl) {
    return NextResponse.json({ error: "Please enter a valid website address." }, { status: 400 });
  }

  let crawl;
  try {
    crawl = await crawlSite(cleanUrl);
  } catch (err) {
    console.error("[analyze] crawl failed:", err);
    return NextResponse.json(
      { error: `Couldn't open that site: ${(err as Error).message.split("\n")[0]}` },
      { status: 502 },
    );
  }

  // If the AI guess fails (e.g. no API key yet), still return the crawl so
  // the user can fill in the audience by hand.
  try {
    const { audience, summary, cost } = await suggestAudience(crawl);
    logRunCost(`analyze ${crawl.id}`, [cost]);
    return NextResponse.json({ crawl: publicCrawl(crawl), audience, summary });
  } catch (err) {
    console.error("[analyze] suggestion failed:", (err as Error).message);
    return NextResponse.json({
      crawl: publicCrawl(crawl),
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
function publicCrawl(crawl: Awaited<ReturnType<typeof crawlSite>>) {
  return {
    id: crawl.id,
    url: crawl.url,
    pages: crawl.pages.map((p) => ({
      step: p.step,
      url: p.url,
      title: p.title,
      chars: p.text.length,
      screenshot: p.screenshotFile ? `/api/screenshot/${crawl.id}/${p.screenshotFile}` : null,
      note: p.note,
    })),
  };
}
