"use client";

import { useEffect } from "react";
import { REFERRAL_COOKIE, REFERRAL_COOKIE_DAYS } from "@/lib/referral";

/**
 * Remembers an invite code from a link like kiraayasense.com/?ref=AB12CD34 in
 * a cookie, so it is still there when the visitor signs up with Google (the
 * sign-in callback in lib/auth.ts reads it). Points are only given to brand-new
 * accounts, so a code picked up by someone already signed up does nothing.
 */
export function ReferralCapture() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase();
    if (!code || !/^[A-Z0-9]{6,12}$/.test(code)) return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${REFERRAL_COOKIE}=${code}; Max-Age=${REFERRAL_COOKIE_DAYS * 86400}; Path=/; SameSite=Lax${secure}`;
  }, []);
  return null;
}
