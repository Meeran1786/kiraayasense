import "server-only";
import type { AuthOptions, Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

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
 * role check) reads from our schema exactly as it would with any other
 * auth method (e.g. the still-mocked phone/email OTP flow).
 *
 * Phone/email OTP (FR-AUTH-2) is intentionally NOT wired to a real SMS/email
 * gateway yet — that requires a provider account (MSG91/Twilio, SES/Postmark)
 * this environment doesn't have credentials for. It stays mocked in
 * lib/authContext.tsx until those credentials are supplied.
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
      await prisma.user.upsert({
        where: { primaryEmail: user.email },
        update: {
          displayName: user.name ?? user.email,
          avatarStorageKey: user.image ?? undefined,
          primaryEmailVerifiedAt: new Date(),
        },
        create: {
          displayName: user.name ?? user.email,
          primaryEmail: user.email,
          primaryEmailVerifiedAt: new Date(),
          avatarStorageKey: user.image ?? undefined,
        },
      });

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

export function isAdminSession(session: Session | null): boolean {
  return !!session?.user && (ADMIN_ROLES as readonly string[]).includes(session.user.role ?? "");
}
