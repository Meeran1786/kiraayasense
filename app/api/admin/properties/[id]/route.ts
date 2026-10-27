import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Admin CMS: property listing edits (FR-ADMIN — "address change etc").
 * Deliberately does not expose location/PostGIS editing here (that needs a
 * geocoding step this environment has no API key for); everything else an
 * admin would reasonably fix — name, category, address fields, rent range,
 * status — is covered.
 */
const patchSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(["FLAT", "INDEPENDENT_HOUSE", "PG", "HOSTEL", "HOTEL_BUDGET", "HOTEL_LUXURY"]).optional(),
  status: z.enum(["PENDING_VERIFICATION", "APPROVED", "REJECTED", "MERGED", "UNPUBLISHED"]).optional(),
  doorNumber: z.string().min(1).optional(),
  street: z.string().min(1).optional(),
  district: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  pincode: z.string().min(1).optional(),
  approxRentMin: z.number().int().nonnegative().optional(),
  approxRentMax: z.number().int().nonnegative().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", fieldErrors: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }

  const property = await prisma.property.update({ where: { id: params.id }, data: parsed.data });

  await prisma.auditLog.create({
    data: {
      actorUserId: session!.user.id,
      action: "PROPERTY_UPDATED",
      entityType: "Property",
      entityId: property.id,
      metadata: parsed.data,
    },
  });

  return NextResponse.json({ property });
}
