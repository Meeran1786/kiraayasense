import { z } from "zod";

/** "Add a missing business": shared by the form and POST /api/businesses. */

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => v || null);

export const businessSubmissionSchema = z.object({
  name: z.string().trim().min(3, "Enter the business name").max(120),
  categoryId: z.string().uuid("Pick a category"),
  doorNumber: optionalText(40),
  street: optionalText(200),
  locality: z.string().trim().min(2, "Enter the area or locality").max(80),
  district: z.string().trim().min(2, "Enter the city or district").max(80),
  state: z.enum(INDIAN_STATES, { errorMap: () => ({ message: "Pick a state" }) }),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a 6-digit pincode"),
  website: optionalText(200).refine((w) => !w || /^https?:\/\/\S+\.\S+/.test(w), "Website must start with http:// or https://"),
  googleMapsUrl: optionalText(500).refine(
    (u) => !u || /^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/.test(u),
    "Paste a Google Maps link, or leave it empty"
  ),
  googlePlaceId: optionalText(300),
  confirmNotDuplicate: z.boolean().default(false),
});

export type BusinessSubmission = z.infer<typeof businessSubmissionSchema>;

/** Coordinates from a full Google Maps URL ("…/@12.93,77.62,17z"), if present. */
export function coordsFromMapsUrl(url: string | null): { lat: number; lon: number } | null {
  if (!url) return null;
  const m = /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/.exec(url) ?? /[?&](?:q|ll)=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/.exec(url);
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  // Roughly India's bounding box.
  return lat > 6 && lat < 37.5 && lon > 68 && lon < 97.5 ? { lat, lon } : null;
}

export interface SimilarBusiness {
  id: string;
  name: string;
  locality: string;
  category: string;
}
