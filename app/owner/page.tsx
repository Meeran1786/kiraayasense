import Link from "next/link";
import { getServerSession } from "next-auth";
import { BadgeCheck, Building2, Clock, MessageSquareReply, PlusCircle, Search, XCircle } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { managedProperties } from "@/lib/owner";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { Footer } from "@/components/layout/Footer";
import { brand } from "@/lib/brand";

export const metadata = { title: "Your businesses — KiraayaSense", robots: { index: false } };

/** Free owner tools: every business the signed-in user manages, with what needs a reply. */
export default async function OwnerHomePage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const properties = userId ? await managedProperties(userId) : [];
  // Claims still waiting on a moderator, or turned down in the last 30 days, so the owner knows where they stand.
  const claims = userId
    ? await prisma.businessClaim.findMany({
        where: {
          userId,
          OR: [{ status: "PENDING" }, { status: "REJECTED", reviewedAt: { gte: new Date(Date.now() - 30 * 86400000) } }],
        },
        include: { property: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];
  const ids = properties.map((p) => p.id);
  const [reviewCounts, unanswered] = ids.length
    ? await Promise.all([
        prisma.review.groupBy({ by: ["propertyId"], where: { propertyId: { in: ids }, status: "APPROVED" }, _count: true }),
        prisma.review.groupBy({
          by: ["propertyId"],
          where: { propertyId: { in: ids }, status: "APPROVED", ownerResponse: null },
          _count: true,
        }),
      ])
    : [[], []];
  const countOf = (rows: { propertyId: string; _count: number }[], id: string) => rows.find((r) => r.propertyId === id)?._count ?? 0;

  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        {!userId ? (
          <SignInPrompt />
        ) : (
          <>
            <div>
              <h1 className="text-xl font-bold text-[var(--ks-text)]">Your businesses</h1>
              <p className="mt-1 text-sm text-[var(--ks-text-muted)]">
                Free tools for owners and managers: reply to reviews, report fake ones, and invite customers to review you.
                Owners can never edit, hide or delete reviews, which is why people trust them.
              </p>
            </div>

            {claims.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-[var(--ks-text)]">Your claims</h2>
                <ul className="flex flex-col gap-2">
                  {claims.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 rounded-xl border p-3 text-sm"
                      style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
                    >
                      {c.status === "PENDING" ? (
                        <Clock size={16} className="shrink-0" style={{ color: "var(--ks-warn)" }} />
                      ) : (
                        <XCircle size={16} className="shrink-0" style={{ color: "var(--ks-danger)" }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <Link href={`/property/${c.property.id}`} className="block truncate font-semibold text-[var(--ks-text)] hover:underline">
                          {c.property.name}
                        </Link>
                        <p className="text-xs text-[var(--ks-text-faint)]">
                          {c.status === "PENDING"
                            ? "Waiting for a moderator to check your proof. This usually takes a day or two."
                            : `Not approved${c.decisionNote ? `: ${c.decisionNote}` : ""}. You can claim again with clearer proof.`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {properties.length === 0 ? (
              <div className="flex flex-col gap-4 rounded-xl border p-6 text-sm text-[var(--ks-text-muted)]" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
                <div>
                  <p className="font-semibold text-[var(--ks-text)]">Claim your business to unlock the owner tools.</p>
                  <p className="mt-1">
                    Search for it below, open its page and press <em>Claim this listing</em>. Once a moderator confirms you
                    run it, you can reply to reviews, invite customers and show your rating badge from here.
                  </p>
                </div>
                <form action="/search" method="get" className="flex flex-col gap-2 sm:flex-row">
                  <label className="flex flex-1 items-center gap-2 rounded-full border px-3 py-2" style={{ borderColor: "var(--ks-border-strong)", background: "var(--ks-bg-input)" }}>
                    <Search size={15} />
                    <input
                      name="q"
                      required
                      placeholder="Your business name, locality or PIN"
                      className="w-full bg-transparent text-sm text-[var(--ks-text)] placeholder:text-[var(--ks-text-faint)] focus:outline-none"
                    />
                  </label>
                  <button type="submit" className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: "var(--ks-coral)", color: "var(--ks-bg)" }}>
                    Find my business
                  </button>
                </form>
                <p>
                  Not listed yet?{" "}
                  <Link href="/business/new" className="inline-flex items-center gap-1 font-semibold text-[var(--ks-text)] underline">
                    <PlusCircle size={13} /> Add your business
                  </Link>
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {properties.map((p) => {
                  const pending = countOf(unanswered, p.id);
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/owner/${p.id}`}
                        className="flex items-center gap-4 rounded-xl border p-4 transition-opacity hover:opacity-90"
                        style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
                      >
                        <Building2 size={20} className="shrink-0 text-[var(--ks-text-muted)]" />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 truncate font-semibold text-[var(--ks-text)]">
                            {p.name} <BadgeCheck size={14} style={{ color: "var(--ks-success)" }} />
                          </p>
                          <p className="text-xs text-[var(--ks-text-faint)]">
                            {p.category.name} · {p.locality.name}, {p.district} · {countOf(reviewCounts, p.id)} reviews
                          </p>
                        </div>
                        {pending > 0 && (
                          <span className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "var(--ks-bg-elevated-2)", color: "var(--ks-coral)" }}>
                            <MessageSquareReply size={12} /> {pending} to reply
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}
