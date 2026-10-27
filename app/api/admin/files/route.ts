import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/files?key=proofs/<file> — lets moderators open an uploaded
 * proof (private, never publicly served) or review media while moderating.
 * Admin-only via middleware.ts; every proof view is written to the audit log
 * (PRD §14: access to unredacted proofs is logged).
 */
const ROOTS: Record<string, string[]> = {
  proofs: ["storage", "private", "proofs"],
  reviews: ["public", "uploads", "reviews"],
};
const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
};

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") ?? "";
  const match = /^(proofs|reviews)\/([0-9a-f-]{36}\.(jpg|png|pdf|mp4))$/.exec(key);
  if (!match) return NextResponse.json({ error: { code: "VALIDATION", message: "Bad file key" } }, { status: 400 });

  const [, kind, fileName] = match;
  let data: Buffer;
  try {
    data = await readFile(path.join(process.cwd(), ...ROOTS[kind], fileName));
  } catch {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "File not found" } }, { status: 404 });
  }

  if (kind === "proofs") {
    const session = await getServerSession(authOptions);
    const proof = await prisma.verificationProof.findFirst({ where: { storageKey: key } });
    const claim = proof ? null : await prisma.businessClaim.findFirst({ where: { proofStorageKey: key } });
    if ((proof || claim) && session?.user?.id) {
      await prisma.auditLog.create({
        data: {
          actorUserId: session.user.id,
          action: "PROOF_VIEWED",
          entityType: proof ? "VerificationProof" : "BusinessClaim",
          entityId: (proof ?? claim)!.id,
        },
      });
    }
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": TYPES[path.extname(fileName)] ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
    },
  });
}
