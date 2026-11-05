// POST /api/crawls  { url }  ->  { crawlId }
// Queues an "analyze" job. A worker crawls the site; the browser checks
// GET /api/crawls/:id until it's done.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { normalizeUrl } from "@/lib/urls";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = (await req.json().catch(() => ({}))) as { url?: string };
  const url = normalizeUrl(body.url);
  if (!url) return jsonError("Please enter a valid website address.");

  // start_analyze checks the rate limit and creates the crawl + job together.
  const { data, error } = await auth.supabase.rpc("start_analyze", { p_url: url });
  if (error) return jsonError(error.message, 429);
  return NextResponse.json({ crawlId: data as string });
}
