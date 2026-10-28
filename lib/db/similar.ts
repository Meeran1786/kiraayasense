import "server-only";
import { prisma } from "@/lib/prisma";
import type { SimilarBusiness } from "@/lib/businessSubmission";

/** Published or pending listings in a pincode whose name looks like `name`. */
export async function findSimilarBusinesses(name: string, pincode: string): Promise<SimilarBusiness[]> {
  if (name.trim().length < 3 || !/^[1-9][0-9]{5}$/.test(pincode)) return [];
  return prisma.$queryRaw<SimilarBusiness[]>`
    SELECT p.id, p.name, l.name AS locality, c.name AS category
    FROM properties p
    JOIN localities l ON l.id = p."localityId"
    JOIN categories c ON c.id = p."categoryId"
    WHERE p.status IN ('APPROVED', 'PENDING_VERIFICATION')
      AND p.pincode = ${pincode}
      AND similarity(lower(p.name), lower(${name})) >= 0.4
    ORDER BY similarity(lower(p.name), lower(${name})) DESC
    LIMIT 5`;
}
