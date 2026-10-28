/**
 * Seeds the categories and question sets from prisma/data/taxonomy.ts
 * (always — needed in every environment), plus a handful of sample
 * businesses and reviews when SEED_SAMPLE_DATA=1 (local development only:
 * they are fictional and must never reach production). Run with
 * `npm run db:seed`. Safe to re-run: existing categories, question sets and
 * sample businesses are left as they are.
 */
import { PrismaClient, type Prisma, type Relationship } from "@prisma/client";
import { CATEGORIES, QUESTION_SETS } from "./data/taxonomy";

const prisma = new PrismaClient();

async function seedTaxonomy() {
  const ids: Record<string, string> = {};
  for (const [i, top] of CATEGORIES.entries()) {
    const parent = await prisma.category.upsert({
      where: { slug: top.slug },
      update: {},
      create: { slug: top.slug, name: top.name, sortOrder: i, relationships: top.relationships },
    });
    ids[top.slug] = parent.id;
    for (const [j, child] of top.children.entries()) {
      const row = await prisma.category.upsert({
        where: { slug: child.slug },
        update: {},
        create: { slug: child.slug, name: child.name, sortOrder: j, parentId: parent.id },
      });
      ids[child.slug] = row.id;
    }
  }

  let created = 0;
  for (const set of QUESTION_SETS) {
    const categoryId = set.categorySlug ? ids[set.categorySlug] : null;
    if (set.categorySlug && !categoryId) throw new Error(`Unknown category slug in taxonomy: ${set.categorySlug}`);
    const existing = await prisma.questionSet.findFirst({ where: { categoryId, relationship: set.relationship } });
    if (existing) continue;
    await prisma.questionSet.create({
      data: {
        categoryId,
        relationship: set.relationship,
        title: set.title,
        proofRequired: set.proofRequired ?? false,
        mediaRequired: set.mediaRequired ?? false,
        questions: {
          create: set.questions.map((q, sortOrder) => ({
            key: q.key,
            label: q.label,
            helpText: q.helpText,
            type: q.type,
            options: q.type === "SINGLE_CHOICE" ? q.options : [],
            required: q.type === "STAR" ? true : q.required ?? false,
            sortOrder,
          })),
        },
      },
    });
    created++;
  }
  console.log(`Taxonomy: ${Object.keys(ids).length} categories, ${created} new question sets.`);
  return ids;
}

