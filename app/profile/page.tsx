import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOwnProfile } from "@/lib/db/users";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { ProfileReviewList } from "@/components/profile/ProfileReviewList";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { Footer } from "@/components/layout/Footer";
import { brand } from "@/lib/brand";

export const metadata = { title: "Your profile — KiraayaSense" };

export default async function OwnProfilePage() {
  const session = await getServerSession(authOptions);
  const profile = session?.user?.id ? await getOwnProfile(session.user.id) : null;

  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
        {profile ? (
          <>
            <ProfileHeader profile={profile} />
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
