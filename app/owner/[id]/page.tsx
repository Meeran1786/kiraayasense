import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getPropertyById } from "@/lib/db/properties";
import { managesProperty, repliesForProperty } from "@/lib/owner";
import { ReviewList } from "@/components/property/ReviewList";
import { CategoryBreakdown } from "@/components/property/CategoryBreakdown";
import { RatingBadge } from "@/components/property/RatingBadge";
import { ReplyBox } from "@/components/owner/ReplyBox";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { Footer } from "@/components/layout/Footer";
import { brand } from "@/lib/brand";

export const metadata = { title: "Manage your business — KiraayaSense", robots: { index: false } };

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
      <p className="text-2xl font-bold text-[var(--ks-text)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--ks-text-muted)]">{label}</p>
    </div>
  );
}

export default async function OwnerBusinessPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return (
      <main style={{ background: brand.navy, minHeight: "100vh" }}>
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <SignInPrompt />
        </div>
      </main>
    );
  }
  if (!/^[0-9a-f-]{36}$/i.test(params.id) || !(await managesProperty(session.user.id, params.id))) notFound();
  const property = await getPropertyById(params.id);
  if (!property) notFound();
  const replies = await repliesForProperty(property.id);

  const allReviews = property.reviews.length;
  const replied = property.reviews.filter((r) => replies.get(r.id)?.status === "APPROVED").length;
  const waiting = property.reviews.filter((r) => !replies.has(r.id)).length;

  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div>
          <Link href="/owner" className="flex items-center gap-1 text-xs text-[var(--ks-text-muted)] hover:underline">
            <ArrowLeft size={12} /> Your businesses
          </Link>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-[var(--ks-text)]">{property.name}</h1>
              <p className="text-sm text-[var(--ks-text-muted)]">
                {property.categoryName} · {property.locality}, {property.district}
              </p>
              <Link href={`/property/${property.id}`} className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--ks-text-muted)] underline">
                See your public page <ExternalLink size={11} />
              </Link>
            </div>
            <RatingBadge rating={property.overallRating} size="lg" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={property.approvedReviewCount} label="Reviewers" />
          <Stat value={property.verifiedProofCount} label="With verified proof" />
          <Stat value={allReviews ? `${Math.round((replied / allReviews) * 100)}%` : "—"} label="Reviews with your reply" />
          <Stat value={waiting} label="Waiting for a reply" />
        </div>

        {property.metrics.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-[var(--ks-text)]">What customers rate you on</h2>
            <CategoryBreakdown metrics={property.metrics} />
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold text-[var(--ks-text)]">Reviews</h2>
          <p className="mb-3 mt-1 text-xs text-[var(--ks-text-muted)]">
            Reply to every review, good or bad: people read replies before they choose. If a review breaks the rules
            (fake, abusive, or shares personal details), press Report and a moderator will check it.
          </p>
          <ReviewList
            reviews={property.reviews}
            renderOwnerTools={(review) => {
              const reply = replies.get(review.id);
              return (
                <ReplyBox
                  reviewId={review.id}
                  initial={reply ? { text: reply.text, status: reply.status, rejectionReason: reply.rejectionReason } : null}
                />
              );
            }}
          />
        </section>
      </div>
      <Footer />
    </main>
  );
}
