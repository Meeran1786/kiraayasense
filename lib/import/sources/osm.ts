import type { ImportRegion } from "../regions";
import { inBbox } from "../regions";
import { cleanPincode, cleanWebsite, usableName, type LocalityCandidate, type PlaceCandidate } from "../types";

/**
 * OpenStreetMap via the Overpass API. OSM data is © OpenStreetMap
 * contributors under the ODbL: every listing created from it shows that
 * credit (see components/property/SourceCredit.tsx).
 *
 * Only tags that map cleanly to one of our sub-categories are imported.
 * Employers such as OEMs and Tier-1 suppliers aren't reliably tagged in OSM;
 * they come from the MCA importer instead.
 */

interface OsmRule {
  key: string;
  values: string[];
  slug: string | ((tags: Record<string, string>) => string);
}

// First match wins, so more specific rules come first.
export const OSM_RULES: OsmRule[] = [
  { key: "amenity", values: ["hospital"], slug: "healthcare-hospital" },
  { key: "amenity", values: ["clinic", "doctors", "dentist"], slug: "healthcare-clinic" },
  { key: "healthcare", values: ["laboratory", "sample_collection"], slug: "healthcare-diagnostic-lab" },
  { key: "amenity", values: ["pharmacy"], slug: "healthcare-pharmacy" },
  { key: "shop", values: ["chemist"], slug: "healthcare-pharmacy" },
  { key: "amenity", values: ["school"], slug: "education-school" },
  { key: "amenity", values: ["college", "university"], slug: "education-college-university" },
  { key: "amenity", values: ["prep_school"], slug: "education-coaching-institute" },
  { key: "amenity", values: ["bank"], slug: "banking-finance-bank" },
  { key: "office", values: ["insurance"], slug: "banking-finance-insurance" },
  { key: "amenity", values: ["restaurant"], slug: "food-hospitality-restaurant" },
  {
    key: "tourism",
    values: ["hotel"],
    slug: (t) => (Number.parseInt(t.stars ?? "", 10) >= 4 ? "housing-hotel-luxury" : "housing-hotel-budget"),
  },
  { key: "tourism", values: ["guest_house"], slug: "housing-hotel-budget" },
  { key: "tourism", values: ["hostel"], slug: "housing-hostel" },
  { key: "tourism", values: ["apartment"], slug: "housing-serviced-apartment" },
  { key: "building", values: ["apartments"], slug: "housing-flat" },
  { key: "shop", values: ["supermarket"], slug: "ecommerce-retail-supermarket" },
  { key: "shop", values: ["electronics", "mobile_phone", "computer"], slug: "ecommerce-retail-electronics-store" },
  { key: "shop", values: ["car"], slug: "automotive-dealership" },
  { key: "shop", values: ["car_repair"], slug: "automotive-service-centre" },
  { key: "office", values: ["it"], slug: "it-ites-it-services" },
  { key: "office", values: ["estate_agent"], slug: "real-estate-broker" },
  { key: "shop", values: ["travel_agency"], slug: "travel-transport-travel-agency" },
  { key: "office", values: ["moving_company"], slug: "home-services-packers-movers" },
  { key: "amenity", values: ["townhall"], slug: "government-utilities-municipal-office" },
];

export interface OsmElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export function buildOverpassQuery(region: ImportRegion, rules: OsmRule[] = OSM_RULES): string {
  const bbox = region.bbox.join(",");
  const lines = rules.map((r) => `  nwr["${r.key}"~"^(${r.values.join("|")})$"]["name"](${bbox});`);
  // Neighbourhood centroids come in the same response, to assign localities.
  lines.push(`  node["place"~"^(suburb|neighbourhood|quarter)$"]["name"](${bbox});`);
  return `[out:json][timeout:600];\n(\n${lines.join("\n")}\n);\nout center tags;`;
}

export async function fetchOverpass(query: string): Promise<OsmElement[]> {
  const url = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "KiraayaSense-importer/1.0" },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Overpass returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as { elements: OsmElement[] };
  return body.elements;
}

function classify(tags: Record<string, string>): string | null {
  for (const rule of OSM_RULES) {
    if (tags[rule.key] && rule.values.includes(tags[rule.key])) {
      return typeof rule.slug === "function" ? rule.slug(tags) : rule.slug;
    }
  }
  return null;
}

export function parseOsm(
  elements: OsmElement[],
  region: ImportRegion
): { places: PlaceCandidate[]; localities: LocalityCandidate[]; unmapped: number } {
  const places: PlaceCandidate[] = [];
  const localities: LocalityCandidate[] = [];
  let unmapped = 0;

  for (const el of elements) {
    const tags = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined || !inBbox(region, lat, lon)) continue;

    if (tags.place && el.type === "node") {
      const name = usableName(tags["name:en"] ?? tags.name);
      if (name) localities.push({ name, lat, lon });
      continue;
    }

    // Closed or disused places, and ones explicitly marked private, are skipped.
    if (tags.disused === "yes" || tags["disused:amenity"] || tags.access === "private") continue;

    const name = usableName(tags["name:en"] ?? tags.name);
    const categorySlug = classify(tags);
    if (!name || !categorySlug) {
      unmapped++;
      continue;
    }
    places.push({
      source: "OSM",
      sourceRef: `osm:${el.type}/${el.id}`,
      name,
      categorySlug,
      lat,
      lon,
      doorNumber: tags["addr:housenumber"] ?? null,
      street: tags["addr:street"] ?? null,
      localityName: tags["addr:suburb"] ?? tags["addr:neighbourhood"] ?? null,
      pincode: cleanPincode(tags["addr:postcode"]),
      website: cleanWebsite(tags.website ?? tags["contact:website"]),
    });
  }
  return { places, localities, unmapped };
}
