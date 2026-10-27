import { NextRequest, NextResponse } from "next/server";
import { findSimilarBusinesses } from "@/lib/db/similar";

/** GET /api/businesses/similar?name=&pincode= — "is it one of these?" while adding a business. */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const pincode = req.nextUrl.searchParams.get("pincode") ?? "";
  return NextResponse.json({ businesses: await findSimilarBusinesses(name.slice(0, 120), pincode) });
}
