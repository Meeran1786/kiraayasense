import { getPropertyById } from "@/lib/db/properties";
import { EMBED_HEADERS, esc, ratingColour } from "@/lib/embed";
import { SITE_URL } from "@/lib/site";

/**
 * GET /embed/:id — a small reviews widget for a business's own website,
 * loaded in an iframe. Shows the real rating, the top rated areas and the
 * latest reviews, newest first, whatever their score.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const p = await getPropertyById(params.id);
  if (!p) return new Response("Not found", { status: 404 });
  const theme = new URL(req.url).searchParams.get("theme") === "dark" ? "dark" : "light";
  const page = `${SITE_URL}/property/${p.id}`;
  const stars = (r: number) => "★★★★★".slice(0, Math.round(r)) + "☆☆☆☆☆".slice(0, 5 - Math.round(r));

  const metrics = p.metrics
    .slice(0, 3)
    .map(
      (m) => `<li><span>${esc(m.label)}</span><span class="bar"><i style="width:${(m.average / 5) * 100}%"></i></span><b>${m.average.toFixed(1)}</b></li>`
    )
    .join("");
  const reviews = p.reviews
    .slice(0, 3)
    .map((r) => {
      const text = r.reasons[0]?.text ?? "";
      return `<li><div class="meta">${r.overall !== null ? `<span class="s" style="color:${ratingColour(r.overall)}">${stars(r.overall)}</span>` : ""} ${esc(r.reviewer?.name ?? "Verified user")}${r.proofVerified ? ' · <span class="v">proof verified</span>' : ""} · ${esc(r.postedAgo)}</div><p>${esc(text.length > 160 ? `${text.slice(0, 157)}…` : text)}</p></li>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(p.name)} reviews — KiraayaSense</title>
<style>
:root{--bg:#fff;--fg:#0b1020;--muted:#5b6170;--line:#e4e6eb;--accent:#e5486b}
.dark{--bg:#0b1020;--fg:#f1f2f5;--muted:#a0a6b4;--line:#262c3d}
*{box-sizing:border-box}body{margin:0;font:13px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--fg)}
.w{padding:14px;border:1px solid var(--line);border-radius:12px}
.top{display:flex;align-items:center;gap:12px}.score{font-size:28px;font-weight:800}.top .s{font-size:16px}
.name{font-weight:700}.muted{color:var(--muted);font-size:12px}
ul{list-style:none;margin:10px 0 0;padding:0}
.m li{display:grid;grid-template-columns:1fr 70px 28px;gap:8px;align-items:center;font-size:12px;color:var(--muted);margin-top:4px}
.bar{height:5px;border-radius:3px;background:var(--line);overflow:hidden}.bar i{display:block;height:5px;background:var(--accent)}
.m b{color:var(--fg);text-align:right}
.r li{border-top:1px solid var(--line);padding-top:8px;margin-top:8px}.r p{margin:2px 0 0}.meta{font-size:11px;color:var(--muted)}.v{color:#22a06b}
a{color:inherit}.foot{display:flex;justify-content:space-between;margin-top:12px;font-size:12px}
.brand{font-weight:800}.brand span{color:var(--accent)}
</style></head><body class="${theme}"><div class="w">
<div class="top"><div class="score" style="color:${ratingColour(p.approvedReviewCount ? p.overallRating : 0)}">${p.approvedReviewCount ? p.overallRating.toFixed(1) : "–"}</div>
<div><div class="name">${esc(p.name)}</div><div class="muted">${p.approvedReviewCount ? `<span class="s" style="color:${ratingColour(p.overallRating)}">${stars(p.overallRating)}</span> ` : ""}${p.approvedReviewCount} review${p.approvedReviewCount === 1 ? "" : "s"}${p.verifiedProofCount ? `, ${p.verifiedProofCount} with proof` : ""}</div></div></div>
${metrics ? `<ul class="m">${metrics}</ul>` : ""}
${reviews ? `<ul class="r">${reviews}</ul>` : `<p class="muted">No reviews yet. Be the first.</p>`}
<div class="foot"><a href="${page}" target="_blank" rel="noopener">Read all reviews or write one →</a><a class="brand" href="${SITE_URL}" target="_blank" rel="noopener">Kiraaya<span>Sense</span></a></div>
</div></body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", ...EMBED_HEADERS } });
}