async function seedSampleData(categoryIds: Record<string, string>) {
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
    key: string;
    text: string;
  }
  interface SeedReview {
    scores: Record<string, number>;
    facts?: Record<string, string | boolean | number>;
    reasons: SeedReason[];
    mediaCount: number;
    proofType?: "UPI_TRANSACTION" | "RENT_RECEIPT" | "BANK_STATEMENT";
    ownerResponse?: string;
  }
  interface SeedProperty {
    name: string;
    category: string; // sub-category slug
    relationship?: Relationship; // defaults to TENANT_GUEST
    locality: string;
    district: string;
    state: string;
    pincode: string;
    street: string;
    doorNumber: string;
    approxRentMin?: number;
    approxRentMax?: number;
    reviews: SeedReview[];
  }

  const properties: SeedProperty[] = [
    {
      name: "Sunrise PG",
      category: "housing-pg",
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
          scores: {
            VALUE_FOR_MONEY: 3,
            LOCALITY_SAFETY: 5,
            RESPONSIVENESS: 4,
            HYGIENE_CLEANLINESS: 4,
            WATER_SUPPLY: 4,
            ELECTRICITY_BACKUP: 5,
            AMENITIES: 4,
          },
          reasons: [
            { type: "CON", key: "VALUE_FOR_MONEY", text: "Rent went up 10% at renewal with only a week's notice." },
            { type: "PRO", key: "LOCALITY_SAFETY", text: "Well-lit street, felt safe walking back after 10pm shifts." },
            { type: "PRO", key: "ELECTRICITY_BACKUP", text: "Backup generator kicks in within seconds during outages." },
          ],
          mediaCount: 3,
          proofType: "UPI_TRANSACTION",
        },
        {
          scores: {
            VALUE_FOR_MONEY: 4,
            LOCALITY_SAFETY: 4,
            RESPONSIVENESS: 3,
            HYGIENE_CLEANLINESS: 4,
            WATER_SUPPLY: 4,
            ELECTRICITY_BACKUP: 4,
            AMENITIES: 3,
          },
          reasons: [
            { type: "PRO", key: "HYGIENE_CLEANLINESS", text: "Common areas cleaned daily, no complaints there." },
            { type: "CON", key: "RESPONSIVENESS", text: "Took 4 days to fix a jammed lock on my room door." },
            { type: "PRO", key: "VALUE_FOR_MONEY", text: "Rent is fair for the locality compared to nearby PGs." },
          ],
          mediaCount: 2,
          proofType: "RENT_RECEIPT",
          ownerResponse: "Thanks for the feedback — we've since added a second caretaker for faster turnaround on repairs.",
        },
      ],
    },
    {
      name: "Green Valley Apartments, 2BHK",
      category: "housing-flat",
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
          scores: {
            VALUE_FOR_MONEY: 2,
            LOCALITY_SAFETY: 4,
            RESPONSIVENESS: 2,
            HYGIENE_CLEANLINESS: 3,
            WATER_SUPPLY: 4,
            ELECTRICITY_BACKUP: 3,
            AMENITIES: 3,
          },
          reasons: [
            { type: "CON", key: "VALUE_FOR_MONEY", text: "Owner raised rent 20% mid-lease citing 'market rate', no written notice given." },
            { type: "CON", key: "RESPONSIVENESS", text: "Ignored three requests to fix a leaking bathroom ceiling for over a month." },
            { type: "PRO", key: "LOCALITY_SAFETY", text: "Gated community with a security guard on duty 24/7." },
          ],
          mediaCount: 4,
          proofType: "BANK_STATEMENT",
        },
      ],
    },
    {
      name: "Hotel Amber Residency",
      category: "housing-hotel-budget",
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
          scores: {
            VALUE_FOR_MONEY: 5,
            LOCALITY_SAFETY: 4,
            RESPONSIVENESS: 5,
            HYGIENE_CLEANLINESS: 5,
            WATER_SUPPLY: 5,
            ELECTRICITY_BACKUP: 4,
            AMENITIES: 4,
          },
          reasons: [
            { type: "PRO", key: "HYGIENE_CLEANLINESS", text: "Room and linens were spotless on check-in, better than the photos." },
            { type: "PRO", key: "RESPONSIVENESS", text: "Front desk sorted a billing mix-up within minutes, no argument." },
            { type: "PRO", key: "VALUE_FOR_MONEY", text: "Excellent rate for the location, walking distance to MG Road metro." },
          ],
          mediaCount: 5,
          proofType: "UPI_TRANSACTION",
        },
      ],
    },
    {
      name: "Lakeview Independent House",
      category: "housing-independent-house",
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
      category: "housing-hostel",
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
          scores: {
            VALUE_FOR_MONEY: 3,
            LOCALITY_SAFETY: 3,
            RESPONSIVENESS: 2,
            HYGIENE_CLEANLINESS: 2,
            WATER_SUPPLY: 2,
            ELECTRICITY_BACKUP: 3,
            AMENITIES: 3,
          },
          reasons: [
            { type: "CON", key: "HYGIENE_CLEANLINESS", text: "Shared bathrooms were not cleaned for days at a time." },
            { type: "CON", key: "WATER_SUPPLY", text: "Water supply cut off most mornings between 7-9am, the busiest time." },
            { type: "CON", key: "RESPONSIVENESS", text: "Warden did not respond to WhatsApp complaints about the water issue for two weeks." },
          ],
          mediaCount: 2,
          proofType: "UPI_TRANSACTION",
        },
      ],
    },
    {
      name: "The Regal Grand",
      category: "housing-hotel-luxury",
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
    {
      name: "Acme Customer Services",
      category: "it-ites-bpo-call-centre",
      locality: "Whitefield",
      district: "Bengaluru Urban",
      state: "Karnataka",
      pincode: "560066",
      street: "EPIP Zone",
      doorNumber: "Tower B",
      relationship: "EMPLOYEE",
      reviews: [
        {
          scores: {
            SALARY_ON_TIME: 4,
            SHIFT_CAB: 2,
            TARGET_PRESSURE: 2,
            LEAVE_POLICY: 3,
            APPRAISAL_FAIRNESS: 3,
            EXIT_SETTLEMENT: 2,
            RESPONSIVENESS: 3,
            TRANSPARENCY: 3,
          },
          facts: { EMPLOYMENT_STATUS: "Former employee", WOULD_RECOMMEND: false },
          reasons: [
            { type: "CON", key: "SHIFT_CAB", text: "Night-shift cab drop was often 45 minutes late, with no escort." },
            { type: "CON", key: "EXIT_SETTLEMENT", text: "Full-and-final settlement took four months after my last day." },
            { type: "PRO", key: "SALARY_ON_TIME", text: "Salary was always credited on the 1st, even during the slow months." },
          ],
          mediaCount: 0,
        },
      ],
    },
  ];

  for (const p of properties) {
    const categoryId = categoryIds[p.category];
    const relationship = p.relationship ?? "TENANT_GUEST";
    const existing = await prisma.property.findFirst({ where: { name: p.name, localityId: localityRows[p.locality] } });
    if (existing) continue;

    const property = await prisma.property.create({
      data: {
        name: p.name,
        categoryId,
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
    });
    if (p.reviews.length === 0) continue;

    const questionSet = await resolveSeedQuestionSet(categoryId, relationship);
    for (const r of p.reviews) {
      const given = Object.values(r.scores);
      const fallback = Math.round(given.reduce((a, b) => a + b, 0) / given.length);
      await prisma.review.create({
        data: {
          propertyId: property.id,
          userId: reviewer.id,
          status: "APPROVED",
          relationship,
          questionSetId: questionSet.id,
          answers: {
            create: questionSet.questions.flatMap((q): Prisma.ReviewAnswerUncheckedCreateWithoutReviewInput[] => {
              if (q.type === "STAR") {
                return [{ questionId: q.id, questionKey: q.key, starValue: r.scores[q.key] ?? fallback }];
              }
              const fact = r.facts?.[q.key];
              if (fact === undefined) return [];
              return [
                {
                  questionId: q.id,
                  questionKey: q.key,
                  boolValue: typeof fact === "boolean" ? fact : undefined,
                  choiceValue: typeof fact === "string" ? fact : undefined,
                  numberValue: typeof fact === "number" ? fact : undefined,
                },
              ];
            }),
          },
          reasons: { create: r.reasons.map((reason) => ({ type: reason.type, questionKey: reason.key, text: reason.text })) },
          media: {
            create: Array.from({ length: r.mediaCount }).map((_, i) => ({
              kind: "PHOTO" as const,
              status: "APPROVED" as const,
              storageKey: `seed/${property.id}-${i}.jpg`,
              mimeType: "image/jpeg",
              byteSize: 250_000,
            })),
          },
          proofs: r.proofType
            ? {
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
              }
            : undefined,
          ...(r.ownerResponse
            ? { ownerResponse: { create: { respondedByUserId: lister.id, text: r.ownerResponse, status: "APPROVED" } } }
            : {}),
        },
      });
    }
  }

  console.log(`Sample data: ${properties.length} businesses (skipping any that already existed).`);
}

// Same lookup order as lib/db/questionSets.ts: sub-category, then its
// parent, then the generic set for the relationship.
async function resolveSeedQuestionSet(categoryId: string, relationship: Relationship) {
  const category = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
  for (const id of [category.id, category.parentId, null]) {
    if (id === undefined) continue;
    const set = await prisma.questionSet.findFirst({
      where: { categoryId: id, relationship, isActive: true },
      orderBy: { version: "desc" },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });
    if (set) return set;
  }
  throw new Error(`No question set for ${relationship}`);
}

async function main() {
  const categoryIds = await seedTaxonomy();
  if (process.env.SEED_SAMPLE_DATA === "1") {
    await seedSampleData(categoryIds);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
