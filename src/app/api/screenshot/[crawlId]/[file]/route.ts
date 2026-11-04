// GET /api/screenshot/:crawlId/:file  -> the JPEG the crawler saved.
import fs from "fs/promises";
import { screenshotPath } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ crawlId: string; file: string }> },
) {
  const { crawlId, file } = await params;
  // Only allow our own simple names, e.g. "a1b2c3d4e5" + "hero-1.jpg" or "explore-03.jpg"
  // (the first part is a crawl id, or a run id for the explorer's screenshots)
  if (!/^[a-z0-9]+$/.test(crawlId) || !/^((hero|pricing|signup)-(\d|m)|explore-\d\d)\.jpg$/.test(file)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const data = await fs.readFile(screenshotPath(crawlId, file));
    return new Response(new Uint8Array(data), { headers: { "Content-Type": "image/jpeg" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
