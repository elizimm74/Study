"use client";
// "Send this": the buttons for sending a link to friends (brag about a score, or invite them).
// The phone's own share sheet when it exists, then WhatsApp, Messages (SMS), Email, X, Copy.
// Plain links: no tracking, no extra packages.
import { useEffect, useState } from "react";

export default function SendBar({ url, text, subject }: { url: string; text: string; subject: string }) {
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  const both = `${text} ${url}`;
  const links = [
    ["WhatsApp", `https://wa.me/?text=${encodeURIComponent(both)}`],
    ["Messages", `sms:?&body=${encodeURIComponent(both)}`],
    ["Email", `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(both)}`],
    ["X", `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`],
  ] as const;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setNote(null);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setNote("Couldn't copy. Select the link and copy it by hand.");
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: subject, text, url });
    } catch {
      // the person closed the share sheet: nothing to do
    }
  }

  const btn = "btn btn-secondary h-11 px-4 text-sm";
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {canShare && (
          <button type="button" onClick={nativeShare} className="btn btn-primary h-11 px-5 text-sm">
            Share…
          </button>
        )}
        {links.map(([label, href]) => (
          <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={btn}>
            {label}
          </a>
        ))}
        <button type="button" onClick={copy} className={canShare ? btn : "btn btn-primary h-11 px-5 text-sm"}>
          {copied ? "Copied ✓" : "Copy link"}
        </button>
      </div>
      {note && (
        <p role="alert" className="mt-2 text-sm">
          {note}
        </p>
      )}
    </div>
  );
}
