// The frame around every page: <html>, <body>, the top bar and the footer.
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { APP_NAME, SITE_URL } from "@/lib/config";
import { currentUser } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import Mark from "@/components/Mark";
import Intro from "@/components/landing/Intro";

// Runs before the page is drawn: should the landing intro play? Once per tab,
// and never for people who turned off animations. (See src/components/landing/Intro.tsx.)
const INTRO_SCRIPT = `try{var d=document.documentElement;d.dataset.intro=(sessionStorage.getItem("crawler-intro-seen")||matchMedia("(prefers-reduced-motion: reduce)").matches)?"skip":"play"}catch(e){document.documentElement.dataset.intro="skip"}`;

// Build every page fresh for each visitor, so the header always shows
// whether THIS person is signed in.
export const dynamic = "force-dynamic";

const DESCRIPTION =
  "Simulated customers test your website or app before launch day. See what stops people from buying: buying-intent insights, not real purchases.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${APP_NAME.toLowerCase()}: see what stops customers from buying, before you launch`, template: "%s" },
  description: DESCRIPTION,
  // The card people see when the link is shared (X, iMessage, Slack...).
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: "See what stops customers from buying, before you launch",
    description: DESCRIPTION,
    images: [{ url: "/api/og/home", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "See what stops customers from buying, before you launch", description: DESCRIPTION, images: ["/api/og/home"] },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();

  return (
    // suppressHydrationWarning: the intro script below adds data-intro to <html> before React loads.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      {/* flex column: the footer stays at the bottom even on short pages */}
      <body className="flex min-h-screen flex-col">
        {/* home page only: blue claws scratch a white page open */}
        <Intro />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-bg focus:p-4">
          Skip to content
        </a>
        <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
          <div className="page flex h-16 items-center justify-between gap-4">
            <Logo />
            <nav className="flex items-center gap-1 text-sm" aria-label="Main">
              {user ? (
                <>
                  <NavLink href="/example" className="hidden md:inline-flex">
                    Example
                  </NavLink>
                  <NavLink href="/pricing" className="hidden sm:inline-flex">
                    Pricing
                  </NavLink>
                  <NavLink href="/dashboard">Dashboard</NavLink>
                  <NavLink href="/tests" className="hidden sm:inline-flex">
                    My tests
                  </NavLink>
                  <form action="/auth/signout" method="post" className="hidden sm:block">
                    <button className="btn btn-text text-sm">Sign out</button>
                  </form>
                  <Link href="/app" className="btn btn-secondary ml-1 text-sm">
                    New test
                  </Link>
                </>
              ) : AUTH_ENABLED ? (
                <>
                  <NavLink href="/example" className="hidden md:inline-flex">
                    Example
                  </NavLink>
                  <NavLink href="/pricing" className="hidden sm:inline-flex">
                    Pricing
                  </NavLink>
                  <NavLink href="/signin">Sign in</NavLink>
                  <Link href="/signup" className="btn btn-secondary ml-1 text-sm">
                    Start free
                  </Link>
                </>
              ) : (
                <>
                  <NavLink href="/example" className="hidden md:inline-flex">
                    Example
                  </NavLink>
                  <NavLink href="/pricing" className="hidden sm:inline-flex">
                    Pricing
                  </NavLink>
                  <Link href="/app" className="btn btn-secondary ml-1 text-sm">
                    Open app
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <main id="main" className="page page-enter flex-1 pb-24 pt-12 sm:pt-16">
          {children}
        </main>

        <footer className="border-t border-line">
          <div className="page flex flex-col gap-4 py-6 text-sm text-faint sm:flex-row sm:items-center sm:justify-between">
            <Logo small />
            <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-1">
              <Link href="/example" className="hover:text-fg">
                Example report
              </Link>
              <Link href="/pricing" className="hover:text-fg">
                Pricing
              </Link>
              <Link href="/tools/paywall-checker" className="hover:text-fg">
                Free paywall checker
              </Link>
              <Link href="/accuracy" className="hover:text-fg">
                Accuracy
              </Link>
            </nav>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}

// "crawler" with the claw-scratch logo in front.
function Logo({ small }: { small?: boolean }) {
  return (
    <Link href="/" className={`inline-flex min-h-11 items-center gap-2 font-medium tracking-tight text-fg ${small ? "text-sm" : "text-[17px]"}`}>
      <Mark size={small ? 18 : 26} className="text-white" />
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
