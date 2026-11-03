import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewImportBatch } from "@/lib/import/review";

const actionSchema = z.object({ action: z.enum(["PUBLISH", "REJECT"]) });

/** POST /api/admin/imports/:id — publish or reject one import batch (see reviewImportBatch). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Unknown action" } }, { status: 422 });
  }
  const job = await prisma.importJob.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Import not found" } }, { status: 404 });

  const count = await reviewImportBatch(job.id, parsed.data.action, session!.user.id);
  return NextResponse.json({ updated: count });
}
