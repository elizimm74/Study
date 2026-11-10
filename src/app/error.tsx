"use client";
// Shown if a page crashes, instead of a blank screen.
import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-16 text-center" role="alert">
      <p className="t-label">something broke</p>
      <h1 className="t-h1 mt-4">That didn&apos;t work.</h1>
      <p className="t-lead mt-4">It&apos;s on our side. Try again, and if it keeps happening, go back home.</p>
      <div className="mt-8 flex justify-center gap-2">
        <button onClick={reset} className="btn btn-primary h-12 px-6">
          Try again
        </button>
        <Link href="/" className="btn btn-secondary h-12 px-6">
          Home
        </Link>
      </div>
    </div>
  );
}
