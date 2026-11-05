import { z } from "zod";

/**
 * Review reports (FR-REV-8). Client-safe: used by the report dialog and by
 * POST /api/reviews/:id/flag.
 */

export const FLAG_REASONS = {
  NOT_GENUINE: "Not a real customer, tenant or employee",
  FALSE_CLAIMS: "False or defamatory claims",
  ABUSIVE: "Abusive, hateful or threatening",
  PERSONAL_INFO: "Shares someone's personal details",
  CONFLICT_OF_INTEREST: "Written by the owner, a competitor or someone paid",
  SPAM: "Spam, ad or off-topic",
} as const;

export type FlagReason = keyof typeof FLAG_REASONS;

/**
 * Reports from this many different people hide a review until a moderator
 * looks at it. Reports by the business's own manager still reach the
 * moderators but never count toward this, so an owner can't hide a review
 * by recruiting friends.
 */
export const AUTO_SUSPEND_REPORTS = 3;

export const flagSchema = z.object({
  reason: z.enum(Object.keys(FLAG_REASONS) as [FlagReason, ...FlagReason[]]),
  details: z
    .string()
    .trim()
    .max(1000, "Keep it under 1000 characters")
    .nullable()
    .default(null)
    .transform((d) => d || null),
});

export type FlagInput = z.infer<typeof flagSchema>;
