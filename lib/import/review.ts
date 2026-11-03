import "server-only";
import { prisma } from "@/lib/prisma";

export type BatchAction = "PUBLISH" | "REJECT";

/**
 * Publishes or rejects every listing an import batch created that is still
 * awaiting review. Listings a moderator already moved to another status are
 * left alone. Returns how many listings changed.
 */
export async function reviewImportBatch(jobId: string, action: BatchAction, actorUserId: string): Promise<number> {
  const created = await prisma.importRecord.findMany({
    where: { jobId, action: "CREATED", propertyId: { not: null } },
    select: { propertyId: true },
  });
  const { count } = await prisma.property.updateMany({
    where: { id: { in: created.map((r) => r.propertyId!) }, status: "PENDING_VERIFICATION" },
    data:
      action === "PUBLISH"
        ? { status: "APPROVED" }
        : { status: "REJECTED", rejectionReason: "Import batch rejected in review" },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId,
      action: action === "PUBLISH" ? "IMPORT_PUBLISHED" : "IMPORT_REJECTED",
      entityType: "ImportJob",
      entityId: jobId,
      metadata: { listings: count },
    },
  });
  return count;
}

/** Listings still awaiting review, per import batch. */
export async function pendingByJob(): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ jobId: string; n: number }[]>`
    SELECT r."jobId", count(*)::int AS n
    FROM import_records r JOIN properties p ON p.id = r."propertyId"
    WHERE r.action = 'CREATED' AND p.status = 'PENDING_VERIFICATION'
    GROUP BY r."jobId"`;
  return new Map(rows.map((r) => [r.jobId, r.n]));
}
