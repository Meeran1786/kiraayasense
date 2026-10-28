import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t px-4 py-8 sm:px-6" style={{ borderColor: "var(--ks-border-soft)" }}>
      <div className="mx-auto max-w-6xl text-center text-[11px] leading-relaxed" style={{ color: "var(--ks-text-faint)" }}>
        <p>
          Reviews on KiraayaSense are user-generated content submitted by customers, tenants, employees and others,
          and are not independently verified by KiraayaSense beyond the proof checks described in our moderation
          policy. If you believe a review about your business is inaccurate or defamatory, contact our Grievance
          Officer for a takedown review.
        </p>
        <p className="mt-2">
          © 2026 KiraayaSense ·{" "}
          <Link href="/privacy" className="underline">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="underline">
            Terms
          </Link>
        </p>
      </div>
    </footer>
  );
}
