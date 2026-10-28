import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { businessSubmissionSchema, coordsFromMapsUrl } from "@/lib/businessSubmission";
import { findSimilarBusinesses } from "@/lib/db/similar";

const DAILY_LIMIT = 10;

/**
 * POST /api/businesses — a signed-in user adds a business we don't list.
 * It is created as PENDING_VERIFICATION and appears once a moderator
 * approves it at /admin/properties. Likely duplicates are returned (409)
 * unless the user confirms theirs is different.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in first" } }, { status: 401 });
  }
  const parsed = businessSubmissionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Check the form" } },
      { status: 422 }
    );
  }
  const input = parsed.data;

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category?.parentId || !category.isActive) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Pick a sub-category" } }, { status: 422 });
  }

  const today = await prisma.property.count({
    where: { submittedById: session.user.id, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
  });
  if (today >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: `You can add up to ${DAILY_LIMIT} businesses a day. Try again tomorrow.` } },
      { status: 429 }
    );
  }

  if (!input.confirmNotDuplicate) {
    const similar = await findSimilarBusinesses(input.name, input.pincode);
    if (similar.length) {
      return NextResponse.json(
        { error: { code: "POSSIBLE_DUPLICATE", message: "We may already list this business." }, similar },
        { status: 409 }
      );
    }
  }

  const locality = await prisma.locality.upsert({
    where: { name_district_pincode: { name: input.locality, district: input.district, pincode: input.pincode } },
    update: {},
    create: { name: input.locality, district: input.district, state: input.state, pincode: input.pincode },
  });

  const property = await prisma.property.create({
    data: {
      name: input.name,
      categoryId: category.id,
      status: "PENDING_VERIFICATION",
      source: "USER",
      doorNumber: input.doorNumber,
      street: input.street,
      localityId: locality.id,
      district: input.district,
      state: input.state,
      pincode: input.pincode,
      website: input.website,
      googleMapsUrl: input.googleMapsUrl,
      googlePlaceId: input.googlePlaceId,
      submittedById: session.user.id,
    },
    select: { id: true },
  });

  const coords = coordsFromMapsUrl(input.googleMapsUrl);
  if (coords) {
    await prisma.$executeRaw`
      UPDATE properties SET location = ST_SetSRID(ST_MakePoint(${coords.lon}, ${coords.lat}), 4326)::geography
      WHERE id = ${property.id}::uuid`;
  }

  return NextResponse.json({ property }, { status: 201 });
}
