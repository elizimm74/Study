// The frame around every page: <html>, <body>, the top bar.
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { APP_NAME } from "@/lib/config";
import { currentUser } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";

// Build every page fresh for each visitor, so the header always shows
// whether THIS person is signed in.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Test your landing page on 100 AI customers before you launch.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();

  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-slate-200">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
            <Link href="/" className="flex items-center gap-1.5 text-lg font-extrabold lowercase tracking-tight">
              <span className="text-indigo-600">✱</span>
              {APP_NAME}
            </Link>
            <nav className="flex items-center gap-4 text-sm font-semibold">
              {user ? (
                <>
                  <Link href="/tests" className="hover:text-indigo-600">
                    My tests
                  </Link>
                  <Link href="/app" className="rounded-full bg-slate-900 px-4 py-2 text-white hover:bg-indigo-600">
                    New test
                  </Link>
                  <form action="/auth/signout" method="post">
                    <button className="text-slate-400 hover:text-slate-900">Sign out</button>
                  </form>
                </>
              ) : AUTH_ENABLED ? (
                <>
                  <Link href="/#pricing" className="hidden hover:text-indigo-600 sm:inline">
                    Pricing
                  </Link>
                  <Link href="/signin" className="hover:text-indigo-600">
                    Sign in
                  </Link>
                  <Link href="/signup" className="rounded-full bg-slate-900 px-4 py-2 text-white hover:bg-indigo-600">
                    Start free
                  </Link>
                </>
              ) : (
                <Link href="/app" className="rounded-full bg-slate-900 px-4 py-2 text-white hover:bg-indigo-600">
                  Open app
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
