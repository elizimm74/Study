// Supabase settings, read from .env.local.
// The URL and "publishable" key are designed to be public (they're sent to
// every visitor's browser). Security comes from Row Level Security in the
// database: each user can only read and change their own rows.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

// Without the keys, accounts are switched off and the app works like before
// (handy for local testing and for the benches).
export const AUTH_ENABLED = Boolean(SUPABASE_URL && SUPABASE_KEY);

// How many free tests each account gets (the Free plan: 1 x 100 personas).
export const FREE_TESTS = Number(process.env.FREE_TESTS_PER_ACCOUNT ?? 1);

// Emails that never hit the limit (you, for testing). Comma-separated.
export function isAdmin(email: string | undefined) {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return Boolean(email && admins.includes(email.toLowerCase()));
}
