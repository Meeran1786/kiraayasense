import { businessUrls, staticUrls, urlset } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { name: string } }) {
  let urls;
  if (params.name === "static.xml") {
    urls = await staticUrls();
  } else {
    const match = /^businesses-(\d{1,4})\.xml$/.exec(params.name);
    if (!match) return new Response("Not found", { status: 404 });
    urls = await businessUrls(Number(match[1]));
    if (!urls.length) return new Response("Not found", { status: 404 });
  }
  return new Response(urlset(urls), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
