// Turns "how many tokens did this AI call use" into dollars.
// Tokens are chunks of text (~4 characters each). Every API response tells
// us exactly how many it used, so the cost we print is real, not a guess.

import type { CallCost } from "./types";

// The token counts every API response includes.
type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

// Dollars per 1 MILLION tokens (Anthropic list prices, Nov 2026).
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 }, // only used if a request falls back
};

// Prompt caching: re-sending the exact same page content is much cheaper.
// Writing to the cache costs a bit more (1.25x), reading from it costs 0.1x.
const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.1;

export function costOfCall(
  label: string,
  model: string,
  usage: Usage,
): CallCost {
  const price = PRICES[model];
  if (!price) console.warn(`[cost] No price on file for model "${model}"`);
  const p = price ?? { input: 0, output: 0 };

  const inputTokens = usage.input_tokens;
  const outputTokens = usage.output_tokens;
  const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;

  const usd =
    (inputTokens * p.input +
      outputTokens * p.output +
      cacheWriteTokens * p.input * CACHE_WRITE_MULTIPLIER +
      cacheReadTokens * p.input * CACHE_READ_MULTIPLIER) /
    1_000_000;

  return { label, model, inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens, usd };
}

// Prints a readable breakdown to the terminal where `npm run dev` is running.
export function logRunCost(runId: string, calls: CallCost[]) {
  const total = calls.reduce((sum, c) => sum + c.usd, 0);
  const byModel = new Map<string, number>();
  for (const c of calls) byModel.set(c.model, (byModel.get(c.model) ?? 0) + c.usd);

  console.log(`\n=== Cost for run ${runId} ===`);
  for (const c of calls) {
    console.log(
      `  ${c.label.padEnd(22)} ${c.model.padEnd(18)} in ${c.inputTokens} / out ${c.outputTokens}` +
        ` / cache w ${c.cacheWriteTokens} r ${c.cacheReadTokens}  $${c.usd.toFixed(4)}`,
    );
  }
  const parts = [...byModel].map(([m, usd]) => `${m} $${usd.toFixed(4)}`).join(", ");
  console.log(`  TOTAL: $${total.toFixed(4)}  (${parts})\n`);
  return total;
}
