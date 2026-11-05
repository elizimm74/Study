// GET /api/files/{userId}/{crawls|tests}/{id}/{file}.jpg
// Sends the browser to a short-lived signed link for a screenshot, but only if
// it's yours (checked here AND by the storage rules in the database).
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { path } = await params;
  const [userId, kind, id, file] = path;
  const valid =
    path.length === 4 &&
    userId === auth.user.id &&
    (kind === "crawls" || kind === "tests") &&
    /^[a-z0-9]+$/.test(id) &&
    /^[a-z0-9-]+\.jpg$/.test(file);
  if (!valid) return jsonError("Not found.", 404);

  const { data, error } = await auth.supabase.storage.from("screenshots").createSignedUrl(path.join("/"), 60 * 60);
  if (error || !data) return jsonError("Not found.", 404);
  // Screenshots never change, so the browser may keep this redirect for a while.
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { "Cache-Control": "private, max-age=1800" } });
}
