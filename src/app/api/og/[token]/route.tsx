// GET /api/og/{token}  -> the scorecard PNG ("home" = the brand card).
// Public on purpose: social sites need to fetch it without signing in.
import { brandImage, scorecardImage } from "@/lib/scorecard";
import { getShared } from "@/lib/shared";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (token === "home") return brandImage();
  const shared = await getShared(token);
  if (!shared) return new Response("Not found", { status: 404 });
  return scorecardImage(shared);
}
