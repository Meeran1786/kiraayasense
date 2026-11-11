import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH  /api/admin/team/<userId> { role }   change a member's role (USER = remove)
 * DELETE /api/admin/team/<inviteId>?invite=1 withdraw a pending invite
 * Super admins only (middleware.ts). Nobody can change their own role, and
 * the last super admin can't be demoted.
 */
const schema = z.object({ role: z.enum(["SUPER_ADMIN", "MODERATOR", "USER"]) });
const err = (status: number, message: string) => NextResponse.json({ error: { code: "CONFLICT", message } }, { status });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const actorId = session!.user.id;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(422, "Pick a role");
  if (params.id === actorId) return err(409, "You can't change your own role");

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return err(404, "Member not found");
  const role = parsed.data.role;
  if (user.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
    const supers = await prisma.user.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE" } });
    if (supers <= 1) return err(409, "Keep at least one super admin");
  }
  await prisma.user.update({ where: { id: user.id }, data: { role } });
  await prisma.auditLog.create({
    data: {
      actorUserId: actorId,
      action: role === "USER" ? "ADMIN_REMOVED" : "ROLE_CHANGED",
      entityType: "User",
      entityId: user.id,
      metadata: { from: user.role, to: role },
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!req.nextUrl.searchParams.get("invite")) return err(400, "Use PATCH with role USER to remove a member");
  const invite = await prisma.adminInvite.findUnique({ where: { id: params.id } });
  if (!invite) return err(404, "Invite not found");
  await prisma.adminInvite.delete({ where: { id: invite.id } });
  await prisma.auditLog.create({
    data: { actorUserId: session!.user.id, action: "ADMIN_INVITE_WITHDRAWN", entityType: "AdminInvite", entityId: invite.id, metadata: { email: invite.email } },
  });
  return NextResponse.json({ ok: true });
}
