import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { RelationshipKey } from "@/lib/relationships";

/**
 * Category tree (prisma Category model). Active categories only; admins
 * manage the full tree, including inactive rows, from /admin/categories.
 */

export interface SubCategory {
  id: string;
  slug: string;
  name: string;
}

export interface CategoryNode extends SubCategory {
  relationships: RelationshipKey[];
  children: SubCategory[];
}

export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  const tops = await prisma.category.findMany({
    where: { parentId: null, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      children: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
    },
  });
  return tops.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    relationships: t.relationships as RelationshipKey[],
    children: t.children.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
  }));
});

/** The ids a category filter matches: the category itself plus its children. */
export async function categoryIdsForSlug(slug: string): Promise<string[]> {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: { children: { select: { id: true } } },
  });
  if (!category) return [];
  return [category.id, ...category.children.map((c) => c.id)];
}

/** Relationships a reviewer may pick for a business in this (sub-)category. */
export async function relationshipsForCategory(categoryId: string): Promise<RelationshipKey[]> {
  const category = await prisma.category.findUnique({ where: { id: categoryId }, include: { parent: true } });
  if (!category) return [];
  const top = category.parent ?? category;
  return top.relationships as RelationshipKey[];
}
