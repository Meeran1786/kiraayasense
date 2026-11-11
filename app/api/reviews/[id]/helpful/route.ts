import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setHelpful } from "@/lib/rewards";
import { onHelpfulVote } from "@/lib/notify/events";

/** POST marks a review helpful, DELETE takes the mark back. Signed-in users only, never on their own review. */
async function handle(req: NextRequest, reviewId: string, helpful: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to mark reviews helpful" } }, { status: 401 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(reviewId)) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Review not found" } }, { status: 404 });
  }
  const result = await setHelpful(reviewId, session.user.id, helpful);
  if (!result.ok) {
    return NextResponse.json({ error: { code: result.code, message: result.message } }, { status: result.status });
  }
  if (result.created) onHelpfulVote(reviewId);
  return NextResponse.json({ helpful: result.helpful, count: result.count });
}

export const POST = (req: NextRequest, { params }: { params: { id: string } }) => handle(req, params.id, true);
export const DELETE = (req: NextRequest, { params }: { params: { id: string } }) => handle(req, params.id, false);
