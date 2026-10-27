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
  categoryId: z.string().uuid().optional(),
  status: z.enum(["PENDING_VERIFICATION", "APPROVED", "REJECTED", "MERGED", "UNPUBLISHED"]).optional(),
  doorNumber: z.string().optional(),
  street: z.string().optional(),
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

  if (parsed.data.categoryId) {
    // Businesses always sit in a sub-category: that's what picks the questions.
    const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
    if (!category?.parentId) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Pick a sub-category, not a top-level category" } },
        { status: 422 }
      );
    }
  }

  const { doorNumber, street, ...rest } = parsed.data;
  const property = await prisma.property.update({
    where: { id: params.id },
    data: {
      ...rest,
      // An emptied address field is stored as null, not "".
      ...(doorNumber !== undefined ? { doorNumber: doorNumber.trim() || null } : {}),
      ...(street !== undefined ? { street: street.trim() || null } : {}),
    },
  });

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
