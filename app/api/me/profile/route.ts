import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/handles";

/** PATCH /api/me/profile: the signed-in reviewer edits their own profile. */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in first" } }, { status: 401 });
  }

  const parsed = profileUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid profile" } },
      { status: 400 }
    );
  }

  const clash = await prisma.user.findFirst({
    where: { handle: parsed.data.handle, NOT: { id: session.user.id } },
    select: { id: true },
  });
  if (clash) {
    return NextResponse.json({ error: { code: "HANDLE_TAKEN", message: "That handle is taken" } }, { status: 409 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: { handle: true, displayName: true, city: true, bio: true, profileVisibility: true },
  });
  return NextResponse.json({ profile: user });
}
