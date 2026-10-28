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

/** A square region `km` kilometres each way from a city centre. */
function city(key: string, name: string, district: string, state: string, lat: number, lon: number, km: number, pincodePrefixes: string[]): ImportRegion {
  const dLat = km / 111;
  const dLon = km / (111 * Math.cos((lat * Math.PI) / 180));
  const r = (n: number) => Math.round(n * 100) / 100;
  return { key, city: name, district, state, bbox: [r(lat - dLat), r(lon - dLon), r(lat + dLat), r(lon + dLon)], pincodePrefixes };
}

export const REGIONS: ImportRegion[] = [
  { key: "bengaluru", city: "Bengaluru", district: "Bengaluru Urban", state: "Karnataka", bbox: [12.83, 77.45, 13.14, 77.78], pincodePrefixes: ["560", "5621"] },
  { key: "hyderabad", city: "Hyderabad", district: "Hyderabad", state: "Telangana", bbox: [17.3, 78.3, 17.55, 78.6], pincodePrefixes: ["500"] },
  { key: "pune", city: "Pune", district: "Pune", state: "Maharashtra", bbox: [18.43, 73.74, 18.63, 73.98], pincodePrefixes: ["411", "4121"] },
  { key: "chennai", city: "Chennai", district: "Chennai", state: "Tamil Nadu", bbox: [12.83, 80.12, 13.24, 80.33], pincodePrefixes: ["600"] },
  { key: "mumbai", city: "Mumbai", district: "Mumbai", state: "Maharashtra", bbox: [18.89, 72.77, 19.28, 73.03], pincodePrefixes: ["400"] },
  { key: "delhi", city: "Delhi", district: "New Delhi", state: "Delhi", bbox: [28.4, 76.84, 28.88, 77.35], pincodePrefixes: ["110"] },
  // Delhi covers Gurugram, Noida, Ghaziabad and Faridabad; Mumbai covers Thane.
  // Remaining metros, then tier 1 and tier 2 cities: a box of `km` around the centre.
  city("kolkata", "Kolkata", "Kolkata", "West Bengal", 22.57, 88.36, 18, ["700"]),
  city("ahmedabad", "Ahmedabad", "Ahmedabad", "Gujarat", 23.03, 72.58, 18, ["380", "382"]),
  city("surat", "Surat", "Surat", "Gujarat", 21.17, 72.83, 15, ["394", "395"]),
  city("jaipur", "Jaipur", "Jaipur", "Rajasthan", 26.91, 75.79, 16, ["302", "303"]),
  city("lucknow", "Lucknow", "Lucknow", "Uttar Pradesh", 26.85, 80.95, 16, ["226", "227"]),
  city("kanpur", "Kanpur", "Kanpur Nagar", "Uttar Pradesh", 26.45, 80.33, 13, ["208", "209"]),
  city("nagpur", "Nagpur", "Nagpur", "Maharashtra", 21.15, 79.09, 14, ["440", "441"]),
  city("indore", "Indore", "Indore", "Madhya Pradesh", 22.72, 75.86, 13, ["452", "453"]),
  city("bhopal", "Bhopal", "Bhopal", "Madhya Pradesh", 23.26, 77.41, 13, ["462", "463"]),
  city("patna", "Patna", "Patna", "Bihar", 25.6, 85.14, 12, ["800", "801"]),
  city("vadodara", "Vadodara", "Vadodara", "Gujarat", 22.31, 73.18, 12, ["390", "391"]),
  city("ludhiana", "Ludhiana", "Ludhiana", "Punjab", 30.9, 75.85, 12, ["141", "142"]),
  city("agra", "Agra", "Agra", "Uttar Pradesh", 27.18, 78.01, 11, ["282", "283"]),
  city("nashik", "Nashik", "Nashik", "Maharashtra", 20.0, 73.79, 12, ["422"]),
  city("coimbatore", "Coimbatore", "Coimbatore", "Tamil Nadu", 11.02, 76.96, 14, ["641"]),
  city("kochi", "Kochi", "Ernakulam", "Kerala", 9.98, 76.28, 14, ["682", "683"]),
  city("visakhapatnam", "Visakhapatnam", "Visakhapatnam", "Andhra Pradesh", 17.69, 83.22, 15, ["530", "531"]),
  city("thiruvananthapuram", "Thiruvananthapuram", "Thiruvananthapuram", "Kerala", 8.52, 76.94, 12, ["695"]),
  city("chandigarh", "Chandigarh", "Chandigarh", "Chandigarh", 30.73, 76.78, 12, ["160", "140", "134"]),
  city("mysuru", "Mysuru", "Mysuru", "Karnataka", 12.3, 76.64, 10, ["570", "571"]),
  city("madurai", "Madurai", "Madurai", "Tamil Nadu", 9.93, 78.12, 11, ["625"]),
  city("vijayawada", "Vijayawada", "NTR", "Andhra Pradesh", 16.51, 80.65, 11, ["520", "521"]),
  city("guwahati", "Guwahati", "Kamrup Metropolitan", "Assam", 26.14, 91.74, 13, ["781"]),
  city("bhubaneswar", "Bhubaneswar", "Khordha", "Odisha", 20.3, 85.82, 13, ["751", "752"]),
  city("raipur", "Raipur", "Raipur", "Chhattisgarh", 21.25, 81.63, 12, ["492", "493"]),
  city("ranchi", "Ranchi", "Ranchi", "Jharkhand", 23.34, 85.31, 12, ["834", "835"]),
  city("dehradun", "Dehradun", "Dehradun", "Uttarakhand", 30.32, 78.03, 11, ["248"]),
  city("jodhpur", "Jodhpur", "Jodhpur", "Rajasthan", 26.24, 73.02, 11, ["342"]),
  city("amritsar", "Amritsar", "Amritsar", "Punjab", 31.63, 74.87, 10, ["143"]),
  city("varanasi", "Varanasi", "Varanasi", "Uttar Pradesh", 25.32, 82.99, 11, ["221"]),
  city("prayagraj", "Prayagraj", "Prayagraj", "Uttar Pradesh", 25.44, 81.85, 11, ["211", "212"]),
  city("gwalior", "Gwalior", "Gwalior", "Madhya Pradesh", 26.22, 78.18, 11, ["474", "475"]),
  city("jabalpur", "Jabalpur", "Jabalpur", "Madhya Pradesh", 23.18, 79.95, 11, ["482", "483"]),
  city("rajkot", "Rajkot", "Rajkot", "Gujarat", 22.3, 70.8, 11, ["360"]),
  city("sambhajinagar", "Chhatrapati Sambhajinagar", "Chhatrapati Sambhajinagar", "Maharashtra", 19.88, 75.34, 11, ["431"]),
  city("solapur", "Solapur", "Solapur", "Maharashtra", 17.66, 75.91, 10, ["413"]),
  city("hubballi", "Hubballi-Dharwad", "Dharwad", "Karnataka", 15.4, 75.07, 13, ["580"]),
  city("mangaluru", "Mangaluru", "Dakshina Kannada", "Karnataka", 12.91, 74.86, 11, ["575"]),
  city("tiruchirappalli", "Tiruchirappalli", "Tiruchirappalli", "Tamil Nadu", 10.8, 78.69, 11, ["620", "621"]),
  city("salem", "Salem", "Salem", "Tamil Nadu", 11.66, 78.15, 10, ["636"]),
  city("tiruppur", "Tiruppur", "Tiruppur", "Tamil Nadu", 11.11, 77.34, 9, ["641"]),
  city("vellore", "Vellore", "Vellore", "Tamil Nadu", 12.92, 79.13, 9, ["632"]),
  city("puducherry", "Puducherry", "Puducherry", "Puducherry", 11.93, 79.83, 10, ["605"]),
  city("kozhikode", "Kozhikode", "Kozhikode", "Kerala", 11.26, 75.78, 11, ["673"]),
  city("thrissur", "Thrissur", "Thrissur", "Kerala", 10.53, 76.21, 10, ["680"]),
  city("meerut", "Meerut", "Meerut", "Uttar Pradesh", 28.98, 77.71, 11, ["250"]),
  city("bareilly", "Bareilly", "Bareilly", "Uttar Pradesh", 28.37, 79.43, 10, ["243"]),
  city("aligarh", "Aligarh", "Aligarh", "Uttar Pradesh", 27.88, 78.08, 9, ["202"]),
  city("gorakhpur", "Gorakhpur", "Gorakhpur", "Uttar Pradesh", 26.76, 83.37, 10, ["273"]),
  city("jalandhar", "Jalandhar", "Jalandhar", "Punjab", 31.33, 75.58, 10, ["144"]),
  city("kota", "Kota", "Kota", "Rajasthan", 25.18, 75.83, 11, ["324"]),
  city("udaipur", "Udaipur", "Udaipur", "Rajasthan", 24.59, 73.71, 10, ["313"]),
  city("ajmer", "Ajmer", "Ajmer", "Rajasthan", 26.45, 74.64, 9, ["305"]),
  city("jammu", "Jammu", "Jammu", "Jammu and Kashmir", 32.73, 74.86, 10, ["180", "181"]),
  city("srinagar", "Srinagar", "Srinagar", "Jammu and Kashmir", 34.08, 74.8, 11, ["190", "191"]),
  city("jamshedpur", "Jamshedpur", "East Singhbhum", "Jharkhand", 22.8, 86.2, 12, ["831", "832"]),
  city("dhanbad", "Dhanbad", "Dhanbad", "Jharkhand", 23.8, 86.43, 11, ["826", "828"]),
  city("cuttack", "Cuttack", "Cuttack", "Odisha", 20.46, 85.88, 9, ["753", "754"]),
  city("bhilai", "Bhilai-Durg", "Durg", "Chhattisgarh", 21.2, 81.35, 12, ["490", "491"]),
  city("warangal", "Warangal", "Warangal", "Telangana", 17.97, 79.59, 11, ["506"]),
  city("guntur", "Guntur", "Guntur", "Andhra Pradesh", 16.3, 80.44, 10, ["522"]),
  city("nellore", "Nellore", "Nellore", "Andhra Pradesh", 14.44, 79.99, 9, ["524"]),
  city("tirupati", "Tirupati", "Tirupati", "Andhra Pradesh", 13.63, 79.42, 10, ["517"]),
  city("belagavi", "Belagavi", "Belagavi", "Karnataka", 15.85, 74.5, 10, ["590", "591"]),
  city("kolhapur", "Kolhapur", "Kolhapur", "Maharashtra", 16.7, 74.24, 10, ["416"]),
  city("amravati", "Amravati", "Amravati", "Maharashtra", 20.93, 77.75, 10, ["444"]),
  city("siliguri", "Siliguri", "Darjeeling", "West Bengal", 26.73, 88.4, 10, ["734"]),
  city("jamnagar", "Jamnagar", "Jamnagar", "Gujarat", 22.47, 70.06, 9, ["361"]),
  city("bhavnagar", "Bhavnagar", "Bhavnagar", "Gujarat", 21.76, 72.15, 9, ["364"]),
];

export function getRegion(key: string): ImportRegion {
  const region = REGIONS.find((r) => r.key === key);
  if (!region) throw new Error(`Unknown region "${key}". Known: ${REGIONS.map((r) => r.key).join(", ")}`);
  return region;
}

export const inBbox = (r: ImportRegion, lat: number, lon: number) =>
  lat >= r.bbox[0] && lat <= r.bbox[2] && lon >= r.bbox[1] && lon <= r.bbox[3];
