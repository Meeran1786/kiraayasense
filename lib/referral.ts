/** Client-safe referral helpers (no server imports). */

/** Cookie that remembers the ?ref= invite code until the visitor signs up. */
export const REFERRAL_COOKIE = "ks_ref";
/** Long enough to look around before joining; short enough not to credit a stale link. */
export const REFERRAL_COOKIE_DAYS = 30;

export const inviteUrl = (siteUrl: string, code: string) => `${siteUrl.replace(/\/$/, "")}/?ref=${encodeURIComponent(code)}`;
