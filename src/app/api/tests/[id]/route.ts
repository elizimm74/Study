// GET /api/tests/:id
//  - waiting/running: { status, stage, progress, journey, filesPrefix }  (for the live view)
//  - done/error:      the full report (Run) + filesPrefix
// Row Level Security: you only ever get your own tests.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  const { data: row } = await auth.supabase
    .from("tests")
    .select("status, stage, progress, error, data")
    .eq("id", id)
    .maybeSingle();
  if (!row) return jsonError("Test not found.", 404);

  const filesPrefix = `${auth.user.id}/tests/${id}`;
  if (row.status === "queued" || row.status === "running") {
    const p = (row.progress ?? {}) as { done?: number; total?: number; journey?: unknown };
    return NextResponse.json({
      status: "running",
      stage: row.status === "queued" ? "Waiting for a free worker" : (row.stage ?? "Starting"),
      progress: { done: p.done ?? 0, total: p.total ?? 100 },
      journey: p.journey ?? undefined,
      filesPrefix,
    });
  }
  const run = row.data as Record<string, unknown> | null;
  if (row.status === "error" && (!run || !("stats" in run))) {
    return NextResponse.json({ status: "error", error: row.error ?? "The test failed.", filesPrefix });
  }
  return NextResponse.json({ ...run, filesPrefix });
}
