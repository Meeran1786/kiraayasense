import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { ADMIN_ROLES } from "@/lib/auth";

/**
 * Gates every /admin/* route (pages and the /api/admin/* mutation routes)
 * behind a signed-in Google session whose DB-backed role is MODERATOR or
 * SUPER_ADMIN (FR-AUTH-4). Runs on the edge, so it reads the role straight
 * off the JWT (lib/auth.ts's jwt callback stamps it there on every session
 * refresh) rather than hitting Postgres from middleware.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The sign-in/role-explainer page itself must stay reachable, or an
  // unauthorized visitor redirected there would loop forever.
  if (pathname === "/admin/login") return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token?.role as string | undefined) ?? "";
  const authorized = !!token && (ADMIN_ROLES as readonly string[]).includes(role);

  if (!authorized) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 }
      );
    }
    // Behind nginx, req.url carries the internal address (localhost:3000), so
    // build the redirect from the public site URL instead.
    return NextResponse.redirect(new URL("/admin/login", process.env.NEXTAUTH_URL || req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
