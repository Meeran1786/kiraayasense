import type { DataSource } from "@prisma/client";

/** A business record from any source, normalised before matching. */
export interface PlaceCandidate {
  source: Exclude<DataSource, "USER" | "ADMIN">;
  sourceRef: string; // stable id within the source, e.g. "osm:node/123"
  name: string;
  categorySlug: string; // a sub-category slug from prisma/data/taxonomy.ts
  lat: number | null;
  lon: number | null;
  doorNumber?: string | null;
  street?: string | null;
  localityName?: string | null; // used only when there are no coordinates
  pincode?: string | null;
  website?: string | null;
  cin?: string | null;
}

/** A neighbourhood centroid, used to place businesses in a locality. */
export interface LocalityCandidate {
  name: string;
  lat: number;
  lon: number;
}

const PINCODE = /^[1-9][0-9]{5}$/;
export const cleanPincode = (p: string | null | undefined) => {
  const v = p?.replace(/\s+/g, "") ?? "";
  return PINCODE.test(v) ? v : null;
};

export const cleanWebsite = (w: string | null | undefined) => {
  if (!w) return null;
  const v = w.trim();
  const url = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    return new URL(url).toString();
  } catch {
    return null;
  }
};

// Names that are a category, not a business, e.g. a node just called "ATM".
const GENERIC = /^(atm|hospital|clinic|school|college|bank|pharmacy|medical( store| shop)?|restaurant|hotel|pg|hostel|shop|store|office|temple|unnamed)$/i;
export const usableName = (n: string | null | undefined): string | null => {
  const v = n?.replace(/\s+/g, " ").trim() ?? "";
  if (v.length < 3 || v.length > 120 || GENERIC.test(v)) return null;
  return v;
};
