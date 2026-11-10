// POST /api/tests/:id/actual { realPct } -> the founder's REAL conversion rate for this test.
// It powers the public accuracy page (prediction vs reality, anonymous).
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { realPct?: number };
  const pct = Number(body.realPct);
  if (!Number.isFinite(pct)) return jsonError("Please enter a number from 0 to 100.");
  const { error } = await auth.supabase.rpc("submit_actual", { p_test_id: id, p_real_pct: pct });
  if (error) return jsonError(error.message);
  return NextResponse.json({ ok: true });
}
