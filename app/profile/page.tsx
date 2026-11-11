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
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/auth";
import { AlertSettings } from "@/components/profile/AlertSettings";
import { ALERT_TYPES, channelPrefs, type AlertType } from "@/lib/notify/types";
import { whatsappConfigured } from "@/lib/notify/whatsapp";
import { maskPhone } from "@/lib/notify/phone";

export const metadata = { title: "Your profile — KiraayaSense" };

export default async function OwnProfilePage() {
  const session = await getServerSession(authOptions);
  const profile = session?.user?.id ? await getOwnProfile(session.user.id) : null;
  const managed = session?.user?.id ? await managedProperties(session.user.id) : [];
  const alerts = session?.user?.id ? await alertSettings(session.user.id, managed.length > 0) : null;

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
            {alerts && (
              <section id="alerts" className="scroll-mt-20">
                <h2 className="mb-3 text-sm font-semibold text-[var(--ks-text)]">Alerts</h2>
                <AlertSettings {...alerts} />
              </section>
            )}
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

async function alertSettings(userId: string, managesBusiness: boolean) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      primaryEmail: true,
      primaryPhone: true,
      primaryPhoneVerifiedAt: true,
      whatsappOptInAt: true,
      notificationPrefs: true,
      _count: { select: { businessClaims: true } },
    },
  });
  if (!u) return null;
  const isAdmin = (ADMIN_ROLES as readonly string[]).includes(u.role);
  const owner = managesBusiness || u._count.businessClaims > 0;
  const types = (Object.keys(ALERT_TYPES) as AlertType[]).filter((t) => {
    const a = ALERT_TYPES[t].audience;
    return a === "user" || (a === "admin" && isAdmin) || (a === "owner" && owner);
  });
  const verified = !!(u.primaryPhone && u.primaryPhoneVerifiedAt);
  return {
    types,
    prefs: Object.fromEntries(types.map((t) => [t, channelPrefs(u.notificationPrefs, t)])),
    email: u.primaryEmail,
    phone: verified ? maskPhone(u.primaryPhone!) : null,
    whatsappOn: verified && !!u.whatsappOptInAt,
    whatsappReady: whatsappConfigured(),
  };
}
