import "server-only";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

/**
 * Sitemaps for search engines. /sitemap.xml is an index pointing at
 * /sitemaps/static.xml (home, category and category-in-city pages, legal
 * pages, public profiles) and
 * /sitemaps/businesses-<n>.xml, each holding up to BUSINESSES_PER_FILE
 * published listings (Google allows 50,000 URLs per file).
 */
export const BUSINESSES_PER_FILE = 40_000;

export interface SitemapUrl {
  path: string;
  lastModified?: Date;
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function urlset(urls: SitemapUrl[]): string {
  const body = urls
    .map((u) => `<url><loc>${escape(SITE_URL + u.path)}</loc>${u.lastModified ? `<lastmod>${u.lastModified.toISOString()}</lastmod>` : ""}</url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function sitemapIndex(files: string[]): string {
  const body = files.map((f) => `<sitemap><loc>${escape(`${SITE_URL}/sitemaps/${f}`)}</loc></sitemap>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export async function sitemapFiles(): Promise<string[]> {
  const count = await prisma.property.count({ where: { status: "APPROVED" } });
  const pages = Math.max(1, Math.ceil(count / BUSINESSES_PER_FILE));
  return ["static.xml", ...Array.from({ length: pages }, (_, i) => `businesses-${i}.xml`)];
}

/** A category-in-a-city page needs this many listings to be worth listing. */
export const MIN_CITY_PAGE_LISTINGS = 3;

/**
 * Category pages (/search?category=…) and category-in-city pages
 * (/search?category=…&city=…) that have published listings. Empty ones are
 * left out: Google reports an empty results page as a soft 404, and the page
 * itself is noindex until something is listed (app/search/page.tsx).
 */
async function categoryUrls(): Promise<SitemapUrl[]> {
  const [categories, groups] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, parentId: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.property.groupBy({ by: ["categoryId", "district"], where: { status: "APPROVED" }, _count: { _all: true } }),
  ]);
  const byId = new Map(categories.map((c) => [c.id, c]));
  // slug -> district -> listings, counting a sub-category's listings for its parent too.
  const counts = new Map<string, Map<string, number>>();
  const add = (slug: string, district: string, n: number) => {
    const cities = counts.get(slug) ?? new Map<string, number>();
    cities.set(district, (cities.get(district) ?? 0) + n);
    counts.set(slug, cities);
  };
  for (const g of groups) {
    const c = byId.get(g.categoryId);
    if (!c) continue;
    add(c.slug, g.district, g._count._all);
    const parent = c.parentId ? byId.get(c.parentId) : undefined;
    if (parent) add(parent.slug, g.district, g._count._all);
  }
  const urls: SitemapUrl[] = [];
  for (const c of categories) {
    const cities = counts.get(c.slug);
    if (!cities) continue;
    const slug = encodeURIComponent(c.slug);
    urls.push({ path: `/search?category=${slug}` });
    for (const [district, n] of Array.from(cities.entries()).sort()) {
      if (n >= MIN_CITY_PAGE_LISTINGS) urls.push({ path: `/search?category=${slug}&city=${encodeURIComponent(district)}` });
    }
  }
  return urls;
}

export async function staticUrls(): Promise<SitemapUrl[]> {
  const [categories, profiles] = await Promise.all([
    categoryUrls(),
    // Only public profiles with at least one approved, named review are worth indexing.
    prisma.user.findMany({
      where: {
        status: "ACTIVE",
        profileVisibility: "PUBLIC",
        handle: { not: null },
        reviews: { some: { status: "APPROVED", isAnonymous: false } },
      },
      select: { handle: true, updatedAt: true },
    }),
  ]);
  return [
    { path: "/" },
    { path: "/search" },
    ...categories,
    { path: "/for-businesses" },
    { path: "/tutorials" },
    { path: "/privacy" },
    { path: "/terms" },
    ...profiles.map((p) => ({ path: `/u/${p.handle}`, lastModified: p.updatedAt })),
  ];
}

export async function businessUrls(page: number): Promise<SitemapUrl[]> {
  const rows = await prisma.property.findMany({
    where: { status: "APPROVED" },
    select: { id: true, updatedAt: true },
    orderBy: { createdAt: "asc" },
    skip: page * BUSINESSES_PER_FILE,
    take: BUSINESSES_PER_FILE,
  });
  return rows.map((r) => ({ path: `/property/${r.id}`, lastModified: r.updatedAt }));
}
