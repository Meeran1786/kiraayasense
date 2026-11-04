import { z } from "zod";

/** Public profile handles: /u/<handle>. Shared by the client form and the API. */

export const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{2,29}$/;

// Paths and words a handle must not impersonate.
const RESERVED = new Set(["admin", "api", "kiraaya", "kiraayasense", "moderator", "profile", "support", "team", "help"]);

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(HANDLE_PATTERN, "Use 3 to 30 lowercase letters, numbers or hyphens, starting with a letter or number")
  .refine((h) => !RESERVED.has(h), "That handle is reserved");

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2, "Name is too short").max(60),
  handle: handleSchema,
  city: z.string().trim().max(60).nullable().transform((c) => c || null),
  bio: z.string().trim().max(280, "Keep your bio under 280 characters").nullable().transform((b) => b || null),
  profileVisibility: z.enum(["PUBLIC", "PRIVATE"]),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/** A starting handle derived from an email or name, e.g. "ravi.k@x.com" -> "ravi-k". */
export function baseHandle(source: string): string {
  const base = source
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 24);
  return base.length >= 3 && !RESERVED.has(base) ? base : `user-${base}`.slice(0, 24).replace(/-$/, "");
}

export interface ReviewerLevel {
  name: string;
  next: { name: string; at: number } | null;
}

const LEVELS = [
  { name: "New reviewer", at: 0 },
  { name: "Reviewer", at: 1 },
  { name: "Regular reviewer", at: 5 },
  { name: "Trusted reviewer", at: 25 },
  { name: "Top reviewer", at: 100 },
];

export interface Badge {
  key: string;
  label: string;
  /** Short line shown on hover / under the badge. */
  hint: string;
  kind: "milestone" | "city";
}

const MILESTONES = [
  { at: 1, key: "first", label: "First verified review" },
  { at: 5, key: "five", label: "5 verified reviews" },
  { at: 25, key: "trusted", label: "Trusted reviewer" },
  { at: 100, key: "top", label: "Top reviewer" },
];

/**
 * Badges from verified reviews: milestones, plus one badge per city the
 * reviewer has verified reviews in (e.g. "Hyderabad 3"), most reviewed first.
 */
export function reviewerBadges(verifiedReviews: number, verifiedByCity: Map<string, number>): Badge[] {
  const badges: Badge[] = MILESTONES.filter((m) => verifiedReviews >= m.at).map((m) => ({
    key: m.key,
    label: m.label,
    hint: `${m.at} verified review${m.at === 1 ? "" : "s"}`,
    kind: "milestone",
  }));
  for (const [city, n] of Array.from(verifiedByCity.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    badges.push({ key: `city:${city}`, label: `${city} ${n}`, hint: `${n} verified review${n === 1 ? "" : "s"} in ${city}`, kind: "city" });
  }
  return badges;
}

/** Level from the number of approved reviews. */
export function reviewerLevel(approvedReviews: number): ReviewerLevel {
  let index = 0;
  LEVELS.forEach((l, i) => {
    if (approvedReviews >= l.at) index = i;
  });
  const next = LEVELS[index + 1];
  return { name: LEVELS[index].name, next: next ? { name: next.name, at: next.at } : null };
}
