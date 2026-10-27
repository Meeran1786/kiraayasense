import { z } from "zod";
import { RELATIONSHIPS, type RelationshipKey } from "@/lib/relationships";

/**
 * Review submission rules shared by the client form (UX only) and
 * POST /api/reviews (the source of truth). Questions are dynamic: the
 * schema below checks the shape, and checkAgainstQuestionSet() checks the
 * answers against the question set the reviewer was shown.
 */

export type QuestionType = "STAR" | "YES_NO" | "SINGLE_CHOICE" | "NUMBER";

export interface QuestionDTO {
  id: string;
  key: string;
  label: string;
  helpText: string | null;
  type: QuestionType;
  options: string[];
  required: boolean;
}

export interface QuestionSetDTO {
  id: string;
  title: string;
  relationship: RelationshipKey;
  isActive: boolean;
  proofRequired: boolean;
  mediaRequired: boolean;
  questions: QuestionDTO[];
}

export type AnswerValue = number | boolean | string;

export const MIN_REASONS = 3;
export const MIN_REASON_LENGTH = 20;

export const reasonSchema = z.object({
  id: z.string(), // client-generated key for list rendering, stripped before submit
  type: z.enum(["PRO", "CON"]),
  questionKey: z.string().min(1, "Pick what this reason is about"),
  text: z.string().min(MIN_REASON_LENGTH, `Add at least ${MIN_REASON_LENGTH} characters of detail`),
});

export const PROOF_TYPES = [
  "UPI_TRANSACTION",
  "RENT_RECEIPT",
  "BANK_STATEMENT",
  "INVOICE_RECEIPT",
  "OTHER_DOCUMENT",
] as const;
export type ProofType = (typeof PROOF_TYPES)[number];

export const PROOF_TYPE_LABELS: Record<ProofType, string> = {
  UPI_TRANSACTION: "UPI transaction screenshot",
  RENT_RECEIPT: "Signed rent receipt",
  BANK_STATEMENT: "Bank statement excerpt",
  INVOICE_RECEIPT: "Invoice, bill or booking receipt",
  OTHER_DOCUMENT: "Other document",
};

// Keys returned by /api/uploads/local; anything else was not uploaded here.
const UUID_FILE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const mediaKeySchema = z.string().regex(new RegExp(`^reviews/${UUID_FILE}\\.(jpg|png|mp4)$`), "Unrecognised upload");
const proofKeySchema = z.string().regex(new RegExp(`^proofs/${UUID_FILE}\\.(jpg|png|pdf)$`), "Unrecognised upload");

export const proofUploadSchema = z.object({
  proofType: z.enum(PROOF_TYPES),
  storageKey: proofKeySchema,
  consented: z.literal(true, {
    errorMap: () => ({ message: "Consent is required before a proof can be attached" }),
  }),
});

export const answerSchema = z.object({
  questionId: z.string().uuid(),
  value: z.union([z.number(), z.boolean(), z.string()]),
});

export const reviewSubmissionSchema = z.object({
  propertyId: z.string().uuid(),
  relationship: z.enum(RELATIONSHIPS),
  questionSetId: z.string().uuid(),
  isAnonymous: z.boolean().default(false),
  stayStartApprox: z.string().date().optional(),
  stayEndApprox: z.string().date().optional(),
  answers: z.array(answerSchema),
  reasons: z.array(reasonSchema.omit({ id: true })).min(MIN_REASONS, `Add at least ${MIN_REASONS} specific reasons`),
  mediaStorageKeys: z.array(mediaKeySchema).default([]),
  proofStorageKeys: z.array(proofUploadSchema).default([]),
});

export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;
export type ReasonDraft = z.infer<typeof reasonSchema>;

/**
 * Checks a structurally valid submission against the question set it
 * answers. Returns human-readable problems; an empty array means valid.
 */
export function checkAgainstQuestionSet(input: ReviewSubmissionInput, set: QuestionSetDTO): string[] {
  const problems: string[] = [];
  const byId = new Map(set.questions.map((q) => [q.id, q]));
  const answered = new Map<string, AnswerValue>();

  for (const answer of input.answers) {
    const question = byId.get(answer.questionId);
    if (!question) {
      problems.push("An answer doesn't belong to this question set — reload and try again.");
      continue;
    }
    const problem = checkAnswer(question, answer.value);
    if (problem) problems.push(problem);
    answered.set(question.id, answer.value);
  }

  for (const q of set.questions) {
    if (q.required && !answered.has(q.id)) problems.push(`Answer "${q.label}".`);
  }

  const starKeys = new Set(set.questions.filter((q) => q.type === "STAR").map((q) => q.key));
  if (input.reasons.some((r) => !starKeys.has(r.questionKey))) {
    problems.push("Each reason must be linked to one of the rated questions.");
  }

  if (set.mediaRequired && input.mediaStorageKeys.length === 0) {
    problems.push("Add at least one photo or video.");
  }
  if (set.proofRequired && input.proofStorageKeys.length === 0) {
    problems.push("Add at least one proof, and consent to its use.");
  }
  return problems;
}

function checkAnswer(q: QuestionDTO, value: AnswerValue): string | null {
  switch (q.type) {
    case "STAR":
      return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5
        ? null
        : `"${q.label}" needs a rating from 1 to 5.`;
    case "YES_NO":
      return typeof value === "boolean" ? null : `"${q.label}" needs a yes or no.`;
    case "SINGLE_CHOICE":
      return typeof value === "string" && q.options.includes(value) ? null : `Pick an option for "${q.label}".`;
    case "NUMBER":
      return typeof value === "number" && Number.isFinite(value) && value >= 0 ? null : `"${q.label}" needs a number.`;
  }
}
