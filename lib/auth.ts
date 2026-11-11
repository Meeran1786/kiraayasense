import "server-only";
import type { AuthOptions, Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { uniqueHandle } from "@/lib/db/users";

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
      await prisma.user.upsert({
        where: { primaryEmail: user.email },
        update: {
          avatarStorageKey: user.image ?? undefined,
          primaryEmailVerifiedAt: new Date(),
          handle: existing?.handle ? undefined : await uniqueHandle(user.email),
        },
        create: {
          displayName: user.name ?? user.email,
          handle: await uniqueHandle(user.email),
          primaryEmail: user.email,
          primaryEmailVerifiedAt: new Date(),
          avatarStorageKey: user.image ?? undefined,
        },
      });

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

export const ADMIN_ROLES = ["MODERATOR", "SUPER_ADMIN"] as const;

/**
 * Admin areas only a SUPER_ADMIN may open (pages and their /api/admin routes).
 * Moderators keep reviews, reports, owner replies, claims and businesses.
 * Enforced in middleware.ts; the sidebar only hides what this already blocks.
 */
export const SUPER_ADMIN_SECTIONS = ["team", "activity", "banners", "imports", "categories", "question-sets"] as const;

export function isAdminSession(session: Session | null): boolean {
  return !!session?.user && (ADMIN_ROLES as readonly string[]).includes(session.user.role ?? "");
}
