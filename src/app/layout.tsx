// The frame around every page: <html>, <body>, the floating top bar.
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
  title: `${APP_NAME}: test your startup on 100 AI customers`,
  description: "Paste your site. 100 AI customers try it and tell you why they'd leave, before your launch does.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();

  return (
    <html lang="en">
      <body className="min-h-screen">
        {/* Floating pill header */}
        <header className="sticky top-3 z-50 px-3">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-full border border-slate-200 bg-white/80 px-4 py-2 shadow-[0_8px_30px_-12px_rgba(28,30,34,0.2)] backdrop-blur-xl">
            <Link href="/" className="display flex items-center gap-1.5 text-xl lowercase">
              <span className="text-indigo-600">✱</span>
              {APP_NAME}
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium">
              {user ? (
                <>
                  <NavLink href="/tests">My tests</NavLink>
                  <form action="/auth/signout" method="post">
                    <button className="rounded-full px-3 py-1.5 text-slate-500 hover:text-slate-900">Sign out</button>
                  </form>
                  <Link href="/app" className="btn ml-1 px-4 py-1.5">
                    New test
                  </Link>
                </>
              ) : AUTH_ENABLED ? (
                <>
                  <NavLink href="/#how" className="hidden sm:inline-block">
                    How it works
                  </NavLink>
                  <NavLink href="/#pricing" className="hidden sm:inline-block">
                    Pricing
                  </NavLink>
                  <NavLink href="/signin">Sign in</NavLink>
                  <Link href="/signup" className="btn ml-1 px-4 py-1.5">
                    Start free
                  </Link>
                </>
              ) : (
                <Link href="/app" className="btn px-4 py-1.5">
                  Open app
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-16 pt-10">{children}</main>
      </body>
    </html>
  );
}

function NavLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`rounded-full px-3 py-1.5 text-slate-600 hover:bg-white/70 hover:text-slate-900 ${className}`}>
      {children}
    </Link>
  );
}
