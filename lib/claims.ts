import { z } from "zod";

/** Owner claims: shared by the claim form and POST /api/properties/:id/claim. */

export const CLAIMANT_ROLES = ["Owner", "Manager", "Authorised employee"] as const;

const UUID_FILE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export const claimSchema = z.object({
  claimantRole: z.enum(CLAIMANT_ROLES),
  contactPhone: z
    .string()
    .transform((p) => p.replace(/[\s-]/g, ""))
    .refine((p) => /^(\+91)?[6-9]\d{9}$/.test(p), "Enter a 10-digit Indian mobile number"),
  workEmail: z
    .string()
    .trim()
    .email("Enter a valid email")
    .nullable()
    .or(z.literal("").transform(() => null)),
  proofStorageKey: z
    .string()
    .regex(new RegExp(`^proofs/${UUID_FILE}\\.(jpg|png|pdf)$`), "Unrecognised upload")
    .nullable(),
  message: z.string().trim().max(1000, "Keep the message under 1000 characters").nullable(),
});

export type ClaimInput = z.infer<typeof claimSchema>;
