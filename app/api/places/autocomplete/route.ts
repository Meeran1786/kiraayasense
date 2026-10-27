import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/places/autocomplete?q= — Google Places fallback for the "add a
 * business" form, used only when GOOGLE_PLACES_API_KEY is set. Google's
 * terms allow storing only the place ID, so that is all we keep; the
 * reviewer still types the listing's details themselves.
 *
 * Billed per request: signed-in users only, and the client debounces.
 */
export async function GET(req: NextRequest) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ enabled: false, suggestions: [] });

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ enabled: true, suggestions: [] }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 3) return NextResponse.json({ enabled: true, suggestions: [] });

  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
    body: JSON.stringify({ input: q, includedRegionCodes: ["in"], sessionToken: req.nextUrl.searchParams.get("session") ?? undefined }),
  });
  if (!res.ok) return NextResponse.json({ enabled: true, suggestions: [] }, { status: 502 });

  const body = (await res.json()) as {
    suggestions?: { placePrediction?: { placeId: string; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } }[];
  };
  const suggestions = (body.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({
      placeId: p.placeId,
      main: p.structuredFormat?.mainText?.text ?? "",
      secondary: p.structuredFormat?.secondaryText?.text ?? "",
    }));
  return NextResponse.json({ enabled: true, suggestions });
}
