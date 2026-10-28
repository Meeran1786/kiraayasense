export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCategoryTree } from "@/lib/db/categories";

/** GET /api/categories — the active category tree, for menus and filters. */
export async function GET() {
  return NextResponse.json({ categories: await getCategoryTree() });
}
