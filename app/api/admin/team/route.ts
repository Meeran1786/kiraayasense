import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { sendEmail } from "@/lib/notify/email";

/**
 * POST /api/admin/team { email, role } — super admins only (middleware.ts).
 * An existing account gets the role at once; otherwise an invite is stored and
 * applied on that person's first Google sign-in (lib/auth.ts). Either way they
 * get an email when email is set up.
 */
const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(["SUPER_ADMIN", "MODERATOR"]),
});

const ROLE_NAME = { SUPER_ADMIN: "super admin", MODERATOR: "moderator" } as const;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actorId = session!.user.id;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.issues[0].message } }, { status: 422 });
  }
  const { email, role } = parsed.data;

  const user = await prisma.user.findFirst({ where: { primaryEmail: { equals: email, mode: "insensitive" } } });
  let outcome: "UPDATED" | "INVITED";
  if (user) {
    if (user.id === actorId) {
      return NextResponse.json({ error: { code: "CONFLICT", message: "You can't change your own role" } }, { status: 409 });
    }
    await prisma.user.update({ where: { id: user.id }, data: { role } });
    await prisma.auditLog.create({
      data: { actorUserId: actorId, action: "ROLE_CHANGED", entityType: "User", entityId: user.id, metadata: { from: user.role, to: role } },
    });
    outcome = "UPDATED";
  } else {
    const invite = await prisma.adminInvite.upsert({
      where: { email },
      update: { role, invitedById: actorId, acceptedAt: null },
      create: { email, role, invitedById: actorId },
    });
    await prisma.auditLog.create({
      data: { actorUserId: actorId, action: "ADMIN_INVITED", entityType: "AdminInvite", entityId: invite.id, metadata: { email, role } },
    });
    outcome = "INVITED";
  }

  const emailed = await sendEmail(
    email,
    `You're now a KiraayaSense ${ROLE_NAME[role]}`,
    `${session!.user.name ?? "An admin"} added you to the KiraayaSense team as a ${ROLE_NAME[role]}.\n` +
      `Sign in with Google using this email address (${email}), then open the admin.`,
    `${SITE_URL}/admin`
  );

  return NextResponse.json({ ok: true, outcome, emailed }, { status: 201 });
}
