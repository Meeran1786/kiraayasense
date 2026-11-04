import "server-only";
import { prisma } from "@/lib/prisma";

export interface LocationOption {
  value: string;
  label: string;
  count: number;
}

export interface LocationOptions {
  states: LocationOption[];
  cities: LocationOption[];
  localities: LocationOption[];
}

/**
 * Choices for the State → City → Locality filter, each with how many live
 * listings it has. Cities are the listing's district; localities are only
 * loaded once a city is picked.
 */
export async function locationOptions(state?: string, city?: string): Promise<LocationOptions> {
  const live = { status: "APPROVED" as const };

  const [states, cities, localityCounts] = await Promise.all([
    prisma.property.groupBy({ by: ["state"], where: live, _count: { _all: true }, orderBy: { state: "asc" } }),
    state
      ? prisma.property.groupBy({ by: ["district"], where: { ...live, state }, _count: { _all: true }, orderBy: { district: "asc" } })
      : Promise.resolve([]),
    state && city
      ? prisma.property.groupBy({ by: ["localityId"], where: { ...live, state, district: city }, _count: { _all: true } })
      : Promise.resolve([]),
  ]);

  const names = localityCounts.length
    ? new Map(
        (
          await prisma.locality.findMany({
            where: { id: { in: localityCounts.map((l) => l.localityId) } },
            select: { id: true, name: true },
          })
        ).map((l) => [l.id, l.name])
      )
    : new Map<string, string>();

  return {
    states: states.filter((s) => s.state).map((s) => ({ value: s.state, label: s.state, count: s._count._all })),
    cities: cities.filter((c) => c.district).map((c) => ({ value: c.district, label: c.district, count: c._count._all })),
    localities: localityCounts
      .filter((l) => names.has(l.localityId))
      .map((l) => ({ value: l.localityId, label: names.get(l.localityId)!, count: l._count._all }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

/** Ids of live listings within `km` of a point, nearest first (PostGIS). */
export async function nearbyPropertyIds(lat: number, lng: number, km: number, limit = 2000): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id FROM properties
    WHERE status = 'APPROVED' AND location IS NOT NULL
      AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${km * 1000})
    ORDER BY location <-> ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    LIMIT ${limit}`;
  return rows.map((r) => r.id);
}
