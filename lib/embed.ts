import "server-only";

/** Escapes text for HTML and SVG output built from strings. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Rough text width for an 11px system font, good enough to size a badge. */
export function textWidth(s: string, px = 11): number {
  let w = 0;
  for (const ch of s) w += /[A-Z0-9★]/.test(ch) ? 0.66 : /[ il.,·|']/.test(ch) ? 0.3 : 0.55;
  return Math.ceil(w * px);
}

/** Star colour by rating, matching RatingBadge on the site. */
export function ratingColour(r: number): string {
  if (r >= 4) return "#22a06b";
  if (r >= 3) return "#e2a400";
  if (r > 0) return "#e5484d";
  return "#8a8f98";
}

/** Embeds are meant to be cached by browsers and nginx, and framed by any site. */
export const EMBED_HEADERS = {
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
  "Access-Control-Allow-Origin": "*",
};
