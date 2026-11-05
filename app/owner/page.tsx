import Link from "next/link";
import { getServerSession } from "next-auth";
import { BadgeCheck, Building2, MessageSquareReply } from "lucide-react";
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

            {properties.length === 0 ? (
              <div className="rounded-xl border p-6 text-sm text-[var(--ks-text-muted)]" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
                <p className="font-semibold text-[var(--ks-text)]">You don't manage a business here yet.</p>
                <p className="mt-1">
                  Find your business with{" "}
                  <Link href="/search" className="underline">
                    search
                  </Link>{" "}
                  and press <em>Claim this listing</em> on its page. Once a moderator confirms you run it, it appears here.
                  Not listed yet?{" "}
                  <Link href="/business/new" className="underline">
                    Add it
                  </Link>
                  .
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
