import "server-only";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { notifyAdmins, notifyUsers } from "./index";

/**
 * The events that send alerts, one function each, called from the API routes
 * after their change is saved. They look up what the message needs, then hand
 * off to notifyAdmins / notifyUsers, which never throw and never block the
 * request. Message wording lives here; WhatsApp template names and their
 * parameter order must match deploy/WHATSAPP_TEMPLATES.md.
 */

const abs = (path: string) => `${SITE_URL}${path}`;
const later = (label: string, work: () => Promise<void>) => void work().catch((e) => console.error(`[notify:${label}]`, e));

async function reviewContext(reviewId: string) {
  return prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      userId: true,
      isAnonymous: true,
      rejectionReason: true,
      user: { select: { displayName: true } },
      answers: { select: { starValue: true } },
      property: { select: { id: true, name: true, claimStatus: true, claimedByUserId: true, locality: { select: { name: true } } } },
    },
  });
}

function stars(answers: { starValue: number | null }[]): string {
  const vals = answers.map((a) => a.starValue).filter((v): v is number => typeof v === "number");
  if (!vals.length) return "";
  return (Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10).toString();
}

/** A reviewer submitted a review; it waits for moderation. The person who did the action is never alerted about it. */
export function onReviewSubmitted(reviewId: string) {
  later("review-submitted", async () => {
    const r = await reviewContext(reviewId);
    if (!r) return;
    const summary = `New review of ${r.property.name} (${r.property.locality.name}) by ${r.user.displayName} is waiting for moderation`;
    notifyAdmins({
      type: "ADMIN_NEW_REVIEW",
      title: `New review: ${r.property.name}`,
      body: `${summary}.`,
      link: "/admin/reviews",
      whatsapp: { name: "ks_admin_alert", params: [summary, abs("/admin/reviews")] },
    }, r.userId);
  });
}

/** A user added a business that wasn't listed. */
export function onBusinessAdded(propertyId: string) {
  later("business-added", async () => {
    const p = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { name: true, district: true, submittedById: true, submittedBy: { select: { displayName: true } }, category: { select: { name: true } } },
    });
    if (!p) return;
    const summary = `${p.submittedBy.displayName} added ${p.name} (${p.category.name}, ${p.district})`;
    notifyAdmins({
      type: "ADMIN_NEW_BUSINESS",
      title: `Business added: ${p.name}`,
      body: `${summary}.`,
      link: `/admin/properties/${propertyId}`,
      whatsapp: { name: "ks_admin_alert", params: [summary, abs(`/admin/properties/${propertyId}`)] },
    }, p.submittedById);
  });
}

/** Someone asked to manage a listing. */
export function onClaimSubmitted(claimId: string) {
  later("claim-submitted", async () => {
    const c = await prisma.businessClaim.findUnique({
      where: { id: claimId },
      select: { userId: true, user: { select: { displayName: true } }, property: { select: { name: true } } },
    });
    if (!c) return;
    const summary = `${c.user.displayName} wants to manage ${c.property.name}`;
    notifyAdmins({
      type: "ADMIN_NEW_CLAIM",
      title: `Ownership claim: ${c.property.name}`,
      body: `${summary}. Check their proof and decide.`,
      link: "/admin/claims",
      whatsapp: { name: "ks_admin_alert", params: [summary, abs("/admin/claims")] },
    }, c.userId);
  });
}

/** A review was reported; `hidden` when that report took it over the auto-hide threshold. */
export function onReviewReported(reviewId: string, hidden: boolean, reporterId: string) {
  later("review-reported", async () => {
    const r = await reviewContext(reviewId);
    if (!r) return;
    const summary = hidden
      ? `A review of ${r.property.name} was reported several times and is now hidden until you decide`
      : `A review of ${r.property.name} was reported`;
    notifyAdmins({
      type: "ADMIN_NEW_REPORT",
      title: hidden ? `Urgent: review hidden after reports (${r.property.name})` : `Review reported: ${r.property.name}`,
      body: `${summary}.`,
      link: "/admin/reports",
      urgent: hidden,
      whatsapp: { name: "ks_admin_alert", params: [summary, abs("/admin/reports")] },
    }, reporterId);
  });
}

