// The frame around every page: <html>, <body>, the top bar and the footer.
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { APP_NAME } from "@/lib/config";
import { currentUser } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import ThemeToggle, { THEME_SCRIPT } from "@/components/ThemeToggle";
import Mark from "@/components/Mark";

// Build every page fresh for each visitor, so the header always shows
// whether THIS person is signed in.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${APP_NAME.toLowerCase()}: see why visitors won't buy`,
  description: "Paste your URL. AI customers try your site and tell you who'd buy, who wouldn't, and what to fix.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();

  return (
    // suppressHydrationWarning: the theme script may add data-theme before React loads.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* flex column: the footer stays at the bottom even on short pages */}
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-bg focus:p-4">
          Skip to content
        </a>
        <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
          <div className="page flex h-16 items-center justify-between gap-4">
            <Logo />
            <nav className="flex items-center gap-1 text-sm" aria-label="Main">
              {user ? (
                <>
                  <NavLink href="/tests">My tests</NavLink>
                  <form action="/auth/signout" method="post" className="hidden sm:block">
                    <button className="btn btn-text text-sm">Sign out</button>
                  </form>
                  <ThemeToggle />
                  <Link href="/app" className="btn btn-secondary ml-1 text-sm">
                    New test
                  </Link>
                </>
              ) : AUTH_ENABLED ? (
                <>
                  <NavLink href="/#how" className="hidden md:inline-flex">
                    How it works
                  </NavLink>
                  <NavLink href="/#pricing" className="hidden md:inline-flex">
                    Pricing
                  </NavLink>
                  <NavLink href="/signin">Sign in</NavLink>
                  <ThemeToggle />
                  <Link href="/signup" className="btn btn-secondary ml-1 text-sm">
                    Start free
                  </Link>
                </>
              ) : (
                <>
                  <NavLink href="/#how" className="hidden md:inline-flex">
                    How it works
                  </NavLink>
                  <NavLink href="/#pricing" className="hidden md:inline-flex">
                    Pricing
                  </NavLink>
                  <ThemeToggle />
                  <Link href="/app" className="btn btn-secondary ml-1 text-sm">
                    Open app
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <main id="main" className="page flex-1 pb-24 pt-12 sm:pt-16">
          {children}
        </main>

        <footer className="border-t border-line">
          <div className="page flex h-16 items-center justify-between gap-4 text-sm text-faint">
            <Logo small />
            <span>© {new Date().getFullYear()}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}

// "crawler" with the hand-drawn asterisk mark in front.
function Logo({ small }: { small?: boolean }) {
  return (
    <Link href="/" className={`inline-flex min-h-11 items-center gap-2 font-medium tracking-tight text-fg ${small ? "text-sm" : "text-[17px]"}`}>
      <Mark size={small ? 18 : 26} className="text-accent" />
      {APP_NAME.toLowerCase()}
    </Link>
  );
}

function NavLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`btn btn-text text-sm ${className}`}>
      {children}
    </Link>
  );
}
