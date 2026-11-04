import { prisma } from "@/lib/prisma";
import { getCategoryTree } from "@/lib/db/categories";
import { HOW_RATINGS_WORK } from "@/lib/geo";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * /llms.txt (https://llmstxt.org): a plain-markdown map of the site for AI
 * assistants and answer engines, so they know what KiraayaSense is, how its
 * ratings work and which URLs answer "best X in Y" questions.
 */
export const revalidate = 86400;

export async function GET() {
  const [tree, cities, listings, reviews] = await Promise.all([
    getCategoryTree(),
    prisma.property.groupBy({
      by: ["state", "district"],
      where: { status: "APPROVED" },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 80,
    }),
    prisma.property.count({ where: { status: "APPROVED" } }),
    prisma.review.count({ where: { status: "APPROVED" } }),
  ]);

  const q = (params: Record<string, string>) => `${SITE_URL}/search?${new URLSearchParams(params).toString()}`;
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_NAME} is an Indian review platform for local businesses, rentals and employers: PGs, flats, hostels, hotels, restaurants, cafes, shops, salons, gyms, hospitals, clinics, schools, coaching institutes, banks, IT companies and more. ${listings.toLocaleString("en-IN")} businesses are listed and ${reviews.toLocaleString("en-IN")} reviews have been published.`,
    "",
    HOW_RATINGS_WORK,
    "",
    "Each business page starts with a one-paragraph summary of its rating, how many reviews are verified with proof, and what reviewers rate highest and lowest. Business data from OpenStreetMap (ODbL), Overture Maps (CDLA-Permissive-2.0) and the MCA company register is credited on each page.",
    "",
    "## Find businesses",
    "",
    `- [Search all businesses](${SITE_URL}/search): filter by state, city, locality, category, rating and verified reviews`,
    `- Business pages: ${SITE_URL}/property/<id>`,
    `- Reviewer profiles: ${SITE_URL}/u/<handle>`,
    `- [Sitemap](${SITE_URL}/sitemap.xml)`,
    "",
    "## Categories",
    "",
    ...tree.map(
      (c) => `- [${c.name}](${q({ category: c.slug })}): ${c.children.map((s) => `[${s.name}](${q({ category: s.slug })})`).join(", ")}`
    ),
    "",
    "## Cities",
    "",
    "Add `&category=<slug>` to any city link to narrow it, for example PGs in a city.",
    "",
    ...cities
      .filter((c) => c.state && c.district)
      .map((c) => `- [${c.district}, ${c.state}](${q({ state: c.state, city: c.district })}): ${c._count._all.toLocaleString("en-IN")} businesses`),
    "",
    "## Policies",
    "",
    `- [Privacy policy](${SITE_URL}/privacy)`,
    `- [Terms of use](${SITE_URL}/terms)`,
    "",
  ];

  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
