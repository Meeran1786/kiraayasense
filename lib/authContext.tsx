"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { SessionProvider, useSession, signIn, signOut as nextAuthSignOut } from "next-auth/react";

/**
 * Real session state for Google sign-in (FR-AUTH-1), backed by NextAuth
 * (app/api/auth/[...nextauth]/route.ts + lib/auth.ts), which itself is
 * backed by our own `users` table in Postgres — so `user.id` here is a real
 * database id, and `user.role` is what the admin CMS gates on.
 *
 * Phone/email OTP (FR-AUTH-2) is still a local mock: there's no SMS/email
 * gateway account (MSG91/Twilio, SES/Postmark) wired up yet, so
 * `signInWithOtp` below sets in-memory-only state, same as before, clearly
 * marked in the UI (components/auth/SignInModal.tsx).
 */

export interface AppUser {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  role: string;
  authProvider: "GOOGLE" | "PHONE_OTP" | "EMAIL_OTP";
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: (callbackUrl?: string) => void;
  signInWithOtp: (destination: string, channel: "SMS" | "EMAIL") => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface MockOtpUser {
  id: string;
  displayName: string;
  authProvider: "PHONE_OTP" | "EMAIL_OTP";
}

function AuthContextBridge({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [otpUser, setOtpUser] = useState<MockOtpUser | null>(null);

  const signInWithGoogle = useCallback((callbackUrl?: string) => {
    // Real OAuth redirect — the browser leaves the page and comes back with
    // a session cookie set, so there's no client-side "onSignedIn" callback
    // to fire here (see SignInModal's Google button). Callers that need to
    // resume an action post-sign-in (e.g. WriteReviewGate re-opening the
    // review modal) pass a callbackUrl carrying a query flag for that.
    signIn("google", callbackUrl ? { callbackUrl } : undefined);
  }, []);

  const signInWithOtp = useCallback((destination: string, channel: "SMS" | "EMAIL") => {
    // MOCK — no real OTP gateway configured. See module docblock above.
    setOtpUser({
      id: `mock-otp-user-${destination}`,
      displayName: channel === "SMS" ? destination : destination.split("@")[0],
      authProvider: channel === "SMS" ? "PHONE_OTP" : "EMAIL_OTP",
    });
  }, []);

  const signOut = useCallback(() => {
    setOtpUser(null);
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
    if (otpUser) {
      return { ...otpUser, role: "USER" };
    }
    return null;
  }, [session, otpUser]);

  const value = useMemo(
    () => ({ user, loading: status === "loading", signInWithGoogle, signInWithOtp, signOut }),
    [user, status, signInWithGoogle, signInWithOtp, signOut]
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
