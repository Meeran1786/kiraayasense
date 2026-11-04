/**
 * Downloads Overture Maps places for one or more cities and, with --import,
 * imports them straight away. Needs the DuckDB CLI (RUNBOOK.md section 6).
 *
 *   npm run overture -- --region metros --import --publish
 *   npm run overture -- --region pune,jaipur --import
 *   npm run overture -- --region mumbai              # extract only
 *
 * Files go to ~/overture/<region>.ndjson. The latest Overture release is
 * found automatically; pass --release 2026-10-22.0 to pin one.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { REGIONS, type ImportRegion } from "../lib/import/regions";

const METROS = ["mumbai", "delhi", "bengaluru", "hyderabad", "chennai", "kolkata", "pune", "ahmedabad"];
const BUCKET = "https://overturemaps-us-west-2.s3.amazonaws.com";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function latestRelease(): Promise<string> {
  const res = await fetch(`${BUCKET}/?list-type=2&prefix=release/&delimiter=/`);
  if (!res.ok) throw new Error(`Couldn't list Overture releases (HTTP ${res.status})`);
  const xml = await res.text();
  const releases = Array.from(xml.matchAll(/<Prefix>release\/([^/<]+)\/<\/Prefix>/g)).map((m) => m[1]);
  if (releases.length === 0) throw new Error("No Overture releases found");
  return releases.sort().at(-1)!;
}

function extractSql(region: ImportRegion, release: string, out: string): string {
  const [south, west, north, east] = region.bbox;
  // Places are points, so the bbox centre is the location; this avoids
  // needing DuckDB's spatial extension.
  return `
INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2'; SET memory_limit='1GB'; SET threads=2;
COPY (
  SELECT id, names.primary AS name, taxonomy.primary AS category, confidence,
         (bbox.xmin + bbox.xmax) / 2 AS lon, (bbox.ymin + bbox.ymax) / 2 AS lat,
         addresses[1].freeform AS freeform, addresses[1].locality AS locality,
         addresses[1].postcode AS postcode, websites[1] AS website
  FROM read_parquet('s3://overturemaps-us-west-2/release/${release}/theme=places/type=place/*', hive_partitioning=1)
  WHERE bbox.xmin BETWEEN ${west} AND ${east} AND bbox.ymin BETWEEN ${south} AND ${north}
    AND (operating_status IS NULL OR operating_status = 'open')
) TO '${out}' (FORMAT JSON);`;
}

async function main() {
  const regionArg = arg("region");
  if (!regionArg) {
    console.error(`Usage: --region metros|<key>[,<key>…] [--import] [--publish] [--release <id>]\nRegions: ${REGIONS.map((r) => r.key).join(", ")}`);
    process.exit(1);
  }
  const keys = regionArg === "metros" ? METROS : regionArg.split(",").map((k) => k.trim());
  const regions = keys.map((k) => REGIONS.find((r) => r.key === k) ?? (console.error(`Unknown region: ${k}`), process.exit(1)));

  try {
    execFileSync("duckdb", ["--version"], { stdio: "ignore" });
  } catch {
    console.error("DuckDB isn't installed. See RUNBOOK.md section 6 for the one-line install.");
    process.exit(1);
  }

  const release = arg("release") ?? (await latestRelease());
  const dir = join(homedir(), "overture");
  mkdirSync(dir, { recursive: true });
  console.log(`Overture release ${release}; files in ${dir}`);

  const failed: string[] = [];
  for (const region of regions) {
    const out = join(dir, `${region.key}.ndjson`);
    console.log(`\n==> ${region.city}: downloading places`);
    const started = Date.now();
    const dl = spawnSync("duckdb", ["-c", extractSql(region, release, out)], { stdio: "inherit" });
    if (dl.status !== 0 || !existsSync(out)) {
      console.error(`${region.city}: download failed`);
      failed.push(region.key);
      continue;
    }
    console.log(`${region.city}: ${(statSync(out).size / 1e6).toFixed(1)} MB in ${Math.round((Date.now() - started) / 1000)} s`);

    if (process.argv.includes("--import")) {
      const args = ["tsx", "scripts/import-places.ts", "--source", "overture", "--region", region.key, "--file", out];
      if (process.argv.includes("--publish")) args.push("--publish");
      const imp = spawnSync("npx", args, { stdio: "inherit" });
      if (imp.status !== 0) failed.push(region.key);
    }
  }

  if (failed.length) {
    console.error(`\nFailed: ${failed.join(",")}. Re-run with --region ${failed.join(",")}`);
    process.exit(1);
  }
  console.log("\nFINISHED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
