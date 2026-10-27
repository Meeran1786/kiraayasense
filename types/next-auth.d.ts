import type { DefaultSession } from "next-auth";

// Module augmentation: adds our own User fields (id, role, status) onto the
// NextAuth Session/JWT types so `session.user.role` etc. type-check
// throughout the app instead of needing `as any` at every call site.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      status: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: string;
    status?: string;
  }
}
