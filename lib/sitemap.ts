import "server-only";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

/**
 * Sitemaps for search engines. /sitemap.xml is an index pointing at
 * /sitemaps/static.xml (home, categories, legal pages, public profiles) and
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

export async function staticUrls(): Promise<SitemapUrl[]> {
  const [categories, profiles] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true }, orderBy: { sortOrder: "asc" } }),
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
    ...categories.map((c) => ({ path: `/search?category=${encodeURIComponent(c.slug)}` })),
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
