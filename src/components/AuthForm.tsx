"use client";
// The sign-in / sign-up form: email + password, or "Continue with Google".
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AUTH_ENABLED } from "@/lib/supabase/config";

export default function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(params.get("error"));
  const [checkEmail, setCheckEmail] = useState(false);

  if (!AUTH_ENABLED) {
    return (
      <p className="card p-6 text-sm text-muted">
        Accounts aren&apos;t switched on yet. Add the Supabase keys to <code>.env.local</code> (see the README), then
        restart <code>npm run dev</code>.
      </p>
    );
  }

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = supabaseBrowser();
    const { data, error } =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callback() } })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMessage(friendly(error.message));
    // New accounts usually need to confirm their email first.
    if (mode === "signup" && !data.session) return setCheckEmail(true);
    router.push(next);
    router.refresh(); // update the header (signed in now)
  }

  async function google() {
    setMessage(null);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback() },
    });
    if (error) setMessage(friendly(error.message));
  }

  if (checkEmail) {
    return (
      <div className="card p-6">
        <p className="t-h3">Check your email</p>
        <p className="mt-1 text-sm text-muted">
          We sent a link to <b>{email}</b>. Click it to finish signing up.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={google}
        type="button"
        className="btn btn-ghost w-full"
      >
        <GoogleMark /> Continue with Google
      </button>
      <div className="t-label flex items-center gap-4">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <form onSubmit={submit} className="space-y-4">
        <label htmlFor="auth-email" className="sr-only">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          id="auth-email"
          placeholder="you@email.com"
          autoComplete="email"
          className="field"
        />
        <label htmlFor="auth-password" className="sr-only">
          Password
        </label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "Make a password (6+ characters)" : "Password"}
          id="auth-password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className="field"
        />
        {message && (
          <p role="alert" className="rounded-lg border border-line-strong bg-subtle p-4 text-sm">
            {message}
          </p>
        )}
        <button disabled={busy} className="btn btn-primary w-full">
          {busy ? "One sec…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
      <p className="text-sm text-muted">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href={`/signin?next=${encodeURIComponent(next)}`} className="font-medium text-fg underline underline-offset-2">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-medium text-fg underline underline-offset-2">
              Create a free account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

// Google's "G" in one color (follows the text color).
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.6 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.68 3.7 14.55 2.75 12 2.75 6.9 2.75 2.75 6.9 2.75 12S6.9 21.25 12 21.25c6.92 0 9.25-4.86 9.25-7.34 0-.5-.05-.88-.12-1.26z"
      />
    </svg>
  );
}

// Only allow going back to pages on OUR site (never a link to another website).
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
}

function friendly(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "That email and password don't match.";
  if (/email not confirmed/i.test(msg)) return "Please click the link in your email first.";
  if (/already registered/i.test(msg)) return "That email already has an account. Try signing in.";
  if (/provider is not enabled/i.test(msg)) return "Google sign-in isn't set up yet. Use email for now.";
  if (/rate limit/i.test(msg)) return "Too many tries. Wait a minute and try again.";
  return msg;
}
