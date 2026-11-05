import { NextRequest, NextResponse } from "next/server";
import { isLocale } from "@/lib/i18n/locales";
import { translateReview } from "@/lib/translation";

// Uncached translations cost provider quota, so each visitor (by IP) gets a
// limited number per hour. Cached ones are free and unlimited.
const WINDOW_MS = 60 * 60 * 1000;
const PER_WINDOW = 40;
const recent = new Map<string, number[]>();

function allowNew(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= PER_WINDOW) {
    recent.set(ip, hits);
    return false;
  }
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 10_000) recent.clear();
  return true;
}

/** POST { to: "en" } → { texts: { [reasonId]: string }, sourceLang } for an approved review. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Review not found" } }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const to = body?.to;
  if (!isLocale(to)) {
    return NextResponse.json({ error: { code: "BAD_LANGUAGE", message: "Unsupported language" } }, { status: 400 });
  }
  // nginx appends the real client address last (deploy/nginx.conf), so earlier entries may be spoofed.
  const ip = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "unknown";
  const outcome = await translateReview(params.id, to, () => allowNew(ip));
  if (!outcome.ok) {
    return NextResponse.json({ error: { code: outcome.code, message: outcome.message } }, { status: outcome.status });
  }
  return NextResponse.json({ texts: outcome.result.texts, sourceLang: outcome.result.sourceLang });
}
