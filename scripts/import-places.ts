/**
 * Seeds business listings from open data for one region.
 *
 *   npm run import:places -- --source osm --region bengaluru
 *   npm run import:places -- --source osm --region bengaluru --file overpass.json
 *   npm run import:places -- --source overture --region bengaluru --file places.ndjson
 *   npm run import:places -- --source mca --region bengaluru --file Karnataka.csv
 *
 * Add --dry-run to see the counts without writing anything. New listings
 * stay hidden until a moderator publishes the batch at /admin/imports.
 * RUNBOOK.md section 6 explains each source.
 */
import { readFileSync } from "node:fs";
import { PrismaClient, type DataSource } from "@prisma/client";
import { getRegion, REGIONS } from "../lib/import/regions";
import { buildOverpassQuery, fetchOverpass, parseOsm, type OsmElement } from "../lib/import/sources/osm";
import { readOverture } from "../lib/import/sources/overture";
import { readMca } from "../lib/import/sources/mca";
import { importPlaces, upsertLocalities } from "../lib/import/upsert";
import type { LocalityCandidate, PlaceCandidate } from "../lib/import/types";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const SOURCES: Record<string, DataSource> = { osm: "OSM", overture: "OVERTURE", mca: "MCA" };

async function main() {
  const sourceArg = arg("source");
  const regionArg = arg("region");
  const file = arg("file");
  const dryRun = process.argv.includes("--dry-run");
  const limit = arg("limit") ? Number(arg("limit")) : undefined;

  if (!sourceArg || !SOURCES[sourceArg] || !regionArg) {
    console.error(`Usage: --source osm|overture|mca --region ${REGIONS.map((r) => r.key).join("|")} [--file path] [--limit n] [--dry-run]`);
    process.exit(1);
  }
  if (sourceArg !== "osm" && !file) {
    console.error(`--file is required for ${sourceArg}. See RUNBOOK.md section 6.`);
    process.exit(1);
  }

  const region = getRegion(regionArg);
  const source = SOURCES[sourceArg];
  const prisma = new PrismaClient();
  const log = (m: string) => console.log(m);

  let places: PlaceCandidate[] = [];
  let localities: LocalityCandidate[] = [];

  log(`Reading ${sourceArg} for ${region.city}${dryRun ? " (dry run)" : ""}…`);
  if (sourceArg === "osm") {
    const elements: OsmElement[] = file
      ? (JSON.parse(readFileSync(file, "utf8")) as { elements: OsmElement[] }).elements
      : await fetchOverpass(buildOverpassQuery(region));
    const parsed = parseOsm(elements, region);
    places = parsed.places;
    localities = parsed.localities;
    log(`  ${places.length} businesses, ${localities.length} neighbourhoods, ${parsed.unmapped} skipped (no name or category)`);
  } else if (sourceArg === "overture") {
    const parsed = await readOverture(file!, region);
    places = parsed.places;
    log(`  ${places.length} businesses, ${parsed.lowConfidence} below confidence threshold`);
    const top = [...parsed.unmapped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
    if (top.length) log(`  Most common unmapped categories: ${top.map(([c, n]) => `${c} (${n})`).join(", ")}`);
  } else {
    const parsed = await readMca(file!, region);
    places = parsed.places;
    log(`  ${places.length} companies in ${region.city}, ${parsed.unmapped} outside mapped industries, ${parsed.inactive} not active`);
  }
  if (limit) places = places.slice(0, limit);

  const job = dryRun
    ? null
    : await prisma.importJob.create({ data: { source, area: region.key } });

  try {
    if (localities.length) {
      const n = await upsertLocalities(prisma, region, localities, { dryRun });
      log(`  ${n} neighbourhood centroids ${dryRun ? "to save" : "saved"}`);
    }
    const counts = await importPlaces(prisma, job?.id ?? "", region, places, { dryRun, log });
    if (job) {
      await prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          finishedAt: new Date(),
          created: counts.CREATED,
          updated: counts.UPDATED,
          merged: counts.MERGED,
          skipped: counts.SKIPPED,
        },
      });
    }
    log(`Done: ${counts.CREATED} new, ${counts.UPDATED} refreshed, ${counts.MERGED} matched existing listings, ${counts.SKIPPED} skipped.`);
    if (job && counts.CREATED) log(`Review and publish the new listings at /admin/imports/${job.id}`);
  } catch (err) {
    if (job) {
      await prisma.importJob.update({
        where: { id: job.id },
        data: { status: "FAILED", finishedAt: new Date(), error: String(err).slice(0, 1000) },
      });
    }
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
