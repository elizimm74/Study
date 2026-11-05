// GET /api/run/:id  -> progress while running, the full report when done.
import { NextResponse } from "next/server";
import { getRun, type Run } from "@/lib/pipeline";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let run = await getRun(id);

  // Accounts on: you can only open YOUR tests.
  if (AUTH_ENABLED) {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    if (run && run.userId !== user.id) run = null;
    if (!run) {
      // Not on this computer? Load it from the database (Row Level Security
      // only returns it if it's this user's).
      const { data } = await (await supabaseServer()).from("tests").select("data").eq("id", id).maybeSingle();
      run = (data?.data as Run | undefined) ?? null;
    }
  }
  if (!run) return NextResponse.json({ error: "Run not found." }, { status: 404 });

  if (run.status === "running") {
    // Small response while we wait — no need to send the persona list.
    return NextResponse.json({
      status: run.status,
      stage: run.stage,
      progress: run.progress,
      journey: run.journey, // the explorer's steps so far, for the live view
    });
  }
  return NextResponse.json(run);
}
