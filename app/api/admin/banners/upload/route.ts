import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

/**
 * POST /api/admin/banners/upload (multipart "file") — takes a banner image of
 * any size up to 25 MB, crops it to 4:1 from the centre if needed, scales it
 * to 2400 × 600 (sharp on high-density screens at the carousel's widest) and
 * saves it as WebP, typically 100–300 KB, under public/uploads/banners/
 * (served by nginx at /uploads/banners/). Admin-only via middleware.ts.
 */
export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif", "image/tiff"]);
const OUT_W = 2400;
const OUT_H = 600;

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Choose an image file" } }, { status: 400 });
  }
  if (file.type && !TYPES.has(file.type)) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Use a JPG, PNG or WebP image" } }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Keep banner images under 25 MB" } }, { status: 400 });
  }

  let output: Buffer;
  try {
    output = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 100_000_000 })
      .rotate() // honour camera orientation
      .resize(OUT_W, OUT_H, { fit: "cover", position: "centre", withoutEnlargement: false })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "That file couldn't be read as an image. Try saving it as JPG or PNG." } },
      { status: 400 }
    );
  }

  const fileName = `${randomUUID()}.webp`;
  const dir = path.join(process.cwd(), "public", "uploads", "banners");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), output);
  return NextResponse.json({ storageKey: `banners/${fileName}`, url: `/uploads/banners/${fileName}` }, { status: 201 });
}
