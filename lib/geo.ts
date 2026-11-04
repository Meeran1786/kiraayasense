import type { DbProperty } from "@/lib/db/properties";

/**
 * Plain-language summaries for GEO (generative engine optimisation): AI
 * answer engines quote short factual sentences, so every business page and
 * filtered list leads with one built from its own data. No marketing words,
 * nothing that isn't in the reviews.
 */

// Lower-cases a label for mid-sentence use, but leaves acronyms ("PG", "IT services") alone.
const lower = (s: string) => (/^[A-Z][A-Z]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const article = (word: string) => (/^[aeiou]/i.test(word) || /^(FM|HD|MRO|NBFC|OEM|RTO)\b/.test(word) ? "an" : "a");
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function propertySummary(p: DbProperty): string {
  const kind = p.parentCategoryName ? `${lower(p.categoryName)} (${lower(p.parentCategoryName)})` : lower(p.categoryName);
  const where = [p.locality, p.district, p.state].filter((x, i, a) => x && a.indexOf(x) === i).join(", ");
  const intro = `${p.name} is ${article(kind)} ${kind} in ${where}.`;
  if (p.approvedReviewCount === 0) {
    return `${intro} It has no reviews on KiraayaSense yet.`;
  }

  const verified =
    p.verifiedProofCount > 0
      ? `, ${p.verifiedProofCount === p.approvedReviewCount ? (p.approvedReviewCount === 1 ? "verified" : "all verified") : `${p.verifiedProofCount} verified`} with a bill or payment proof`
      : "";
  let text = `${intro} It is rated ${p.overallRating.toFixed(1)} out of 5 on KiraayaSense from ${plural(p.approvedReviewCount, "reviewer")}${verified}.`;

  const rated = [...p.metrics].sort((a, b) => b.average - a.average);
  if (rated.length >= 2 && rated[0].average > rated[rated.length - 1].average) {
    const best = rated[0];
    const worst = rated[rated.length - 1];
    text += ` Reviewers rate it highest for ${lower(best.label)} (${best.average.toFixed(1)}) and lowest for ${lower(worst.label)} (${worst.average.toFixed(1)}).`;
  }
  if (p.isHousing && p.approxRentMin !== null && p.approxRentMax !== null) {
    text += ` Reviewers report rent of ₹${p.approxRentMin.toLocaleString("en-IN")}–₹${p.approxRentMax.toLocaleString("en-IN")} a month.`;
  }
  return text;
}

/** Up to `n` best-rated listings that actually have reviews. */
export function topRated(results: DbProperty[], n = 3): DbProperty[] {
  return results
    .filter((p) => p.approvedReviewCount > 0)
    .sort((a, b) => b.overallRating - a.overallRating || b.approvedReviewCount - a.approvedReviewCount)
    .slice(0, n);
}

export const HOW_RATINGS_WORK =
  "Ratings on KiraayaSense come only from signed-in reviewers who answer questions specific to the type of business. " +
  "Each reviewer's latest visit counts once, and reviews backed by a bill, invoice or UPI payment are marked as verified. " +
  "Points for reviewers never depend on the rating they give.";
