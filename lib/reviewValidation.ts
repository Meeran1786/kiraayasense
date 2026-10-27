import { z } from "zod";

/**
 * Mirrors the server-side zod schema behind POST /api/reviews
 * (see docs/API_CONTRACT.md §4). Client-side validation here is UX only —
 * the API re-validates every one of these rules independently and is the
 * actual source of truth.
 */

export const GRIEVANCE_CATEGORIES = [
  { key: "VALUE_FOR_MONEY", label: "Value for money / rent escalation" },
  { key: "LOCALITY_SAFETY", label: "Locality & approach-road safety" },
  { key: "OWNER_RESPONSIVENESS", label: "Owner/caretaker responsiveness" },
  { key: "HYGIENE_CLEANLINESS", label: "Hygiene, cleanliness & waste" },
  { key: "WATER_SUPPLY", label: "Water supply & sewerage infra" },
  { key: "ELECTRICITY_BACKUP", label: "Electricity uptime & backup" },
  { key: "AMENITIES_LIFT", label: "Elevator/lift & common amenities" },
] as const;

export type GrievanceCategoryKey = (typeof GRIEVANCE_CATEGORIES)[number]["key"];

export const MIN_REASONS = 3;
export const MIN_REASON_LENGTH = 20;

export const reasonSchema = z.object({
  id: z.string(), // client-generated key for list rendering, stripped before submit
  type: z.enum(["PRO", "CON"]),
  category: z.enum(
    GRIEVANCE_CATEGORIES.map((c) => c.key) as [GrievanceCategoryKey, ...GrievanceCategoryKey[]]
  ),
  text: z.string().min(MIN_REASON_LENGTH, `Add at least ${MIN_REASON_LENGTH} characters of detail`),
});

export const categoryScoreSchema = z.object({
  category: z.enum(
    GRIEVANCE_CATEGORIES.map((c) => c.key) as [GrievanceCategoryKey, ...GrievanceCategoryKey[]]
  ),
  score: z.number().int().min(1).max(5),
});

export const PROOF_TYPES = ["UPI_TRANSACTION", "RENT_RECEIPT", "BANK_STATEMENT"] as const;
export type ProofType = (typeof PROOF_TYPES)[number];

export const proofUploadSchema = z.object({
  proofType: z.enum(PROOF_TYPES),
  storageKey: z.string(),
  consented: z.literal(true, {
    errorMap: () => ({ message: "Consent is required before a payment proof can be attached" }),
  }),
});

export const reviewSubmissionSchema = z.object({
  propertyId: z.string().uuid(),
  stayStartApprox: z.string().date().optional(),
  stayEndApprox: z.string().date().optional(),
  categoryScores: z.array(categoryScoreSchema).length(GRIEVANCE_CATEGORIES.length),
  reasons: z.array(reasonSchema).min(MIN_REASONS, `Add at least ${MIN_REASONS} specific reasons`),
  mediaStorageKeys: z.array(z.string()).min(1, "Add at least one photo or video"),
  proofStorageKeys: z.array(proofUploadSchema).min(1, "Add at least one payment proof"),
});

export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;
export type ReasonDraft = z.infer<typeof reasonSchema>;
export type CategoryScoreDraft = z.infer<typeof categoryScoreSchema>;
