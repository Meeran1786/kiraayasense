import { prisma } from "@/lib/prisma";

/** How many banners the home-page carousel shows at most. */
export const HOME_BANNER_LIMIT = 6;

export interface PublicBanner {
  id: string;
  title: string;
  imageUrl: string;
}

/**
 * A banner's image: an upload from /admin/banners (banners/<uuid>.<ext>,
 * served by nginx from public/uploads) or a pasted https URL.
 */
export function bannerImageUrl(key: string): string | null {
  if (/^https:\/\//.test(key)) return key;
  if (/^banners\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key)) return `/uploads/${key}`;
  return null;
}

/** Banners for a placement that are active and inside their run dates, in carousel order. */
export async function liveBanners(placement: "HOME_HERO" | "LOCALITY_PAGE" | "SEARCH_INTERSTITIAL", limit = HOME_BANNER_LIMIT) {
  const now = new Date();
  const rows = await prisma.adBanner.findMany({
    where: { placement, status: "ACTIVE", startAt: { lte: now }, endAt: { gte: now } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: limit,
    select: { id: true, title: true, imageStorageKey: true },
  });
  return rows.flatMap((b): PublicBanner[] => {
    const imageUrl = bannerImageUrl(b.imageStorageKey);
    return imageUrl ? [{ id: b.id, title: b.title, imageUrl }] : [];
  });
}

/** A form date (YYYY-MM-DD) as the start of that day in India; full timestamps pass through. */
export function dayStart(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+05:30` : value);
}

/** A form date (YYYY-MM-DD) as the end of that day in India, so a banner runs through its end date. */
export function dayEnd(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999+05:30` : value);
}

/** The India calendar date (YYYY-MM-DD) of a timestamp, for the admin form's date inputs. */
export function istDate(d: Date): string {
  return new Date(d.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10);
}
