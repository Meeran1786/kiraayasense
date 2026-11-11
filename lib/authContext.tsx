"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { SessionProvider, useSession, signIn, signOut as nextAuthSignOut } from "next-auth/react";

/**
 * Real session state for Google sign-in (FR-AUTH-1), backed by NextAuth
 * (app/api/auth/[...nextauth]/route.ts + lib/auth.ts), which itself is
 * backed by our own `users` table in Postgres — so `user.id` here is a real
 * database id, and `user.role` is what the admin CMS gates on.
 *
 * Google is the only way to sign in. (A WhatsApp number can be verified on
 * the profile for alerts, but it is not a login.)
 */

export interface AppUser {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  role: string;
  authProvider: "GOOGLE";
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: (callbackUrl?: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthContextBridge({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const signInWithGoogle = useCallback((callbackUrl?: string) => {
    // Real OAuth redirect — the browser leaves the page and comes back with
    // a session cookie set, so there's no client-side "onSignedIn" callback
    // to fire here (see SignInModal's Google button). Callers that need to
    // resume an action post-sign-in (e.g. WriteReviewGate re-opening the
    // review modal) pass a callbackUrl carrying a query flag for that.
    signIn("google", callbackUrl ? { callbackUrl } : undefined);
  }, []);

  const signOut = useCallback(() => {
    if (session) nextAuthSignOut();
  }, [session]);

  const user: AppUser | null = useMemo(() => {
    if (session?.user) {
      return {
        id: session.user.id,
        displayName: session.user.name ?? session.user.email ?? "Google user",
        avatarUrl: session.user.image,
        role: session.user.role,
        authProvider: "GOOGLE",
      };
    }
    return null;
  }, [session]);

  const value = useMemo(
    () => ({ user, loading: status === "loading", signInWithGoogle, signOut }),
    [user, status, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextBridge>{children}</AuthContextBridge>
    </SessionProvider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
