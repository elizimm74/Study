"use client";
// The sign-in / sign-up form: email + password, or "Continue with Apple / Google".
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

  // New accounts go through the 3-question onboarding first (it then continues to `next`).
  const after = mode === "signup" ? `/onboarding?next=${encodeURIComponent(next)}` : next;
  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(after)}`;

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
    router.push(after);
    router.refresh(); // update the header (signed in now)
  }

  // "Continue with Google / Apple": Supabase sends the person to Google or Apple,
  // then back to /auth/callback, which finishes signing them in.
  async function oauth(provider: "google" | "apple") {
    setMessage(null);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider,
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
      {/* Apple's rules: a black button with the white Apple logo. */}
      <button onClick={() => oauth("apple")} type="button" className="btn w-full bg-[#000000] text-white hover:opacity-85">
        <AppleMark /> Continue with Apple
      </button>
      <button onClick={() => oauth("google")} type="button" className="btn btn-ghost w-full">
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

// Google's standard four-color "G" (Google's sign-in guidelines ask for this one).
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// Apple's logo, in the text color (white on the black button).
function AppleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.97-3.46-1.07-1.57-2.74-1.78-3.33-1.8-1.42-.14-2.77.83-3.49.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.78 2.29-1.61 2.8-.41 6.94 1.16 9.21.77 1.11 1.68 2.36 2.88 2.31 1.16-.05 1.59-.75 2.99-.75 1.4 0 1.79.75 3.01.72 1.24-.02 2.03-1.13 2.79-2.24.88-1.29 1.24-2.53 1.26-2.6-.03-.01-2.42-.93-2.45-3.72zM14.08 5.85c.64-.77 1.07-1.85.95-2.92-.92.04-2.03.61-2.69 1.38-.59.68-1.11 1.77-.97 2.82 1.02.08 2.07-.52 2.71-1.28z" />
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
  if (/provider is not enabled|unsupported provider/i.test(msg)) return "That sign-in option isn't switched on yet. Use email for now.";
  if (/rate limit/i.test(msg)) return "Too many tries. Wait a minute and try again.";
  return msg;
}