/** An owner wrote or edited a reply; it waits for a check. */
export function onOwnerReplySubmitted(reviewId: string, responderId: string) {
  later("owner-reply", async () => {
    const r = await reviewContext(reviewId);
    if (!r) return;
    const summary = `The owner of ${r.property.name} replied to a review; the reply needs a check before it shows`;
    notifyAdmins({
      type: "ADMIN_NEW_REPLY",
      title: `Owner reply to check: ${r.property.name}`,
      body: `${summary}.`,
      link: "/admin/replies",
      whatsapp: { name: "ks_admin_alert", params: [summary, abs("/admin/replies")] },
    }, responderId);
  });
}

/** A moderator approved or rejected a review: tell the reviewer, and on approval the verified owner. */
export function onReviewDecided(reviewId: string, approved: boolean) {
  later("review-decided", async () => {
    const r = await reviewContext(reviewId);
    if (!r) return;
    const link = `/property/${r.property.id}`;
    if (approved) {
      notifyUsers([r.userId], {
        type: "REVIEW_APPROVED",
        title: `Your review of ${r.property.name} is live`,
        body: `Thanks for helping others. Your review of ${r.property.name} is now public on KiraayaSense.`,
        link,
        whatsapp: { name: "ks_review_live", params: [r.property.name, abs(link)] },
      });
      const ownerId = r.property.claimStatus === "VERIFIED" ? r.property.claimedByUserId : null;
      if (ownerId && ownerId !== r.userId) {
        const s = stars(r.answers);
        notifyUsers([ownerId], {
          type: "OWNER_NEW_REVIEW",
          title: `New ${s ? `${s}★ ` : ""}review on ${r.property.name}`,
          body: `${r.isAnonymous ? "A customer" : r.user.displayName} reviewed ${r.property.name}${s ? ` (${s} out of 5)` : ""}. Read it and reply from your dashboard.`,
          link: `/owner/${r.property.id}`,
          whatsapp: { name: "ks_owner_new_review", params: [s || "new", r.property.name, abs(`/owner/${r.property.id}`)] },
        });
      }
    } else {
      notifyUsers([r.userId], {
        type: "REVIEW_APPROVED",
        title: `Your review of ${r.property.name} wasn't approved`,
        body: `A moderator didn't approve your review of ${r.property.name}.${r.rejectionReason ? ` Reason: ${r.rejectionReason}` : ""} You can write it again with the changes.`,
        link,
        whatsapp: { name: "ks_review_not_approved", params: [r.property.name, r.rejectionReason ?? "-", abs(link)] },
      });
    }
  });
}

/** Someone marked a review helpful. Bell at once; email and WhatsApp in the 9 AM digest. */
export function onHelpfulVote(reviewId: string) {
  later("helpful", async () => {
    const r = await reviewContext(reviewId);
    if (!r) return;
    const link = `/property/${r.property.id}`;
    // One bell entry per review per day, so unmarking and marking again can't flood anyone.
    const recent = await prisma.notification.findFirst({
      where: { userId: r.userId, type: "HELPFUL", link, readAt: null, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      select: { id: true },
    });
    if (recent) {
      await prisma.notification.update({
        where: { id: recent.id },
        data: { title: "More people found your review helpful", createdAt: new Date() },
      });
      return;
    }
    notifyUsers([r.userId], {
      type: "HELPFUL",
      title: "Someone found your review helpful",
      body: `Your review of ${r.property.name} was marked helpful.`,
      link,
    });
  });
}

/** A moderator approved or rejected an ownership claim. */
export function onClaimDecided(claimId: string, approved: boolean) {
  later("claim-decided", async () => {
    const c = await prisma.businessClaim.findUnique({
      where: { id: claimId },
      select: { userId: true, decisionNote: true, property: { select: { id: true, name: true } } },
    });
    if (!c) return;
    const link = approved ? `/owner/${c.property.id}` : `/property/${c.property.id}`;
    notifyUsers([c.userId], {
      type: "CLAIM_DECIDED",
      title: approved ? `You now manage ${c.property.name}` : `Your claim for ${c.property.name} wasn't approved`,
      body: approved
        ? `Your claim was approved. Reply to reviews and invite customers from your dashboard.`
        : `Your claim for ${c.property.name} wasn't approved.${c.decisionNote ? ` Note: ${c.decisionNote}` : ""}`,
      link,
      whatsapp: { name: "ks_claim_decided", params: [c.property.name, approved ? "approved" : "not approved", abs(link)] },
    });
  });
}
