import "server-only";
import { getServerSession, type Session } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

/**
 * middleware.ts already limits /api/admin/* to MODERATOR and SUPER_ADMIN.
 * Platform configuration (categories, question sets) is SUPER_ADMIN only
 * (FR-AUTH-4); call this at the top of those routes.
 */
export async function requireSuperAdmin(): Promise<{ session: Session } | { response: NextResponse }> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return {
      response: NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only a super admin can change this" } },
        { status: 403 }
      ),
    };
  }
  return { session };
}
