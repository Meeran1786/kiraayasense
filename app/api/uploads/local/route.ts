import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Real (local-disk) replacement for the old presign + mock-upload pair.
 * There's no S3/Cloudflare R2 account configured in this environment, so
 * this writes to disk directly instead of issuing a pre-signed PUT URL —
 * everything else about the contract (client uploads a file, gets back a
 * storageKey to reference from POST /api/reviews) matches docs/API_CONTRACT.md
 * §3, so swapping in real object storage later only touches this file and
 * lib/uploadClient.ts.
 *
 * Two storage classes, per docs/ERD.md's VerificationProof design note:
 *  - REVIEW_MEDIA (residency/condition photos & video) is written under
 *    public/uploads/reviews/ — servable directly, since it's meant to be
 *    shown alongside the review.
 *  - VERIFICATION_PROOF (payment proof) is written under storage/private/
 *    proofs/ — OUTSIDE the public/ tree, never served by a public URL.
 *    Nothing in this route (or anywhere else yet) redacts these; the PII
 *    auto/manual redaction pipeline from docs/PRD.md §"Data lifecycle" is
 *    still a TODO, so treat every proof file as unredacted and sensitive.
 */

const MAX_MEDIA_BYTES = 200 * 1024 * 1024;
const MAX_PROOF_BYTES = 20 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "video/mp4"]);
const ALLOWED_PROOF_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in before uploading files" } },
      { status: 401 }
    );
  }

  const formData = await req.formData().catch(() => null);
  const purpose = formData?.get("purpose");
  const file = formData?.get("file");

  if (
    !formData ||
    (purpose !== "REVIEW_MEDIA" && purpose !== "VERIFICATION_PROOF") ||
    !(file instanceof File)
  ) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "purpose and file are required" } },
      { status: 400 }
    );
  }

  const isMedia = purpose === "REVIEW_MEDIA";
  const allowedTypes = isMedia ? ALLOWED_MEDIA_TYPES : ALLOWED_PROOF_TYPES;
  const maxBytes = isMedia ? MAX_MEDIA_BYTES : MAX_PROOF_BYTES;

  if (!allowedTypes.has(file.type)) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: `Unsupported file type: ${file.type}` } },
      { status: 400 }
    );
  }
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "File is too large" } },
      { status: 400 }
    );
  }

  const ext = extensionFor(file.type);
  const fileId = randomUUID();
  const fileName = `${fileId}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let storageKey: string;
  let url: string | null;

  if (isMedia) {
    const dir = path.join(process.cwd(), "public", "uploads", "reviews");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), buffer);
    storageKey = `reviews/${fileName}`;
    url = `/uploads/reviews/${fileName}`;
  } else {
    const dir = path.join(process.cwd(), "storage", "private", "proofs");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), buffer);
    storageKey = `proofs/${fileName}`;
    url = null; // never publicly servable
  }

  return NextResponse.json({ storageKey, url }, { status: 201 });
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "video/mp4":
      return ".mp4";
    case "application/pdf":
      return ".pdf";
    default:
      return "";
  }
}
