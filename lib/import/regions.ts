/**
 * Areas the importers know about. Each import run covers one region; add a
 * region here to seed a new city. bbox is south, west, north, east.
 */
export interface ImportRegion {
  key: string;
  city: string;
  district: string;
  state: string;
  bbox: [number, number, number, number];
  pincodePrefixes: string[]; // for sources with addresses but no coordinates (MCA)
}

export const REGIONS: ImportRegion[] = [
  { key: "bengaluru", city: "Bengaluru", district: "Bengaluru Urban", state: "Karnataka", bbox: [12.83, 77.45, 13.14, 77.78], pincodePrefixes: ["560", "5621"] },
  { key: "hyderabad", city: "Hyderabad", district: "Hyderabad", state: "Telangana", bbox: [17.3, 78.3, 17.55, 78.6], pincodePrefixes: ["500"] },
  { key: "pune", city: "Pune", district: "Pune", state: "Maharashtra", bbox: [18.43, 73.74, 18.63, 73.98], pincodePrefixes: ["411", "4121"] },
  { key: "chennai", city: "Chennai", district: "Chennai", state: "Tamil Nadu", bbox: [12.83, 80.12, 13.24, 80.33], pincodePrefixes: ["600"] },
  { key: "mumbai", city: "Mumbai", district: "Mumbai", state: "Maharashtra", bbox: [18.89, 72.77, 19.28, 73.03], pincodePrefixes: ["400"] },
  { key: "delhi", city: "Delhi", district: "New Delhi", state: "Delhi", bbox: [28.4, 76.84, 28.88, 77.35], pincodePrefixes: ["110"] },
];

export function getRegion(key: string): ImportRegion {
  const region = REGIONS.find((r) => r.key === key);
  if (!region) throw new Error(`Unknown region "${key}". Known: ${REGIONS.map((r) => r.key).join(", ")}`);
  return region;
}

export const inBbox = (r: ImportRegion, lat: number, lon: number) =>
  lat >= r.bbox[0] && lat <= r.bbox[2] && lon >= r.bbox[1] && lon <= r.bbox[3];
