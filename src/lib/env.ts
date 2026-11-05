// Checks the settings a program needs, and stops with a clear message if
// any are missing (better than a confusing crash halfway through a test).
const WORKER_NEEDS = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "ANTHROPIC_API_KEY", "CREDENTIALS_KEY"] as const;

export function checkWorkerEnv() {
  const missing = WORKER_NEEDS.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`The worker is missing these settings: ${missing.join(", ")}. See .env.example.`);
  }
  return {
    concurrency: Math.max(1, Number(process.env.WORKER_CONCURRENCY ?? 2)),
    pollMs: Math.max(500, Number(process.env.WORKER_POLL_MS ?? 2000)),
  };
}
