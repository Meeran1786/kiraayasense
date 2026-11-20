import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { claimDailyOpen } from "@/lib/rewards";

/**
 * POST /api/me/daily-open → { awarded, points, day }
 * Called by components/rewards/DailyPoint.tsx when a signed-in person opens
 * the app. Earns POINTS.DAILY_OPEN once per IST day; later calls that day
 * return awarded: false.
 */
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in first" } }, { status: 401 });
  }
  return NextResponse.json(await claimDailyOpen(userId));
}
