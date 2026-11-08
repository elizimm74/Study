// Runs before every page and API request:
//  1. keeps the visitor's sign-in fresh (Supabase tokens expire hourly)
//  2. sends signed-out visitors to /signin for the private parts of the app
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { AUTH_ENABLED, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

const PRIVATE_PAGES = ["/app", "/run", "/tests", "/onboarding"];
const PRIVATE_APIS = ["/api/crawls", "/api/tests", "/api/files"];

export async function middleware(request: NextRequest) {
  if (!AUTH_ENABLED) return NextResponse.next(); // accounts switched off

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, headers) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // This call also refreshes an expired sign-in. Don't remove it.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const starts = (list: string[]) => list.some((p) => path === p || path.startsWith(p + "/"));
  if (!user && starts(PRIVATE_APIS)) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  if (!user && starts(PRIVATE_PAGES)) {
    const url = request.nextUrl.clone();
    // Coming from the landing page's URL box (/app?url=...)? They're probably
    // new, so show sign UP. Either way, keep where they were going (+ the URL).
    const fromLanding = path === "/app" && request.nextUrl.searchParams.has("url");
    url.pathname = fromLanding ? "/signup" : "/signin";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Skip static files and images (faster).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|demo/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
