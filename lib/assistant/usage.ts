import "server-only";
import { prisma } from "@/lib/prisma";
import { dailyBudgetMicroUsd, dailyQuestionLimit } from "./config";

/** Today's date in UTC, as the DATE the usage table is keyed on. */
function today() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export type Allowance =
  | { ok: true; remaining: number }
  | { ok: false; code: "DAILY_LIMIT" | "BUDGET_REACHED"; message: string };

/** Whether this user may ask another question today. */
export async function checkAllowance(userId: string): Promise<Allowance> {
  const day = today();
  const [mine, site] = await Promise.all([
    prisma.assistantUsage.findUnique({ where: { userId_day: { userId, day } }, select: { questions: true } }),
    prisma.assistantUsage.aggregate({ where: { day }, _sum: { costMicroUsd: true } }),
  ]);
  const limit = dailyQuestionLimit();
  const used = mine?.questions ?? 0;
  if (used >= limit) {
    return { ok: false, code: "DAILY_LIMIT", message: `You've used all ${limit} questions for today. Try again tomorrow.` };
  }
  if ((site._sum.costMicroUsd ?? 0) >= dailyBudgetMicroUsd()) {
    return { ok: false, code: "BUDGET_REACHED", message: "The assistant is resting for today. Please try again tomorrow." };
  }
  return { ok: true, remaining: limit - used };
}

/** Counts one answered question and what it cost. */
export async function recordUsage(userId: string, add: { inputTokens: number; outputTokens: number; costMicroUsd: number }) {
  const day = today();
  await prisma.assistantUsage.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, questions: 1, ...add },
    update: {
      questions: { increment: 1 },
      inputTokens: { increment: add.inputTokens },
      outputTokens: { increment: add.outputTokens },
      costMicroUsd: { increment: add.costMicroUsd },
    },
  });
}
