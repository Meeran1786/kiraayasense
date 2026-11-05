import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * Owner tools: a user manages a business once a moderator approves their
 * claim (Property.claimedByUserId + claimStatus VERIFIED). Managers can
 * reply to reviews; they can never edit, hide or delete a review.
 */

export const REPLY_MAX = 1000;

export const replySchema = z.object({
  text: z
    .string()
    .trim()
    .min(10, "Write at least 10 characters")
    .max(REPLY_MAX, `Keep your reply under ${REPLY_MAX} characters`),
});

/** True when the user is the verified manager of this business. */
export async function managesProperty(userId: string, propertyId: string): Promise<boolean> {
  const count = await prisma.property.count({
    where: { id: propertyId, claimedByUserId: userId, claimStatus: "VERIFIED" },
  });
  return count > 0;
}

export async function managedProperties(userId: string) {
  return prisma.property.findMany({
    where: { claimedByUserId: userId, claimStatus: "VERIFIED" },
    include: { locality: true, category: true },
    orderBy: { name: "asc" },
  });
}

/** Owner-reply state per review, for the owner's own view (includes pending and rejected). */
export async function repliesForProperty(propertyId: string) {
  const rows = await prisma.ownerResponse.findMany({
    where: { review: { propertyId } },
    select: { reviewId: true, text: true, status: true, rejectionReason: true, updatedAt: true },
  });
  return new Map(rows.map((r) => [r.reviewId, r]));
}
