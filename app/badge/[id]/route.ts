import { getPropertyById } from "@/lib/db/properties";
import { EMBED_HEADERS, esc, ratingColour, textWidth } from "@/lib/embed";

/**
 * GET /badge/:id — an SVG rating badge any business can put on its website.
 * It always shows the real rating and review count; there is no way to
 * hide or style away a low score.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id.replace(/\.svg$/, "");
  const p = await getPropertyById(id);
  if (!p) return new Response("Not found", { status: 404 });

  const left = "KiraayaSense";
  const right =
    p.approvedReviewCount > 0
      ? `★ ${p.overallRating.toFixed(1)} · ${p.approvedReviewCount} review${p.approvedReviewCount === 1 ? "" : "s"}`
      : "Review us";
  const lw = textWidth(left) + 16;
  const rw = textWidth(right) + 16;
  const w = lw + rw;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="22" role="img" aria-label="${esc(`${left}: ${right} for ${p.name}`)}">
<title>${esc(`${p.name} on KiraayaSense: ${right}`)}</title>
<clipPath id="r"><rect width="${w}" height="22" rx="4"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="22" fill="#0b1020"/><rect x="${lw}" width="${rw}" height="22" fill="${ratingColour(p.approvedReviewCount ? p.overallRating : 0)}"/></g>
<g fill="#fff" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="11" font-weight="600">
<text x="8" y="15">${esc(left)}</text><text x="${lw + 8}" y="15">${esc(right)}</text></g></svg>`;

  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", ...EMBED_HEADERS } });
}
