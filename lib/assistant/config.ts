/**
 * Settings for Ask KiraayaSense, the AI assistant. Everything is read from
 * the environment so the model and the spending limits can be changed in
 * .env and a `pm2 reload`, without a code change.
 *
 *   ANTHROPIC_API_KEY             required; the assistant is hidden without it
 *   ASSISTANT_MODEL               default claude-haiku-5-5 (or claude-sonnet-5-5, claude-opus-5-5)
 *   ASSISTANT_DAILY_QUESTIONS     per signed-in user per day (UTC), default 20
 *   ASSISTANT_DAILY_BUDGET_USD    whole site per day (UTC), default 5
 *
 * The root layout calls assistantEnabled() on the server; the key itself is
 * only read by the Anthropic client in lib/assistant/run.ts.
 */

export const DEFAULT_MODEL = "claude-haiku-5-5";

/** US dollars per million tokens, from Anthropic's price list (Nov 2026). */
const PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  // The server-side fallback model, when Sonnet or Opus declines a request.
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
};
// Unknown models are costed at Opus rates so the budget errs on the safe side.
const FALLBACK_PRICE = { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 };

function intEnv(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function assistantEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function assistantModel() {
  return process.env.ASSISTANT_MODEL?.trim() || DEFAULT_MODEL;
}

export function dailyQuestionLimit() {
  return Math.floor(intEnv("ASSISTANT_DAILY_QUESTIONS", 20));
}

export function dailyBudgetMicroUsd() {
  return Math.round(intEnv("ASSISTANT_DAILY_BUDGET_USD", 5) * 1_000_000);
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/** Estimated cost of one API response, in millionths of a dollar. */
export function costMicroUsd(model: string, usage: TokenUsage) {
  const p = PRICES[model] ?? FALLBACK_PRICE;
  // $ per million tokens × tokens = micro-dollars.
  return Math.ceil(
    usage.input_tokens * p.input +
      usage.output_tokens * p.output +
      (usage.cache_read_input_tokens ?? 0) * p.cacheRead +
      (usage.cache_creation_input_tokens ?? 0) * p.cacheWrite
  );
}

/** Server-side refusal fallback ("default" routing) is offered for these models only. */
export function supportsServerFallback(model: string) {
  return /^claude-(opus-5|sonnet-5-5|fable-5)/.test(model);
}
