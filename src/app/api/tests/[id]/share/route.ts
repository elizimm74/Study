// POST   /api/tests/:id/share -> { url }   makes this test's scorecard public (headline numbers only)
// DELETE /api/tests/:id/share              switches the link off again
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { SITE_URL } from "@/lib/config";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  const { data, error } = await auth.supabase.rpc("share_test", { p_test_id: id });
  if (error) return jsonError(error.message);
  return NextResponse.json({ url: `${SITE_URL}/s/${data as string}`, image: `${SITE_URL}/api/og/${data as string}` });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  const { error } = await auth.supabase.rpc("unshare_test", { p_test_id: id });
  if (error) return jsonError(error.message);
  return NextResponse.json({ ok: true });
}
