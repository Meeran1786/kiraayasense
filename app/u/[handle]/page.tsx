import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicProfile } from "@/lib/db/users";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileReviewList } from "@/components/profile/ProfileReviewList";
import { Footer } from "@/components/layout/Footer";
import { brand } from "@/lib/brand";

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  const profile = await getPublicProfile(params.handle);
  return { title: profile ? `${profile.displayName} (@${profile.handle}) — KiraayaSense` : "Reviewer not found" };
}

export default async function PublicProfilePage({ params }: { params: { handle: string } }) {
  const profile = await getPublicProfile(params.handle);
  if (!profile) notFound();

  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
        <ProfileHeader profile={profile} />
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--ks-text)]">Reviews</h2>
          <ProfileReviewList reviews={profile.reviews} />
          <p className="mt-3 text-[11px] text-[var(--ks-text-faint)]">
            Reviews posted anonymously are not listed here.
          </p>
        </section>
      </div>
      <Footer />
    </main>
  );
}
