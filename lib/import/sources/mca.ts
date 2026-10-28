import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type { ImportRegion } from "../regions";
import type { PlaceCandidate } from "../types";

/**
 * MCA company master data from data.gov.in (Government Open Data Licence –
 * India, attribution required). One CSV per state. It has every registered
 * company with its CIN and registered office address, but no coordinates,
 * so these listings are matched by pincode rather than distance.
 *
 * The industry comes from the NIC code inside the CIN
 * (U<NIC5><STATE2><YEAR4><TYPE3><NUM6>). Companies registered before 2009
 * use NIC-2004 codes, later ones NIC-2008, so the table is keyed by both.
 * Only codes that map cleanly to one sub-category are imported; a moderator
 * still spot-checks every batch before it is published.
 */

const NIC_2004: [string, string][] = [
  ["34100", "automotive-oem"],
  ["343", "automotive-tier-1-supplier"],
  ["353", "aerospace-oem"],
  ["722", "it-ites-it-services"],
  ["723", "it-ites-it-services"],
];
const NIC_2008: [string, string][] = [
  ["2910", "automotive-oem"],
  ["2930", "automotive-tier-1-supplier"],
  ["3030", "aerospace-oem"],
  ["3315", "aerospace-mro"],
  ["620", "it-ites-it-services"],
  ["6311", "it-ites-it-services"],
  ["8220", "it-ites-bpo-call-centre"],
];

const CIN = /^([LU])(\d{5})([A-Z]{2})(\d{4})([A-Z]{3})(\d{6})$/;

export function categoryForCin(cin: string): string | null {
  const m = CIN.exec(cin.trim().toUpperCase());
  if (!m) return null;
  const [, , nic, , year] = m;
  const table = Number(year) < 2009 ? NIC_2004 : NIC_2008;
  return table.find(([prefix]) => nic.startsWith(prefix))?.[1] ?? null;
}

const SMALL = new Set(["and", "of", "the", "for", "in"]);
const KEEP_UPPER = new Set(["IT", "BPO", "KPO", "MRO", "LLP", "OPC", "EV", "HR", "R&D", "(OPC)", "(I)", "AI"]);
/** "ACME AUTO PARTS PRIVATE LIMITED" -> "Acme Auto Parts Private Limited" */
export function titleCase(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => {
      const upper = w.toUpperCase();
      if (KEEP_UPPER.has(upper)) return upper;
      if (i > 0 && SMALL.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

// The last 6-digit number in an address is almost always its pincode.
export function pincodeFromAddress(address: string): string | null {
  const matches = address.match(/\b[1-9]\d{2}\s?\d{3}\b/g);
  return matches ? matches[matches.length - 1].replace(/\s/g, "") : null;
}

/** Minimal RFC 4180 line splitter; quoted fields may contain commas and quotes. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      out.push(field);
      field = "";
    } else field += c;
  }
  out.push(field);
  return out;
}

const unbalanced = (s: string) => (s.match(/"/g)?.length ?? 0) % 2 === 1;

// Column names differ between data.gov.in releases; take the first present.
const COLUMNS = {
  cin: ["CORPORATE_IDENTIFICATION_NUMBER", "CIN"],
  name: ["COMPANY_NAME", "CompanyName"],
  status: ["COMPANY_STATUS", "CompanyStatus"],
  address: ["REGISTERED_OFFICE_ADDRESS", "Registered_Office_Address", "CompanyRegistered_Office_Address"],
};

export async function readMca(
  file: string,
  region: ImportRegion
): Promise<{ places: PlaceCandidate[]; unmapped: number; inactive: number }> {
  const places: PlaceCandidate[] = [];
  let unmapped = 0;
  let inactive = 0;
  let header: string[] | null = null;
  let col: Record<keyof typeof COLUMNS, number> | null = null;
  let pending = "";

  const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const raw of lines) {
    const line = pending ? `${pending}\n${raw}` : raw;
    if (unbalanced(line)) {
      pending = line;
      continue;
    }
    pending = "";
    const cells = splitCsvLine(line.replace(/^﻿/, ""));

    if (!header) {
      header = cells.map((h) => h.trim());
      const find = (names: string[]) => header!.findIndex((h) => names.some((n) => n.toLowerCase() === h.toLowerCase()));
      col = { cin: find(COLUMNS.cin), name: find(COLUMNS.name), status: find(COLUMNS.status), address: find(COLUMNS.address) };
      if (col.cin < 0 || col.name < 0 || col.address < 0) {
        throw new Error(`Unrecognised MCA CSV header: ${header.join(", ")}`);
      }
      continue;
    }

    const cin = cells[col!.cin]?.trim().toUpperCase();
    const status = col!.status >= 0 ? cells[col!.status]?.trim().toLowerCase() : "active";
    if (!cin) continue;
    if (status && status !== "active") {
      inactive++;
      continue;
    }
    const pincode = pincodeFromAddress(cells[col!.address] ?? "");
    if (!pincode || !region.pincodePrefixes.some((p) => pincode.startsWith(p))) continue;
    const categorySlug = categoryForCin(cin);
    if (!categorySlug) {
      unmapped++;
      continue;
    }
    places.push({
      source: "MCA",
      sourceRef: `mca:${cin}`,
      cin,
      name: titleCase(cells[col!.name].trim()),
      categorySlug,
      lat: null,
      lon: null,
      street: cells[col!.address].replace(/\s+/g, " ").trim().slice(0, 200),
      pincode,
    });
  }
  return { places, unmapped, inactive };
}
