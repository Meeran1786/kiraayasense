import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runDailyAlerts } from "@/lib/notify/daily";

/**
 * POST /api/cron/daily-alerts — called at 9 AM IST by deploy/daily-alerts.sh
 * (cron, installed by deploy/deploy.sh) with "Authorization: Bearer
 * $CRON_SECRET". deploy.sh writes a random CRON_SECRET into .env if missing.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  const ok = secret.length >= 16 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const result = await runDailyAlerts();
  return NextResponse.json({ ok: true, ...result });
}
