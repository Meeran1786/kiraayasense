import type { ImportAction, PrismaClient } from "@prisma/client";
import type { ImportRegion } from "./regions";
import type { LocalityCandidate, PlaceCandidate } from "./types";

/**
 * Writes normalised candidates into the database. Shared by every source.
 *
 * - A record already imported from the same source (same sourceRef) only has
 *   its location and website refreshed; names and categories an admin or
 *   owner may have corrected are left alone.
 * - A record within 75 m of an existing listing with a similar name (pg_trgm
 *   similarity >= 0.5) is treated as the same business and not created. For
 *   sources without coordinates (MCA) the check is same pincode and
 *   similarity >= 0.6 (0.8 anywhere in the district, ignoring "Private
 *   Limited" and similar suffixes), or the same CIN.
 * - New listings are created as PENDING_VERIFICATION and stay out of search
 *   until a moderator publishes the batch at /admin/imports.
 */

export const DUPLICATE_RADIUS_M = 75;
const NAME_SIMILARITY = 0.5;
const NAME_SIMILARITY_NO_LOCATION = 0.6; // and same pincode, or 0.8 anywhere in the district
const LOCALITY_RADIUS_M = 3000;

export interface ImportOptions {
  dryRun?: boolean;
  log?: (msg: string) => void;
}

interface RecordRow {
  sourceRef: string;
  name: string;
  action: ImportAction;
  reason?: string;
  propertyId?: string;
}

export const SYSTEM_USER_EMAIL = "system@kiraayasense.local";

export async function getSystemUserId(prisma: PrismaClient): Promise<string> {
  const user = await prisma.user.upsert({
    where: { primaryEmail: SYSTEM_USER_EMAIL },
    update: {},
    create: {
      displayName: "KiraayaSense",
      handle: "kiraayasense",
      profileVisibility: "PRIVATE",
      primaryEmail: SYSTEM_USER_EMAIL,
    },
  });
  return user.id;
}

/** Saves neighbourhood centroids so businesses can be placed in a locality. */
export async function upsertLocalities(
  prisma: PrismaClient,
  region: ImportRegion,
  localities: LocalityCandidate[],
  opts: ImportOptions = {}
): Promise<number> {
  let saved = 0;
  for (const l of localities) {
    if (opts.dryRun) {
      saved++;
      continue;
    }
    const existing = await prisma.locality.findFirst({
      where: { name: { equals: l.name, mode: "insensitive" }, district: region.district },
      select: { id: true },
    });
    const id =
      existing?.id ??
      (await prisma.locality.create({ data: { name: l.name, district: region.district, state: region.state, pincode: "" } }))
        .id;
    // Keep the first centroid we saw; don't move a locality on re-import.
    saved += await prisma.$executeRaw`
      UPDATE localities SET location = ST_SetSRID(ST_MakePoint(${l.lon}, ${l.lat}), 4326)::geography
      WHERE id = ${id}::uuid AND location IS NULL`;
  }
  return saved;
}

export async function importPlaces(
  prisma: PrismaClient,
  jobId: string,
  region: ImportRegion,
  places: PlaceCandidate[],
  opts: ImportOptions = {}
): Promise<Record<ImportAction, number>> {
  const log = opts.log ?? (() => {});
  const counts: Record<ImportAction, number> = { CREATED: 0, UPDATED: 0, MERGED: 0, SKIPPED: 0 };
  const records: RecordRow[] = [];
  const record = (r: RecordRow) => {
    counts[r.action]++;
    records.push(r);
  };

  const categories = await prisma.category.findMany({ where: { parentId: { not: null } }, select: { id: true, slug: true } });
  const categoryId = new Map(categories.map((c) => [c.slug, c.id]));
  const systemUserId = opts.dryRun ? "" : await getSystemUserId(prisma);
  const localityCache = new Map<string, string>();
  const seen = new Set<string>();

  for (const [i, place] of places.entries()) {
    if (i > 0 && i % 500 === 0) log(`  ${i}/${places.length} — ${JSON.stringify(counts)}`);
    // The same OSM object can come back twice (e.g. tagged with two rules).
    if (seen.has(place.sourceRef)) continue;
    seen.add(place.sourceRef);

    const catId = categoryId.get(place.categorySlug);
    if (!catId) {
      record({ sourceRef: place.sourceRef, name: place.name, action: "SKIPPED", reason: `unknown category ${place.categorySlug}` });
      continue;
    }

    const same = await prisma.property.findUnique({
      where: { source_sourceRef: { source: place.source, sourceRef: place.sourceRef } },
      select: { id: true, website: true, claimStatus: true },
    });
    if (same) {
      if (!opts.dryRun && same.claimStatus !== "VERIFIED") {
        if (place.website && place.website !== same.website) {
          await prisma.property.update({ where: { id: same.id }, data: { website: place.website } });
        }
        if (place.lat !== null && place.lon !== null) await setLocation(prisma, same.id, place.lat, place.lon);
      }
      record({ sourceRef: place.sourceRef, name: place.name, action: "UPDATED", propertyId: same.id });
      continue;
    }

    const duplicate = await findDuplicate(prisma, { ...place, district: region.district });
    if (duplicate) {
      // A company record matching an existing listing still tells us its CIN.
      if (place.cin && !opts.dryRun) {
        await prisma.property.updateMany({ where: { id: duplicate.id, cin: null }, data: { cin: place.cin } });
      }
      record({ sourceRef: place.sourceRef, name: place.name, action: "MERGED", reason: duplicate.reason, propertyId: duplicate.id });
      continue;
    }

    if (opts.dryRun) {
      record({ sourceRef: place.sourceRef, name: place.name, action: "CREATED" });
      continue;
    }

    const localityId = await resolveLocality(prisma, region, place, localityCache);
    const created = await prisma.property.create({
      data: {
        name: place.name,
        categoryId: catId,
        status: "PENDING_VERIFICATION",
        source: place.source,
        sourceRef: place.sourceRef,
        cin: place.cin ?? null,
        doorNumber: place.doorNumber?.slice(0, 40) || null,
        street: place.street?.slice(0, 200) || null,
        localityId,
        district: region.district,
        state: region.state,
        pincode: place.pincode ?? "",
        website: place.website ?? null,
        submittedById: systemUserId,
      },
      select: { id: true },
    });
    if (place.lat !== null && place.lon !== null) await setLocation(prisma, created.id, place.lat, place.lon);
    record({ sourceRef: place.sourceRef, name: place.name, action: "CREATED", propertyId: created.id });
  }

  if (!opts.dryRun) {
    for (let i = 0; i < records.length; i += 1000) {
      await prisma.importRecord.createMany({ data: records.slice(i, i + 1000).map((r) => ({ ...r, jobId })) });
    }
  }
  return counts;
}

