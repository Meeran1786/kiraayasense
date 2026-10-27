/**
 * Pure, client-safe constants shared by both the DB-backed data layer
 * (lib/db/properties.ts) and UI components. Kept free of any server-only
 * import (Prisma etc.) so client components can import it directly.
 */

export type PropertyCategory =
  | "FLAT"
  | "INDEPENDENT_HOUSE"
  | "PG"
  | "HOSTEL"
  | "HOTEL_BUDGET"
  | "HOTEL_LUXURY";

export const CATEGORY_LABELS: Record<PropertyCategory, string> = {
  FLAT: "Flat / Apartment",
  INDEPENDENT_HOUSE: "Independent House",
  PG: "PG",
  HOSTEL: "Hostel",
  HOTEL_BUDGET: "Budget Hotel",
  HOTEL_LUXURY: "Luxury Hotel",
};

export const CATEGORY_ORDER: PropertyCategory[] = [
  "FLAT",
  "INDEPENDENT_HOUSE",
  "PG",
  "HOSTEL",
  "HOTEL_BUDGET",
  "HOTEL_LUXURY",
];
