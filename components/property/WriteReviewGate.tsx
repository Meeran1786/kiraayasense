"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PenLine, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { SignInModal } from "@/components/auth/SignInModal";
import { ReviewSubmissionModal } from "@/components/review/ReviewSubmissionModal";
import { brand, brandGradient } from "@/lib/brand";

export function WriteReviewGate({ propertyId, propertyName }: { propertyId: string; propertyName: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [signInOpen, setSignInOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [justSubmittedId, setJustSubmittedId] = useState<string | null>(null);

  // FR-REV-1: submitting a review requires an authenticated account. An
  // unauthenticated click opens the sign-in gate first; only on success does
  // it fall through to the actual review modal — never both at once.
  const handleWriteReviewClick = () => {
    if (user) {
      setReviewOpen(true);
    } else {
      setSignInOpen(true);
    }
  };

  // Google sign-in is a real OAuth redirect (full page navigation), so a
  // click on "Write a review" that triggers sign-in can't just resume in
  // memory afterwards. SignInModal passes `?startReview=1` as part of the
  // OAuth callbackUrl; once the page reloads signed-in, this effect notices
  // the flag, opens the review modal, and strips the flag from the URL.
  useEffect(() => {
    if (user && searchParams.get("startReview") === "1") {
      setReviewOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("startReview");
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const googleCallbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${pathname}?startReview=1`
      : undefined;

  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
    >
      {justSubmittedId ? (
        <div className="flex items-start gap-2 text-sm">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" style={{ color: brand.success }} />
          <div>
            <p className="font-medium text-[var(--ks-text)]">Thanks — your review was submitted.</p>
            <p className="mt-0.5 text-xs text-[var(--ks-text-muted)]">
              It'll appear here once our moderation team verifies your proof (usually within 48 hours).
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold text-[var(--ks-text)]">Stayed here?</p>
          <p className="mt-1 text-xs text-[var(--ks-text-muted)]">
            {user
              ? "Share a verified review — you're signed in as " + user.displayName + "."
              : "Sign in to submit a verified review with proof of your stay."}
          </p>
          <button
            type="button"
            onClick={handleWriteReviewClick}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-slate-950"
            style={{ background: brandGradient }}
          >
            <PenLine size={15} />
            Write a review
          </button>
        </>
      )}

      <SignInModal
        isOpen={signInOpen}
        onClose={() => setSignInOpen(false)}
        reason="Sign in to submit a verified review — this keeps ratings honest and traceable to a real tenancy."
        googleCallbackUrl={googleCallbackUrl}
        onSignedIn={() => {
          setSignInOpen(false);
          setReviewOpen(true);
        }}
      />

      <ReviewSubmissionModal
        propertyId={propertyId}
        propertyName={propertyName}
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onSubmitted={(id) => {
          setReviewOpen(false);
          setJustSubmittedId(id);
        }}
      />
    </div>
  );
}
