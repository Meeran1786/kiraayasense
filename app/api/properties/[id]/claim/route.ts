import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { claimSchema } from "@/lib/claims";

/**
 * POST /api/properties/:id/claim — an owner or manager asks to manage a
 * listing. A moderator calls the phone number and checks the proof at
 * /admin/claims before anything changes on the listing.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in first" } }, { status: 401 });
  }
  const parsed = claimSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Check the form" } },
      { status: 422 }
    );
  }

  const property = await prisma.property.findFirst({
    where: { id: params.id, status: "APPROVED" },
    select: { id: true, claimStatus: true, claimedByUserId: true },
  });
  if (!property) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Business not found" } }, { status: 404 });
  if (property.claimStatus === "VERIFIED") {
    const mine = property.claimedByUserId === session.user.id;
    return NextResponse.json(
      {
        error: {
          code: "ALREADY_CLAIMED",
          message: mine
            ? "You already manage this listing."
            : "This listing already has a verified owner. If that's wrong, write to the grievance officer.",
        },
      },
      { status: 409 }
    );
  }

  try {
    const claim = await prisma.businessClaim.create({
      data: { ...parsed.data, propertyId: property.id, userId: session.user.id },
      select: { id: true },
    });
    if (property.claimStatus === "UNCLAIMED") {
      await prisma.property.update({ where: { id: property.id }, data: { claimStatus: "PENDING_VERIFICATION" } });
    }
    return NextResponse.json({ claim }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "You already have a claim waiting for review on this listing." } },
        { status: 409 }
      );
    }
    throw err;
  }
}
