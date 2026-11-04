import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type { ImportRegion } from "../regions";
import { inBbox } from "../regions";
import { cleanPincode, cleanWebsite, usableName, type PlaceCandidate } from "../types";

/**
 * Overture Maps places (CDLA-Permissive-2.0, attribution required). Overture
 * ships GeoParquet on S3, so the importer reads an NDJSON extract made with
 * DuckDB (scripts/overture-extract.ts, or the query in RUNBOOK.md section 6).
 * Since 2025 the category is taxonomy.primary; older names are kept below so
 * older extracts still map. One JSON object per line:
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
  grocery_store: "ecommerce-retail-grocery-kirana",
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
  // Everyday local businesses
  veterinarian: "healthcare-veterinary-clinic",
  animal_hospital: "healthcare-veterinary-clinic",
  cafe: "food-hospitality-cafe",
  coffee_shop: "food-hospitality-cafe",
  tea_room: "food-hospitality-cafe",
  juice_bar: "food-hospitality-cafe",
  bakery: "food-hospitality-bakery",
  cake_shop: "food-hospitality-bakery",
  candy_store: "food-hospitality-sweet-shop",
  desserts: "food-hospitality-sweet-shop",
  indian_sweets_shop: "food-hospitality-sweet-shop",
  ice_cream_shop: "food-hospitality-fast-food",
  fast_food_restaurant: "food-hospitality-fast-food",
  food_stand: "food-hospitality-fast-food",
  food_truck: "food-hospitality-fast-food",
  street_vendor: "food-hospitality-fast-food",
  bar: "food-hospitality-bar-pub",
  pub: "food-hospitality-bar-pub",
  cocktail_bar: "food-hospitality-bar-pub",
  lounge: "food-hospitality-bar-pub",
  brewery: "food-hospitality-bar-pub",
  venue_and_event_space: "food-hospitality-banquet-hall",
  wedding_planning: "food-hospitality-banquet-hall",
  banquet_hall: "food-hospitality-banquet-hall",
  event_planning: "food-hospitality-banquet-hall",
  beauty_salon: "personal-care-beauty-parlour-spa",
  spa: "personal-care-beauty-parlour-spa",
  day_spa: "personal-care-beauty-parlour-spa",
  massage: "personal-care-beauty-parlour-spa",
  nail_salon: "personal-care-beauty-parlour-spa",
  skin_care: "personal-care-beauty-parlour-spa",
  hair_salon: "personal-care-salon-barber",
  barber: "personal-care-salon-barber",
  gym: "personal-care-gym-fitness",
  fitness_trainer: "personal-care-gym-fitness",
  boxing_class: "personal-care-gym-fitness",
  martial_arts_club: "personal-care-gym-fitness",
  yoga_studio: "personal-care-yoga-dance-studio",
  dance_school: "personal-care-yoga-dance-studio",
  pilates_studio: "personal-care-yoga-dance-studio",
  convenience_store: "ecommerce-retail-grocery-kirana",
  fruits_and_vegetables: "ecommerce-retail-grocery-kirana",
  dairy_stores: "ecommerce-retail-grocery-kirana",
  meat_shop: "ecommerce-retail-grocery-kirana",
  seafood_market: "ecommerce-retail-grocery-kirana",
  department_store: "ecommerce-retail-supermarket",
  shopping_center: "ecommerce-retail-supermarket",
  clothing_store: "ecommerce-retail-clothing-footwear",
  fashion: "ecommerce-retail-clothing-footwear",
  shoe_store: "ecommerce-retail-clothing-footwear",
  boutique: "ecommerce-retail-clothing-footwear",
  fabric_store: "ecommerce-retail-clothing-footwear",
  jewelry_store: "ecommerce-retail-jewellery",
  hardware_store: "ecommerce-retail-hardware-paints",
  paint_store: "ecommerce-retail-hardware-paints",
  building_supply_store: "ecommerce-retail-hardware-paints",
  furniture_store: "ecommerce-retail-furniture-home-decor",
  home_decor: "ecommerce-retail-furniture-home-decor",
  kitchen_supply_store: "ecommerce-retail-furniture-home-decor",
  eyewear_and_optician: "ecommerce-retail-optician",
  optometrist: "ecommerce-retail-optician",
  bookstore: "ecommerce-retail-books-stationery",
  office_supplies: "ecommerce-retail-books-stationery",
  stationery_store: "ecommerce-retail-books-stationery",
  laundry_services: "home-services-laundry-dry-cleaning",
  laundromat: "home-services-laundry-dry-cleaning",
  dry_cleaning: "home-services-laundry-dry-cleaning",
  sewing_and_alterations: "home-services-tailor",
  tailor: "home-services-tailor",
  gas_station: "automotive-fuel-station",
  car_wash: "automotive-car-wash",
  motorcycle_repair: "automotive-service-centre",
  tire_shop: "automotive-service-centre",
  auto_parts_and_supply_store: "automotive-service-centre",
  coworking_space: "real-estate-coworking-space",
  shared_office_space: "real-estate-coworking-space",
  // Names used by Overture's 2025+ taxonomy (taxonomy.primary)
  bank: "banking-finance-bank",
  bank_or_credit_union: "banking-finance-bank",
  doctors_office: "healthcare-clinic",
  dental_clinic: "healthcare-clinic",
  general_dentistry: "healthcare-clinic",
  outpatient_care_facility: "healthcare-clinic",
  physical_therapy: "healthcare-clinic",
  public_school: "education-school",
  private_school: "education-school",
  middle_school: "education-school",
  day_care_preschool: "education-school",
  tutoring_service: "education-coaching-institute",
  language_school: "education-skill-training",
  driving_school: "education-skill-training",
  bed_and_breakfast: "housing-hotel-budget",
  lodge: "housing-hotel-budget",
  motel: "housing-hotel-budget",
  lodging: "housing-hotel-budget",
  beach_resort: "housing-hotel-luxury",
  auto_dealer: "automotive-dealership",
  motorcycle_dealer: "automotive-dealership",
  automotive_service: "automotive-service-centre",
  auto_parts_store: "automotive-service-centre",
  tire_dealer_and_repair: "automotive-service-centre",
  auto_detailing: "automotive-car-wash",
  electronics_store: "ecommerce-retail-electronics-store",
  appliance_store: "ecommerce-retail-electronics-store",
  eyewear_store: "ecommerce-retail-optician",
  office_supply_store: "ecommerce-retail-books-stationery",
  home_goods_store: "ecommerce-retail-furniture-home-decor",
  mattress_store: "ecommerce-retail-furniture-home-decor",
  home_improvement_store: "ecommerce-retail-hardware-paints",
  fashion_boutique: "ecommerce-retail-clothing-footwear",
  fashion_and_apparel_store: "ecommerce-retail-clothing-footwear",
  fashion_accessories_store: "ecommerce-retail-clothing-footwear",
  bridal_shop: "ecommerce-retail-clothing-footwear",
  shopping_mall: "ecommerce-retail-supermarket",
  warehouse_club_store: "ecommerce-retail-supermarket",
  produce_store: "ecommerce-retail-grocery-kirana",
  butcher_shop: "ecommerce-retail-grocery-kirana",
  fishmonger: "ecommerce-retail-grocery-kirana",
  food_and_beverage_store: "ecommerce-retail-grocery-kirana",
  dessert_shop: "food-hospitality-sweet-shop",
  smoothie_juice_bar: "food-hospitality-cafe",
  food_truck_stand: "food-hospitality-fast-food",
  beer_bar: "food-hospitality-bar-pub",
  sports_bar: "food-hospitality-bar-pub",
  dance_club: "food-hospitality-bar-pub",
  party_and_event_planning: "food-hospitality-banquet-hall",
  food_delivery_service: "food-hospitality-cloud-kitchen",
  massage_therapy: "personal-care-beauty-parlour-spa",
  makeup_artist: "personal-care-beauty-parlour-spa",
  dance_studio: "personal-care-yoga-dance-studio",
  sport_or_fitness_facility: "personal-care-gym-fitness",
  real_estate_service: "real-estate-broker",
  home_developer: "real-estate-builder-developer",
  car_rental_service: "travel-transport-cab-ride-hailing",
  taxi_service: "travel-transport-cab-ride-hailing",
  tour_operator: "travel-transport-travel-agency",
  travel_service: "travel-transport-travel-agency",
  sightseeing_tour_agency: "travel-transport-travel-agency",
  airline: "travel-transport-airline",
  moving_company: "home-services-packers-movers",
  telecommunications_company: "telecom-mobile-operator",
};

// Families of Overture categories, checked after the exact table.
const OVERTURE_SUFFIXES: [string, string][] = [
  ["_clothing_store", "ecommerce-retail-clothing-footwear"],
  ["_salon", "personal-care-beauty-parlour-spa"],
  ["_restaurant", "food-hospitality-restaurant"],
];

function categoryFor(category: string): string | null {
  if (OVERTURE_CATEGORIES[category]) return OVERTURE_CATEGORIES[category];
  for (const [suffix, slug] of OVERTURE_SUFFIXES) if (category.endsWith(suffix)) return slug;
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
