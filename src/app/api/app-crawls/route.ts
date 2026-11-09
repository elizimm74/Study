// POST /api/app-crawls  { batch, screens, screensB }  ->  { crawlId }
// The browser already uploaded the screenshots to the user's own folder
// (screenshots/{userId}/uploads/{batch}/1.jpg, ...). start_app_analyze checks
// the names + rate limit and queues an "analyze" job; a worker reads them.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = (await req.json().catch(() => ({}))) as { batch?: string; screens?: string[]; screensB?: string[] };
  if (!body.batch || !Array.isArray(body.screens)) return jsonError("Please upload your screens first.");
  const { data, error } = await auth.supabase.rpc("start_app_analyze", {
    p_batch: body.batch,
    p_screens: body.screens,
    p_screens_b: Array.isArray(body.screensB) ? body.screensB : [],
  });
  if (error) return jsonError(error.message, 429);
  return NextResponse.json({ crawlId: data as string });
}
