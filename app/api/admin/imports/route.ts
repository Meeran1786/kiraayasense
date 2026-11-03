import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewImportBatch } from "@/lib/import/review";

const bulkSchema = z.object({
  action: z.enum(["PUBLISH", "REJECT"]),
  jobIds: z.array(z.string().uuid()).min(1).max(500),
});

/** POST /api/admin/imports — publish or reject several import batches at once. */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const parsed = bulkSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Pick at least one batch" } }, { status: 422 });
  }
  const jobs = await prisma.importJob.findMany({ where: { id: { in: parsed.data.jobIds } }, select: { id: true } });
  let updated = 0;
  for (const job of jobs) updated += await reviewImportBatch(job.id, parsed.data.action, session!.user.id);
  return NextResponse.json({ updated, batches: jobs.length });
}
