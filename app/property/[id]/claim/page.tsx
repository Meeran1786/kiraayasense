import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClaimForm } from "@/components/property/ClaimForm";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { Footer } from "@/components/layout/Footer";
import { brand } from "@/lib/brand";

export const metadata = { title: "Claim this listing — KiraayaSense" };

export default async function ClaimPage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const property = await prisma.property.findFirst({
    where: { id: params.id, status: "APPROVED" },
    include: { locality: true },
  });
  if (!property) notFound();
  const session = await getServerSession(authOptions);

  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div>
          <Link href={`/property/${property.id}`} className="text-xs text-[var(--ks-text-muted)] hover:underline">
            ← {property.name}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-[var(--ks-text)]">Claim {property.name}</h1>
          <p className="mt-1 text-sm text-[var(--ks-text-muted)]">
            {property.locality.name}, {property.district}
          </p>
        </div>
        {property.claimStatus === "VERIFIED" ? (
          <p className="text-sm text-[var(--ks-text-muted)]">
            This listing already has a verified owner. If you believe that is wrong, contact our Grievance Officer.
          </p>
        ) : session?.user?.id ? (
          <ClaimForm propertyId={property.id} propertyName={property.name} />
        ) : (
          <SignInPrompt text="Sign in to claim this listing." callbackUrl={`/property/${property.id}/claim`} />
        )}
      </div>
      <Footer />
    </main>
  );
}
