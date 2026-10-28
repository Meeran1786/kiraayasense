import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type { ImportRegion } from "../regions";
import { inBbox } from "../regions";
import { cleanPincode, cleanWebsite, usableName, type PlaceCandidate } from "../types";

/**
 * Overture Maps places (CDLA-Permissive-2.0, attribution required). Overture
 * ships GeoParquet on S3, so the importer reads an NDJSON extract made with
 * DuckDB; RUNBOOK.md section 6 has the exact query. One JSON object per line:
 * { id, name, category, confidence, lon, lat, freeform, locality, postcode, website }
 */

// Overture category -> our sub-category. Unmapped categories are counted and
// printed after a run so the table can be extended.
export const OVERTURE_CATEGORIES: Record<string, string> = {
  hospital: "healthcare-hospital",
  emergency_room: "healthcare-hospital",
  doctor: "healthcare-clinic",
  dentist: "healthcare-clinic",
  medical_center: "healthcare-clinic",
  family_practice: "healthcare-clinic",
  diagnostic_services: "healthcare-diagnostic-lab",
  laboratory_testing: "healthcare-diagnostic-lab",
  pharmacy: "healthcare-pharmacy",
  drugstore: "healthcare-pharmacy",
  school: "education-school",
  elementary_school: "education-school",
  high_school: "education-school",
  preschool: "education-school",
  college_university: "education-college-university",
  tutoring_center: "education-coaching-institute",
  test_preparation: "education-coaching-institute",
  vocational_and_technical_school: "education-skill-training",
  bank_credit_union: "banking-finance-bank",
  banks: "banking-finance-bank",
  insurance_agency: "banking-finance-insurance",
  restaurant: "food-hospitality-restaurant",
  caterer: "food-hospitality-caterer",
  hotel: "housing-hotel-budget",
  resort: "housing-hotel-luxury",
  hostel: "housing-hostel",
  guest_house: "housing-hotel-budget",
  apartments: "housing-flat",
  supermarket: "ecommerce-retail-supermarket",
  grocery_store: "ecommerce-retail-supermarket",
  electronics: "ecommerce-retail-electronics-store",
  mobile_phone_store: "ecommerce-retail-electronics-store",
  computer_store: "ecommerce-retail-electronics-store",
  car_dealer: "automotive-dealership",
  automotive_repair: "automotive-service-centre",
  auto_body_shop: "automotive-service-centre",
  it_service_and_computer_repair: "it-ites-it-services",
  software_development: "it-ites-it-services",
  information_technology_company: "it-ites-it-services",
  call_center: "it-ites-bpo-call-centre",
  real_estate_agent: "real-estate-broker",
  real_estate_developer: "real-estate-builder-developer",
  travel_agents: "travel-transport-travel-agency",
  travel_agency: "travel-transport-travel-agency",
  bus_service: "travel-transport-bus-operator",
  movers: "home-services-packers-movers",
  plumbing: "home-services-plumber-electrician",
  electrician: "home-services-plumber-electrician",
  home_cleaning: "home-services-cleaning",
  pest_control_service: "home-services-pest-control",
  internet_service_provider: "telecom-broadband-provider",
  town_hall: "government-utilities-municipal-office",
};

function categoryFor(category: string): string | null {
  if (OVERTURE_CATEGORIES[category]) return OVERTURE_CATEGORIES[category];
  if (category.endsWith("_restaurant")) return "food-hospitality-restaurant";
  return null;
}

interface OvertureRow {
  id: string;
  name?: string | null;
  category?: string | null;
  confidence?: number | null;
  lon: number;
  lat: number;
  freeform?: string | null;
  locality?: string | null;
  postcode?: string | null;
  website?: string | null;
}

export const MIN_CONFIDENCE = 0.7;

export async function readOverture(
  file: string,
  region: ImportRegion
): Promise<{ places: PlaceCandidate[]; unmapped: Map<string, number>; lowConfidence: number }> {
  const places: PlaceCandidate[] = [];
  const unmapped = new Map<string, number>();
  let lowConfidence = 0;

  const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as OvertureRow;
    if (!inBbox(region, row.lat, row.lon)) continue;
    if ((row.confidence ?? 0) < MIN_CONFIDENCE) {
      lowConfidence++;
      continue;
    }
    const name = usableName(row.name);
    const categorySlug = row.category ? categoryFor(row.category) : null;
    if (!categorySlug) {
      if (row.category) unmapped.set(row.category, (unmapped.get(row.category) ?? 0) + 1);
      continue;
    }
    if (!name) continue;
    places.push({
      source: "OVERTURE",
      sourceRef: `overture:${row.id}`,
      name,
      categorySlug,
      lat: row.lat,
      lon: row.lon,
      street: row.freeform?.slice(0, 200) ?? null,
      pincode: cleanPincode(row.postcode),
      website: cleanWebsite(row.website),
    });
  }
  return { places, unmapped, lowConfidence };
}
