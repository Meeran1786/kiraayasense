/**
 * Seeds the real Postgres database with the same six sample properties (and
 * a subset of their reviews) that used to live in lib/mockData.ts, so the
 * discovery → detail → review flow has something to look at immediately
 * after `npm run db:setup`. Run directly with `npm run db:seed` or via
 * `npx prisma db seed`.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // System users that "own" the seeded content. Real reviewers/listers are
  // created on demand (Google sign-in upsert in lib/auth.ts); these two are
  // fixtures purely so seeded rows have a valid submittedBy/userId FK.
  const lister = await prisma.user.upsert({
    where: { primaryEmail: "seed-lister@kiraayasense.local" },
    update: {},
    create: {
      displayName: "KiraayaSense Listings",
      primaryEmail: "seed-lister@kiraayasense.local",
      primaryEmailVerifiedAt: new Date(),
      role: "USER",
    },
  });

  const reviewer = await prisma.user.upsert({
    where: { primaryEmail: "seed-reviewer@kiraayasense.local" },
    update: {},
    create: {
      displayName: "Priya S.",
      primaryEmail: "seed-reviewer@kiraayasense.local",
      primaryEmailVerifiedAt: new Date(),
      role: "USER",
    },
  });

  const localities: { name: string; district: string; state: string; pincode: string }[] = [
    { name: "Koramangala", district: "Bengaluru Urban", state: "Karnataka", pincode: "560034" },
    { name: "Indiranagar", district: "Bengaluru Urban", state: "Karnataka", pincode: "560038" },
    { name: "MG Road", district: "Bengaluru Urban", state: "Karnataka", pincode: "560001" },
    { name: "HSR Layout", district: "Bengaluru Urban", state: "Karnataka", pincode: "560102" },
    { name: "Whitefield", district: "Bengaluru Urban", state: "Karnataka", pincode: "560066" },
    { name: "UB City", district: "Bengaluru Urban", state: "Karnataka", pincode: "560001" },
  ];

  const localityRows: Record<string, string> = {};
  for (const loc of localities) {
    const row = await prisma.locality.upsert({
      where: { name_district_pincode: { name: loc.name, district: loc.district, pincode: loc.pincode } },
      update: {},
      create: loc,
    });
    localityRows[loc.name] = row.id;
  }

  interface SeedReason {
    type: "PRO" | "CON";
    category: string;
    text: string;
  }
  interface SeedReview {
    categoryScores: Record<string, number>;
    reasons: SeedReason[];
    mediaCount: number;
    proofType: "UPI_TRANSACTION" | "RENT_RECEIPT" | "BANK_STATEMENT";
    ownerResponse?: string;
  }
  interface SeedProperty {
    name: string;
    category: string;
    locality: string;
    district: string;
    state: string;
    pincode: string;
    street: string;
    doorNumber: string;
    approxRentMin: number;
    approxRentMax: number;
    reviews: SeedReview[];
  }

  const properties: SeedProperty[] = [
    {
      name: "Sunrise PG",
      category: "PG",
      locality: "Koramangala",
      district: "Bengaluru Urban",
      state: "Karnataka",
      pincode: "560034",
      street: "5th Block, 80 Feet Road",
      doorNumber: "22/A",
      approxRentMin: 9000,
      approxRentMax: 13000,
      reviews: [
        {
          categoryScores: {
            VALUE_FOR_MONEY: 3,
            LOCALITY_SAFETY: 5,
            OWNER_RESPONSIVENESS: 4,
            HYGIENE_CLEANLINESS: 4,
            WATER_SUPPLY: 4,
            ELECTRICITY_BACKUP: 5,
            AMENITIES_LIFT: 4,
          },
          reasons: [
            { type: "CON", category: "VALUE_FOR_MONEY", text: "Rent went up 10% at renewal with only a week's notice." },
            { type: "PRO", category: "LOCALITY_SAFETY", text: "Well-lit street, felt safe walking back after 10pm shifts." },
            { type: "PRO", category: "ELECTRICITY_BACKUP", text: "Backup generator kicks in within seconds during outages." },
          ],
          mediaCount: 3,
          proofType: "UPI_TRANSACTION",
        },
        {
          categoryScores: {
            VALUE_FOR_MONEY: 4,
            LOCALITY_SAFETY: 4,
            OWNER_RESPONSIVENESS: 3,
            HYGIENE_CLEANLINESS: 4,
            WATER_SUPPLY: 4,
            ELECTRICITY_BACKUP: 4,
            AMENITIES_LIFT: 3,
          },
          reasons: [
            { type: "PRO", category: "HYGIENE_CLEANLINESS", text: "Common areas cleaned daily, no complaints there." },
            { type: "CON", category: "OWNER_RESPONSIVENESS", text: "Took 4 days to fix a jammed lock on my room door." },
            { type: "PRO", category: "VALUE_FOR_MONEY", text: "Rent is fair for the locality compared to nearby PGs." },
          ],
          mediaCount: 2,
          proofType: "RENT_RECEIPT",
          ownerResponse: "Thanks for the feedback — we've since added a second caretaker for faster turnaround on repairs.",
        },
      ],
    },
    {
      name: "Green Valley Apartments, 2BHK",
      category: "FLAT",
      locality: "Indiranagar",
      district: "Bengaluru Urban",
      state: "Karnataka",
      pincode: "560038",
      street: "100 Feet Road",
      doorNumber: "14",
      approxRentMin: 28000,
      approxRentMax: 34000,
      reviews: [
        {
          categoryScores: {
            VALUE_FOR_MONEY: 2,
            LOCALITY_SAFETY: 4,
            OWNER_RESPONSIVENESS: 2,
            HYGIENE_CLEANLINESS: 3,
            WATER_SUPPLY: 4,
            ELECTRICITY_BACKUP: 3,
            AMENITIES_LIFT: 3,
          },
          reasons: [
            { type: "CON", category: "VALUE_FOR_MONEY", text: "Owner raised rent 20% mid-lease citing 'market rate', no written notice given." },
            { type: "CON", category: "OWNER_RESPONSIVENESS", text: "Ignored three requests to fix a leaking bathroom ceiling for over a month." },
            { type: "PRO", category: "LOCALITY_SAFETY", text: "Gated community with a security guard on duty 24/7." },
          ],
          mediaCount: 4,
          proofType: "BANK_STATEMENT",
        },
      ],
    },
    {
      name: "Hotel Amber Residency",
      category: "HOTEL_BUDGET",
      locality: "MG Road",
      district: "Bengaluru Urban",
      state: "Karnataka",
      pincode: "560001",
      street: "Church Street",
      doorNumber: "3",
      approxRentMin: 1800,
      approxRentMax: 2600,
      reviews: [
        {
          categoryScores: {
            VALUE_FOR_MONEY: 5,
            LOCALITY_SAFETY: 4,
            OWNER_RESPONSIVENESS: 5,
            HYGIENE_CLEANLINESS: 5,
            WATER_SUPPLY: 5,
            ELECTRICITY_BACKUP: 4,
            AMENITIES_LIFT: 4,
          },
          reasons: [
            { type: "PRO", category: "HYGIENE_CLEANLINESS", text: "Room and linens were spotless on check-in, better than the photos." },
            { type: "PRO", category: "OWNER_RESPONSIVENESS", text: "Front desk sorted a billing mix-up within minutes, no argument." },
            { type: "PRO", category: "VALUE_FOR_MONEY", text: "Excellent rate for the location, walking distance to MG Road metro." },
          ],
          mediaCount: 5,
          proofType: "UPI_TRANSACTION",
        },
      ],
    },
    {
      name: "Lakeview Independent House",
      category: "INDEPENDENT_HOUSE",
      locality: "HSR Layout",
      district: "Bengaluru Urban",
      state: "Karnataka",
      pincode: "560102",
      street: "27th Main",
      doorNumber: "9",
      approxRentMin: 22000,
      approxRentMax: 26000,
      reviews: [],
    },
    {
      name: "Campus Nest Hostel",
      category: "HOSTEL",
      locality: "Whitefield",
      district: "Bengaluru Urban",
      state: "Karnataka",
      pincode: "560066",
      street: "ITPL Main Road",
      doorNumber: "11",
      approxRentMin: 6000,
      approxRentMax: 8500,
      reviews: [
        {
          categoryScores: {
            VALUE_FOR_MONEY: 3,
            LOCALITY_SAFETY: 3,
            OWNER_RESPONSIVENESS: 2,
            HYGIENE_CLEANLINESS: 2,
            WATER_SUPPLY: 2,
            ELECTRICITY_BACKUP: 3,
            AMENITIES_LIFT: 3,
          },
          reasons: [
            { type: "CON", category: "HYGIENE_CLEANLINESS", text: "Shared bathrooms were not cleaned for days at a time." },
            { type: "CON", category: "WATER_SUPPLY", text: "Water supply cut off most mornings between 7-9am, the busiest time." },
            { type: "CON", category: "OWNER_RESPONSIVENESS", text: "Warden did not respond to WhatsApp complaints about the water issue for two weeks." },
          ],
          mediaCount: 2,
          proofType: "UPI_TRANSACTION",
        },
      ],
    },
    {
      name: "The Regal Grand",
      category: "HOTEL_LUXURY",
      locality: "UB City",
      district: "Bengaluru Urban",
      state: "Karnataka",
      pincode: "560001",
      street: "Vittal Mallya Road",
      doorNumber: "1",
      approxRentMin: 8500,
      approxRentMax: 15000,
      reviews: [],
    },
  ];

  for (const p of properties) {
    const existing = await prisma.property.findFirst({ where: { name: p.name, localityId: localityRows[p.locality] } });
    const property =
      existing ??
      (await prisma.property.create({
        data: {
          name: p.name,
          category: p.category as any,
          status: "APPROVED",
          doorNumber: p.doorNumber,
          street: p.street,
          localityId: localityRows[p.locality],
          district: p.district,
          state: p.state,
          pincode: p.pincode,
          approxRentMin: p.approxRentMin,
          approxRentMax: p.approxRentMax,
          submittedById: lister.id,
        },
      }));

    if (!existing) {
      for (const r of p.reviews) {
        await prisma.review.create({
          data: {
            propertyId: property.id,
            userId: reviewer.id,
            status: "APPROVED",
            categoryScores: {
              create: Object.entries(r.categoryScores).map(([category, score]) => ({ category: category as any, score })),
            },
            reasons: {
              create: r.reasons.map((reason) => ({ type: reason.type, category: reason.category as any, text: reason.text })),
            },
            media: {
              create: Array.from({ length: r.mediaCount }).map((_, i) => ({
                kind: "PHOTO",
                status: "APPROVED",
                storageKey: `seed/${property.id}-${i}.jpg`,
                mimeType: "image/jpeg",
                byteSize: 250_000,
              })),
            },
            proofs: {
              create: [
                {
                  proofType: r.proofType,
                  status: "APPROVED",
                  storageKey: `seed-proofs/${property.id}.jpg`,
                  mimeType: "image/jpeg",
                  byteSize: 100_000,
                  consentedAt: new Date(),
                },
              ],
            },
            ...(r.ownerResponse
              ? {
                  ownerResponse: {
                    create: {
                      respondedByUserId: lister.id,
                      text: r.ownerResponse,
                      status: "APPROVED",
                    },
                  },
                }
              : {}),
          },
        });
      }
    }
  }

  console.log(`Seeded ${properties.length} properties (skipping any that already existed).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
