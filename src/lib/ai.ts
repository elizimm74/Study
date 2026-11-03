// One shared connection to Claude, used by every AI step.
import Anthropic from "@anthropic-ai/sdk";

// The SDK automatically reads ANTHROPIC_API_KEY from .env.local
// (Next.js loads that file for us). The key never appears in our code.
export const anthropic = new Anthropic();

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
