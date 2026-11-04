// GET /api/run/:id  -> progress while running, the full report when done.
import { NextResponse } from "next/server";
import { getRun } from "@/lib/pipeline";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getRun(id);
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
