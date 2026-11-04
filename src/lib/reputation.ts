// Reputation check: what do real people say about this product online?
// (Research: ~72% of teens check reviews before buying.)
//
// Two calls, on purpose:
//  1. Sonnet + Anthropic's web search tool looks for reviews, Reddit threads,
//     app store ratings. Its answer is plain text.
//  2. Haiku turns that text into tidy JSON (strict JSON can't be combined
//     with search citations, so we split the job).
// The source links come straight from the search results, read by CODE,
// so they can't be made up.
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, HAIKU, SONNET } from "./ai";
import { costOfCall } from "./cost";
import type { CallCost, ProductProfile, Reputation } from "./types";

const MAX_SEARCHES = 3; // each search costs ~1 cent plus reading time

const ReputationSchema = z.object({
  found: z.boolean(),
  summary: z.string(),
  praise: z.array(z.string()),
  complaints: z.array(z.string()),
});

export async function checkReputation(
  url: string,
  profile: ProductProfile,
): Promise<{ reputation: Reputation | null; costs: CallCost[] }> {
  const costs: CallCost[] = [];
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content:
          `Find what real users say about the product at ${host} (${profile.whatItIs || "a web product"}). ` +
          `Search for independent reviews: Reddit, app store ratings, Trustpilot, Product Hunt, YouTube or blog reviews. ` +
          `Ignore the company's own marketing. Then report briefly: overall sentiment, the most common praise, the most ` +
          `common complaints. If you find nothing real (e.g. it's a brand-new product), say so plainly.`,
      },
    ];

    // The search can pause mid-way on long jobs ("pause_turn"); continue it.
    let response: Anthropic.Message | null = null;
    const allContent: Anthropic.ContentBlock[] = []; // every round's blocks
    let searches = 0;
    for (let round = 0; round < 3; round++) {
      response = await anthropic.messages.create({
        model: SONNET,
        max_tokens: 4000,
        output_config: { effort: "low" },
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: MAX_SEARCHES }],
        messages,
      });
      costs.push(costOfCall(`reputation search ${round + 1}`, response.model, response.usage));
      allContent.push(...response.content);
      searches += response.usage.server_tool_use?.web_search_requests ?? 0;
      if (response.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: response.content });
    }
    if (!response || response.stop_reason === "refusal") return { reputation: null, costs };

    // Web searches are billed separately: $10 per 1,000 searches.
    if (searches) {
      costs.push({ label: "reputation: web searches", model: "web_search", inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, usd: searches * 0.01 });
    }

    // Collect what Sonnet wrote, and the real source links from the results.
    const text = allContent
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    const sources: Reputation["sources"] = [];
    for (const block of allContent) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) {
          if (!sources.some((s) => s.url === r.url)) sources.push({ title: r.title, url: r.url });
        }
      }
    }
    if (!text) return { reputation: null, costs };

    // Step 2: Haiku tidies it into JSON.
    const tidy = await anthropic.messages.parse({
      model: HAIKU,
      max_tokens: 1500,
      output_config: { effort: "low", format: zodOutputFormat(ReputationSchema) },
      messages: [
        {
          role: "user",
          content:
            `Turn this research into JSON. found = false if no real user opinions were found.\n` +
            `summary: 1-2 sentences. praise / complaints: up to 4 short items each, only things actually reported.\n\n${text}`,
        },
      ],
    });
    costs.push(costOfCall("reputation tidy", tidy.model, tidy.usage));
    const r = tidy.parsed_output;
    if (!r) return { reputation: null, costs };
    return { reputation: { ...r, sources: sources.slice(0, 8) }, costs };
  } catch (err) {
    console.warn("[reputation] failed:", (err as Error).message);
    return { reputation: null, costs };
  }
}
