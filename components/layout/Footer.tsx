export function Footer() {
  return (
    <footer className="border-t px-4 py-8 sm:px-6" style={{ borderColor: "var(--ks-border-soft)" }}>
      <div className="mx-auto max-w-6xl text-center text-[11px] leading-relaxed" style={{ color: "var(--ks-text-faint)" }}>
        <p>
          Reviews on KiraayaSense are user-generated content submitted by tenants and are not independently
          verified by KiraayaSense beyond the proof-of-stay checks described in our moderation policy. If you
          believe a review about your property is inaccurate or defamatory, contact our Grievance Officer for a
          takedown review.
        </p>
        <p className="mt-2">© 2026 KiraayaSense · www.kiraayasense.com</p>
      </div>
    </footer>
  );
}
