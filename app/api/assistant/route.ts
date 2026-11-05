import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { isLocale } from "@/lib/i18n/locales";
import { assistantEnabled } from "@/lib/assistant/config";
import { askAssistant } from "@/lib/assistant/run";
import { checkAllowance, recordUsage } from "@/lib/assistant/usage";

// Each answer can take several model calls.
export const maxDuration = 120;

const body = z.object({
  // The visible chat, oldest first, ending with the new question. Only the
  // last 12 turns are kept, which bounds what one question can cost.
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(40),
  locale: z.string().optional(),
  propertyId: z
    .string()
    .regex(/^[0-9a-f-]{36}$/i)
    .nullish(),
});

// One question at a time per user, so parallel requests can't run past the daily limit.
const inFlight = new Set<string>();

function error(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** POST { messages, locale, propertyId? } → { reply, remaining } */
export async function POST(req: NextRequest) {
  if (!assistantEnabled()) return error(503, "NOT_CONFIGURED", "The assistant is not available yet.");

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return error(401, "UNAUTHENTICATED", "Sign in to ask the assistant.");

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(400, "BAD_REQUEST", "Invalid question.");
  let history = parsed.data.messages.slice(-12);
  // The API needs the conversation to start with the user.
  while (history.length && history[0].role !== "user") history = history.slice(1);
  if (!history.length || history[history.length - 1].role !== "user") return error(400, "BAD_REQUEST", "Invalid question.");
  if (history[history.length - 1].text.length > 1000) return error(400, "TOO_LONG", "Please keep your question under 1,000 characters.");

  if (inFlight.has(userId)) return error(429, "BUSY", "Please wait for the current answer.");
  inFlight.add(userId);
  try {
    const allowance = await checkAllowance(userId);
    if (!allowance.ok) return error(429, allowance.code, allowance.message);

    const locale = isLocale(parsed.data.locale) ? parsed.data.locale : "en";
    const answer = await askAssistant(history, locale, parsed.data.propertyId ?? null);
    await recordUsage(userId, { inputTokens: answer.inputTokens, outputTokens: answer.outputTokens, costMicroUsd: answer.costMicroUsd });
    return NextResponse.json({ reply: answer.text, remaining: allowance.remaining - 1 });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return error(503, "BUSY", "The assistant is busy. Please try again in a minute.");
    if (err instanceof Anthropic.APIError) console.error("[assistant] API", err.status, err.message);
    else console.error("[assistant]", err);
    return error(502, "FAILED", "Something went wrong. Please try again.");
  } finally {
    inFlight.delete(userId);
  }
}
