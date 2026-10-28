import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ClaimDecision } from "./ClaimDecision";

export default async function AdminClaimsPage() {
  const claims = await prisma.businessClaim.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { property: { include: { locality: true } }, user: true },
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--ks-text)]">Owner claims</h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--ks-text-muted)]">
        Call the number, check the proof, and approve only when you are confident the person runs the business. An
        approved owner can correct the listing and reply to reviews, but never remove reviews.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {claims.length === 0 && <p className="text-sm text-[var(--ks-text-faint)]">No claims waiting.</p>}
        {claims.map((c) => (
          <article key={c.id} className="rounded-xl border p-4" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={`/admin/properties/${c.property.id}`} className="font-semibold text-[var(--ks-text)] hover:underline">
                {c.property.name}
              </Link>
              <span className="text-xs text-[var(--ks-text-faint)]">
                {c.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
            <p className="text-xs text-[var(--ks-text-faint)]">
              {c.property.locality.name}, {c.property.district} · listing from {c.property.source}
            </p>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <Row label="Claimant" value={`${c.user.displayName} (${c.user.primaryEmail ?? "no email"})`} />
              <Row label="Role" value={c.claimantRole} />
              <Row label="Phone" value={c.contactPhone} />
              <Row label="Work email" value={c.workEmail ?? "—"} />
            </dl>
            {c.message && <p className="mt-2 text-sm text-[var(--ks-text-muted)]">“{c.message}”</p>}
            <p className="mt-2 text-sm">
              {c.proofStorageKey ? (
                <a href={`/api/admin/files?key=${encodeURIComponent(c.proofStorageKey)}`} target="_blank" rel="noreferrer" className="underline text-[var(--ks-text)]">
                  Open proof (viewing is logged)
                </a>
              ) : (
                <span className="text-[var(--ks-text-faint)]">No proof attached — verify by phone.</span>
              )}
            </p>
            <ClaimDecision claimId={c.id} />
          </article>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-[var(--ks-text-faint)]">{label}:</dt>
      <dd className="text-[var(--ks-text)]">{value}</dd>
    </div>
  );
}
