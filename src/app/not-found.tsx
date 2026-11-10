// The "404" page.
import Link from "next/link";
import { Arrow } from "@/components/landing/UrlForm";

export const metadata = { title: "crawler: page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="t-label">404</p>
      <h1 className="t-h1 mt-4">Nothing here.</h1>
      <p className="t-lead mt-4">That link doesn&apos;t go anywhere. If it was a shared scorecard, the owner may have turned sharing off.</p>
      <Link href="/" className="btn btn-primary mt-8 h-12 px-6">
        Back home <Arrow />
      </Link>
    </div>
  );
}
