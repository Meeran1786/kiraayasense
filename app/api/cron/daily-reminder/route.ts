import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runDailyPointReminder } from "@/lib/notify/reminder";

/**
 * POST /api/cron/daily-reminder — called at 7 PM IST by
 * deploy/daily-reminder.sh (cron, installed by deploy/deploy.sh) with
 * "Authorization: Bearer $CRON_SECRET".
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  const ok = secret.length >= 16 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const result = await runDailyPointReminder();
  return NextResponse.json({ ok: true, ...result });
}
