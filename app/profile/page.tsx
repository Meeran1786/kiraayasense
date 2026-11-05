import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOwnProfile } from "@/lib/db/users";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { ProfileReviewList } from "@/components/profile/ProfileReviewList";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { Footer } from "@/components/layout/Footer";
import { brand } from "@/lib/brand";
import { managedProperties } from "@/lib/owner";
import Link from "next/link";

export const metadata = { title: "Your profile — KiraayaSense" };

export default async function OwnProfilePage() {
  const session = await getServerSession(authOptions);
  const profile = session?.user?.id ? await getOwnProfile(session.user.id) : null;
  const managed = session?.user?.id ? await managedProperties(session.user.id) : [];

  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
        {profile ? (
          <>
            <ProfileHeader profile={profile} ownView />
            {managed.length > 0 && (
              <Link
                href="/owner"
                className="rounded-xl border p-4 text-sm transition-opacity hover:opacity-90"
                style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
              >
                <span className="font-semibold text-[var(--ks-text)]">
                  You manage {managed.length === 1 ? managed[0].name : `${managed.length} businesses`}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--ks-text-muted)]">Open your owner tools →</span>
              </Link>
            )}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-[var(--ks-text)]">Edit profile</h2>
              <ProfileEditor
                initial={{
                  displayName: profile.displayName,
                  handle: profile.handle,
                  city: profile.city,
                  bio: profile.bio,
                  profileVisibility: profile.profileVisibility,
                }}
              />
            </section>
            <section>
              <h2 className="mb-3 text-sm font-semibold text-[var(--ks-text)]">Your reviews</h2>
              <ProfileReviewList reviews={profile.reviews} showStatus />
            </section>
          </>
        ) : (
          <SignInPrompt />
        )}
      </div>
      <Footer />
    </main>
  );
}
