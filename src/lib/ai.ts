// One shared connection to Claude, used by every AI step.
import Anthropic from "@anthropic-ai/sdk";

// The key comes from ANTHROPIC_API_KEY (.env.local on a Mac, Variables on Railway / Vercel).
// The key never appears in our code. Pasting into a settings box easily adds a space, a line break,
// quote marks or even "ANTHROPIC_API_KEY=" in front, and Anthropic then answers "invalid x-api-key",
// so we tidy those away first.
export function cleanApiKey(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  let k = raw.trim().replace(/^ANTHROPIC_API_KEY\s*=\s*/i, "").trim();
  k = k.replace(/^["'`]+|["'`]+$/g, "").replace(/\s+/g, "");
  return k || undefined;
}
const KEY = cleanApiKey(process.env.ANTHROPIC_API_KEY);
if (KEY) process.env.ANTHROPIC_API_KEY = KEY;
export const anthropic = new Anthropic({ apiKey: KEY ?? null });

// A SAFE hint of which key is loaded (never the key itself): "sk-ant-api03-…AbCd (108 chars)".
// The Anthropic Console shows the same start and last characters, so the founder can compare.
export function apiKeyHint(): string {
  if (!KEY) return "missing";
  const looksRight = KEY.startsWith("sk-ant-");
  return `${KEY.slice(0, 12)}…${KEY.slice(-4)} (${KEY.length} chars${looksRight ? "" : ", does NOT start with sk-ant- (wrong value?)"})`;
}

export const HAIKU = "claude-haiku-5-5"; // cheap + fast: persona reviews, audience guess
export const SONNET = "claude-sonnet-5-5"; // smarter: only the final report

// Friendly error when the key hasn't been set up yet.
export function requireApiKey() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "No Anthropic API key yet. Add ANTHROPIC_API_KEY=... to a file called .env.local and restart `npm run dev`.",
    );
  }
}

// The model can occasionally decline a request (stop_reason "refusal").
// We turn that into a clear error instead of silently using empty output.
export function assertNotRefused(stopReason: string | null, label: string) {
  if (stopReason === "refusal") {
    throw new Error(`Claude declined the "${label}" request.`);
  }
  if (stopReason === "max_tokens") {
    throw new Error(`The "${label}" answer was cut off (hit max_tokens).`);
  }
}
