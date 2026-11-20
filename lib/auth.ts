import "server-only";
import type { AuthOptions, Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { uniqueHandle } from "@/lib/db/users";
import { awardSignup, newReferralCode, POINTS, formatRupees } from "@/lib/rewards";
import { notifyUsers } from "@/lib/notify";
import { REFERRAL_COOKIE } from "@/lib/referral";
import { ADMIN_ROLES, SUPER_ADMIN_SECTIONS } from "@/lib/roles";

/**
 * Real Google OAuth 2.0 sign-in (FR-AUTH-1). We deliberately do NOT use
 * @next-auth/prisma-adapter here: this schema's User/Account/Session models
 * (docs/ERD.md) are shaped around KiraayaSense's own domain (role, status,
 * multi-provider Account rows keyed by our AuthProvider enum, IP/UA capture
 * on Session) rather than the adapter's fixed column names, and reconciling
 * the two would mean bending our schema to NextAuth's rather than the other
 * way around. Instead we keep NextAuth sessions as JWTs and use the
 * `signIn`/`jwt` callbacks below to upsert our own `User` row and stamp its
 * id + role onto the token, so the rest of the app (including the admin CMS
 * role check) reads from our schema.
 *
 * Google is the only sign-in method, by decision (2026-11-11). Phone/email
 * OTP login was removed; a WhatsApp number verified on the profile is used
 * for alerts only, never to sign in.
 */

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) return false;

      // Upsert-by-email: a Google sign-in either claims an existing User row
      // (e.g. one created by a future OTP sign-up with the same email) or
      // creates a fresh one. Role/status are never set from OAuth claims —
      // every new account starts as USER; admin role is granted out-of-band
      // via `npm run make-admin -- <email>` (scripts/make-admin.ts).
      // displayName is set from Google only on first sign-in; after that it
      // belongs to the reviewer, who can change it on /profile.
      const existing = await prisma.user.findUnique({ where: { primaryEmail: user.email } });
      const saved = await prisma.user.upsert({
        where: { primaryEmail: user.email },
        update: {
          avatarStorageKey: user.image ?? undefined,
          primaryEmailVerifiedAt: new Date(),
          handle: existing?.handle ? undefined : await uniqueHandle(user.email),
          referralCode: existing?.referralCode ? undefined : newReferralCode(),
        },
        create: {
          displayName: user.name ?? user.email,
          handle: await uniqueHandle(user.email),
          primaryEmail: user.email,
          primaryEmailVerifiedAt: new Date(),
          avatarStorageKey: user.image ?? undefined,
          referralCode: newReferralCode(),
        },
      });

      // A brand-new account: 50-point welcome bonus, and 5 points to whoever
      // invited them (the ?ref= code is kept in a cookie by ReferralCapture).
      if (!existing) {
        let ref: string | null = null;
        try {
          ref = cookies().get(REFERRAL_COOKIE)?.value ?? null;
        } catch {
          // No request context (shouldn't happen inside the auth route).
        }
        const result = await prisma
          .$transaction((tx) => awardSignup(tx, saved.id, ref))
          .catch((e) => {
            console.error("[rewards] sign-up points", e);
            return null;
          });
        if (result?.referrerId) {
          notifyUsers([result.referrerId], {
            type: "POINTS_CREDITED",
            title: `A friend joined: +${POINTS.REFERRAL} points`,
            body: `${saved.displayName} joined KiraayaSense with your invite link, so you earned ${POINTS.REFERRAL} points (${formatRupees(POINTS.REFERRAL)}). They are on the usual 30-day hold.`,
            link: "/profile/rewards",
          });
        }
      }

      // Admin access granted on the Team page before this person first
      // signed in (app/admin/team). Applied once, then marked accepted.
      const invite = await prisma.adminInvite.findUnique({ where: { email: user.email.toLowerCase() } });
      if (invite && !invite.acceptedAt) {
        const invited = await prisma.user.update({ where: { primaryEmail: user.email }, data: { role: invite.role } });
        await prisma.adminInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
        await prisma.auditLog.create({
          data: { actorUserId: invite.invitedById, action: "ADMIN_INVITE_ACCEPTED", entityType: "User", entityId: invited.id, metadata: { role: invite.role } },
        });
      }

      await prisma.account
        .upsert({
          where: {
            provider_providerAccountId: {
              provider: "GOOGLE",
              providerAccountId: account.providerAccountId,
            },
          },
          update: {
            accessToken: account.access_token ?? undefined,
            refreshToken: account.refresh_token ?? undefined,
          },
          create: {
            provider: "GOOGLE",
            providerAccountId: account.providerAccountId,
            accessToken: account.access_token ?? undefined,
            refreshToken: account.refresh_token ?? undefined,
            user: { connect: { primaryEmail: user.email } },
          },
        })
        .catch(() => {
          // Non-fatal: the User row above is the source of truth for the
          // session; the Account link is bookkeeping for future
          // token-refresh support.
        });

      return true;
    },

    async jwt({ token }) {
      if (!token.email) return token;
      const dbUser = await prisma.user.findUnique({ where: { primaryEmail: token.email } });
      if (dbUser) {
        token.uid = dbUser.id;
        token.role = dbUser.role;
        token.status = dbUser.status;
        token.name = dbUser.displayName;
        token.picture = dbUser.avatarStorageKey ?? token.picture;
        // "Last active" on the admin Team page; written at most once an hour.
        if (!dbUser.lastSeenAt || Date.now() - dbUser.lastSeenAt.getTime() > 60 * 60 * 1000) {
          await prisma.user.update({ where: { id: dbUser.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.role = (token.role as string) ?? "USER";
        session.user.status = (token.status as string) ?? "ACTIVE";
      }
      return session;
    },
  },
};

export { ADMIN_ROLES, SUPER_ADMIN_SECTIONS };

export function isAdminSession(session: Session | null): boolean {
  return !!session?.user && (ADMIN_ROLES as readonly string[]).includes(session.user.role ?? "");
}
