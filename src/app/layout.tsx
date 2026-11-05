// The frame around every page: <html>, <body>, the top bar.
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Test your landing page on 100 AI customers before you launch.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-slate-200">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-center gap-1.5 text-lg font-extrabold lowercase tracking-tight">
              <span className="text-indigo-600">✱</span>
              {APP_NAME}
            </Link>
            <span className="meta text-slate-400">beta · 100 ai customers</span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
