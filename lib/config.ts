import { env } from "cloudflare:workers";
import type { RuntimeConfig } from "./research";
function bounded(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? Math.floor(n) : fallback;
}
export function runtimeConfig(): RuntimeConfig {
  return {
    mode: env.RESEARCH_MODE === "openai" ? "openai" : "docs",
    maxPages: bounded(env.RESEARCH_MAX_PAGES, 8, 3, 12),
    apiKey: env.OPENAI_API_KEY || undefined,
    model: env.OPENAI_MODEL || "gpt-6-astra",
    timeoutMs: bounded(env.RESEARCH_TIMEOUT_MS, 45000, 5000, 60000),
    maxSearchCalls: bounded(env.RESEARCH_MAX_SEARCH_CALLS, 8, 2, 12),
    maxSources: bounded(env.RESEARCH_MAX_SOURCES, 12, 2, 20),
    maxOutputTokens: bounded(env.RESEARCH_MAX_OUTPUT_TOKENS, 9000, 2000, 14000),
  };
}
