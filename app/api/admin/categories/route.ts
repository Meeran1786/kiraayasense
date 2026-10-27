import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { RELATIONSHIPS } from "@/lib/relationships";

const createSchema = z.object({
  name: z.string().trim().min(2).max(60),
  parentId: z.string().uuid().nullable().default(null),
  relationships: z.array(z.enum(RELATIONSHIPS)).default([]),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** POST /api/admin/categories — add a top-level category or a sub-category. */
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", fieldErrors: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }
  const { name, parentId, relationships } = parsed.data;

  let baseSlug = slugify(name);
  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (!parent || parent.parentId) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Sub-categories go under a top-level category" } },
        { status: 422 }
      );
    }
    baseSlug = `${parent.slug}-${baseSlug}`;
  } else if (relationships.length === 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Pick at least one reviewer relationship" } },
      { status: 422 }
    );
  }

  let slug = baseSlug;
  for (let n = 2; await prisma.category.findUnique({ where: { slug } }); n++) slug = `${baseSlug}-${n}`;

  const siblings = await prisma.category.count({ where: { parentId } });
  const category = await prisma.category.create({
    data: { name, slug, parentId, sortOrder: siblings, relationships: parentId ? [] : relationships },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: auth.session.user.id,
      action: "CATEGORY_CREATED",
      entityType: "Category",
      entityId: category.id,
      metadata: { name, slug, parentId },
    },
  });

  return NextResponse.json({ category }, { status: 201 });
}
