import { prisma } from "@/lib/prisma";
import type { RelationshipKey } from "@/lib/relationships";
import { CategoryManager, type AdminCategory } from "./CategoryManager";

export default async function AdminCategoriesPage() {
  const tops = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      children: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { properties: true } } },
      },
      _count: { select: { properties: true } },
    },
  });

  const categories: AdminCategory[] = tops.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    isActive: t.isActive,
    relationships: t.relationships as RelationshipKey[],
    businessCount: t._count.properties + t.children.reduce((n, c) => n + c._count.properties, 0),
    children: t.children.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      isActive: c.isActive,
      relationships: [],
      businessCount: c._count.properties,
      children: [],
    })),
  }));

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--ks-text)]">Categories</h1>
      <p className="mt-1 text-sm text-[var(--ks-text-muted)]">
        Add, rename or hide categories and sub-categories, and choose who can review businesses in each. Hidden
        categories disappear from menus and search filters; their businesses stay reachable by link. Only a super
        admin can save changes.
      </p>
      <div className="mt-6">
        <CategoryManager categories={categories} />
      </div>
    </div>
  );
}
