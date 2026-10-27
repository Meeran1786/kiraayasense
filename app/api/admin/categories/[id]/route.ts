import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { RELATIONSHIPS } from "@/lib/relationships";

// Slugs never change once created: they're in URLs and search links.
const patchSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  relationships: z.array(z.enum(RELATIONSHIPS)).min(1).optional(),
});

/** PATCH /api/admin/categories/:id — rename, hide/show, reorder, or change relationships. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", fieldErrors: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }

  const existing = await prisma.category.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Category not found" } }, { status: 404 });
  }
  if (parsed.data.relationships && existing.parentId) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Relationships are set on the top-level category" } },
      { status: 422 }
    );
  }

  const category = await prisma.category.update({ where: { id: params.id }, data: parsed.data });

  await prisma.auditLog.create({
    data: {
      actorUserId: auth.session.user.id,
      action: "CATEGORY_UPDATED",
      entityType: "Category",
      entityId: category.id,
      metadata: parsed.data,
    },
  });

  return NextResponse.json({ category });
}
