// PUT    /api/audiences/:id { name, audience } -> changes a saved mind
// DELETE /api/audiences/:id                    -> removes it
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { cleanAudience, mindProblem } from "@/lib/audience";

const UUID = /^[0-9a-f-]{36}$/;

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!UUID.test(id)) return jsonError("Not found.", 404);
  const body = (await req.json().catch(() => ({}))) as { name?: string; audience?: unknown };
  const name = (body.name ?? "").trim().slice(0, 60);
  if (!name) return jsonError("Give your customer mind a name.");
  const audience = cleanAudience(body.audience);
  if (!audience) return jsonError("That audience wasn't understood.");
  const problem = mindProblem(audience);
  if (problem) return jsonError(problem);
  const { data, error } = await auth.supabase.from("saved_audiences").update({ name, audience }).eq("id", id).select("id");
  if (error) return jsonError(error.code === "23505" ? "You already have a mind with that name." : error.message);
  if (!data?.length) return jsonError("Not found.", 404);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!UUID.test(id)) return jsonError("Not found.", 404);
  const { error } = await auth.supabase.from("saved_audiences").delete().eq("id", id);
  if (error) return jsonError(error.message);
  return NextResponse.json({ ok: true });
}
