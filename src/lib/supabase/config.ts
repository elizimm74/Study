// Supabase settings, read from .env.local.
// The URL and "publishable" key are designed to be public (they're sent to
// every visitor's browser). Security comes from Row Level Security in the
// database: each user can only read and change their own rows.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

// Without the keys, accounts are switched off and the app works like before
// (handy for local testing and for the benches).
export const AUTH_ENABLED = Boolean(SUPABASE_URL && SUPABASE_KEY);

// Plans and limits live in the database (profiles.plan, plan_test_limit()).
// Admins (profiles.is_admin = true) have no limit.
