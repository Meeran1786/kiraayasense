import { sitemapFiles, sitemapIndex } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(sitemapIndex(await sitemapFiles()), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
