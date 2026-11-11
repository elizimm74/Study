// GET /r/<code>: an invite link. It remembers who invited you (a cookie for 14 days)
// and sends you to the questions. When you then sign up, the middleware credits your friend.
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL("/onboarding", req.url));
  if (/^[a-f0-9]{8}$/.test(code.toLowerCase())) {
    res.cookies.set("crawler_ref", code.toLowerCase(), { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 14, path: "/" });
  }
  return res;
}
