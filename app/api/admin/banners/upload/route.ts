import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * POST /api/admin/banners/upload (multipart "file") — stores a banner image
 * under public/uploads/banners/, which nginx serves at /uploads/banners/.
 * Admin-only via middleware.ts. Returns the storage key to save on the banner.
 */
const MAX_BYTES = 3 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Choose an image file" } }, { status: 400 });
  }
  const ext = EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Use a JPG, PNG or WebP image" } }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Keep banner images under 3 MB" } }, { status: 400 });
  }

  const fileName = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "banners");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ storageKey: `banners/${fileName}`, url: `/uploads/banners/${fileName}` }, { status: 201 });
}
