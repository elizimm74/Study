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
      <p className="rounded-2xl bg-white p-5 text-sm text-slate-600">
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
      <div className="rounded-2xl bg-white p-6 text-center">
        <p className="display text-3xl">Check your email</p>
        <p className="mt-2 text-sm text-slate-600">
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
        className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 font-semibold hover:border-slate-900"
      >
        <span className="text-lg">G</span> Continue with Google
      </button>
      <div className="meta flex items-center gap-3 text-slate-400">
        <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          autoComplete="email"
          className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 outline-none focus:border-slate-900"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "Make a password (6+ characters)" : "Password"}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 outline-none focus:border-slate-900"
        />
        {message && <p className="text-sm text-slate-900">⚠ {message}</p>}
        <button
          disabled={busy}
          className="display w-full rounded-full bg-indigo-600 px-6 py-4 text-xl text-white transition hover:bg-slate-900 disabled:opacity-50"
        >
          {busy ? "One sec…" : mode === "signup" ? "Create account ↗" : "Sign in ↗"}
        </button>
      </form>
      <p className="text-center text-sm text-slate-500">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href={`/signin?next=${encodeURIComponent(next)}`} className="font-semibold text-slate-900 underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-slate-900 underline">
              Create a free account
            </Link>
          </>
        )}
      </p>
    </div>
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