async function setLocation(prisma: PrismaClient, id: string, lat: number, lon: number) {
  await prisma.$executeRaw`
    UPDATE properties SET location = ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography WHERE id = ${id}::uuid`;
}

async function findDuplicate(prisma: PrismaClient, place: PlaceCandidate & { district: string }): Promise<{ id: string; reason: string } | null> {
  if (place.cin) {
    const byCin = await prisma.property.findUnique({ where: { cin: place.cin }, select: { id: true } });
    if (byCin) return { id: byCin.id, reason: "same CIN" };
  }

  if (place.lat !== null && place.lon !== null) {
    const rows = await prisma.$queryRaw<{ id: string; name: string; sim: number; dist: number }[]>`
      SELECT id, name, similarity(lower(name), lower(${place.name})) AS sim,
             ST_Distance(location, ST_SetSRID(ST_MakePoint(${place.lon}, ${place.lat}), 4326)::geography) AS dist
      FROM properties
      WHERE status NOT IN ('REJECTED', 'MERGED')
        AND location IS NOT NULL
        AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(${place.lon}, ${place.lat}), 4326)::geography, ${DUPLICATE_RADIUS_M})
        AND similarity(lower(name), lower(${place.name})) >= ${NAME_SIMILARITY}
      ORDER BY sim DESC
      LIMIT 1`;
    if (rows[0]) return { id: rows[0].id, reason: `"${rows[0].name}" ${Math.round(rows[0].dist)} m away` };
    return null;
  }

  // No coordinates: compare names without legal suffixes, so "Demo Labs
  // Private Limited" matches a "Demo Labs" listing already in the city.
  const bare = bareName(place.name);
  const rows = await prisma.$queryRaw<{ id: string; name: string; samePin: boolean; sim: number }[]>`
    SELECT id, name, pincode = ${place.pincode ?? ""} AS "samePin",
           similarity(lower(regexp_replace(name, ${LEGAL_SUFFIX_SQL}, '', 'i')), ${bare}) AS sim
    FROM properties
    WHERE status NOT IN ('REJECTED', 'MERGED') AND district = ${place.district ?? ""}
      AND similarity(lower(regexp_replace(name, ${LEGAL_SUFFIX_SQL}, '', 'i')), ${bare}) >= ${NAME_SIMILARITY_NO_LOCATION}
    ORDER BY sim DESC
    LIMIT 5`;
  const match = rows.find((r) => (r.samePin && place.pincode) || r.sim >= SAME_CITY_SIMILARITY);
  if (match) return { id: match.id, reason: `"${match.name}" ${match.samePin ? "in the same pincode" : "in the same city"}` };
  return null;
}

const SAME_CITY_SIMILARITY = 0.8;
const LEGAL_SUFFIX = /\s*\b(private limited|pvt\.? ltd\.?|limited|ltd\.?|llp|\(opc\))\s*$/i;
const LEGAL_SUFFIX_SQL = "\\s*\\m(private limited|pvt\\.? ltd\\.?|limited|ltd\\.?|llp|\\(opc\\))\\s*$";
const bareName = (name: string) => name.replace(LEGAL_SUFFIX, "").trim().toLowerCase();

async function resolveLocality(
  prisma: PrismaClient,
  region: ImportRegion,
  place: PlaceCandidate,
  cache: Map<string, string>
): Promise<string> {
  if (place.lat !== null && place.lon !== null) {
    const nearest = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM localities
      WHERE location IS NOT NULL
        AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(${place.lon}, ${place.lat}), 4326)::geography, ${LOCALITY_RADIUS_M})
      ORDER BY location <-> ST_SetSRID(ST_MakePoint(${place.lon}, ${place.lat}), 4326)::geography
      LIMIT 1`;
    if (nearest[0]) return nearest[0].id;
  }

  // No coordinates (MCA): reuse any locality we already have for the pincode.
  if (place.pincode && place.lat === null) {
    const key = `pin:${place.pincode}`;
    if (!cache.has(key)) {
      const byPin = await prisma.locality.findFirst({ where: { pincode: place.pincode, district: region.district }, select: { id: true } });
      if (byPin) cache.set(key, byPin.id);
    }
    if (cache.has(key)) return cache.get(key)!;
  }

  const name = place.localityName?.trim() || region.city;
  const pincode = place.lat === null ? place.pincode ?? "" : "";
  const key = `${name.toLowerCase()}|${pincode}`;
  if (!cache.has(key)) {
    const locality = await prisma.locality.upsert({
      where: { name_district_pincode: { name, district: region.district, pincode } },
      update: {},
      create: { name, district: region.district, state: region.state, pincode },
      select: { id: true },
    });
    cache.set(key, locality.id);
  }
  return cache.get(key)!;
}
