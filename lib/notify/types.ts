/**
 * Alert types and who gets them. Client-safe (no server imports): the profile
 * settings screen reads the labels and defaults from here too.
 *
 * Each type has an email and a WhatsApp switch per person, stored in
 * users.notificationPrefs; a missing entry means the default below. WhatsApp
 * is only ever used for someone who verified their phone and opted in.
 */
export const ALERT_TYPES = {
  // Admins and moderators
  ADMIN_NEW_REVIEW: { audience: "admin", label: "New review waiting for moderation", email: true, whatsapp: false },
  ADMIN_NEW_BUSINESS: { audience: "admin", label: "Business added by a user", email: true, whatsapp: false },
  ADMIN_NEW_CLAIM: { audience: "admin", label: "New ownership claim", email: true, whatsapp: false },
  ADMIN_NEW_REPORT: { audience: "admin", label: "Review reported (urgent when it gets hidden)", email: true, whatsapp: true },
  ADMIN_NEW_REPLY: { audience: "admin", label: "Owner reply waiting for a check", email: true, whatsapp: false },
  ADMIN_DIGEST: { audience: "admin", label: "Daily summary at 9 AM", email: true, whatsapp: true },
  // Everyone
  REVIEW_APPROVED: { audience: "user", label: "My review is approved or rejected", email: true, whatsapp: true },
  HELPFUL: { audience: "user", label: "People found my review helpful (one message a day)", email: true, whatsapp: true },
  POINTS_CREDITED: { audience: "user", label: "Points credited and payouts", email: true, whatsapp: true },
  // Business owners
  OWNER_NEW_REVIEW: { audience: "owner", label: "New review on a business I manage", email: true, whatsapp: true },
  CLAIM_DECIDED: { audience: "owner", label: "My ownership claim is decided", email: true, whatsapp: true },
} as const;

export type AlertType = keyof typeof ALERT_TYPES;
export type ChannelPrefs = { email: boolean; whatsapp: boolean };
export type AlertPrefs = Partial<Record<AlertType, Partial<ChannelPrefs>>>;

/** Alerts that are batched into the 9 AM run instead of sent at once. */
export const DIGEST_TYPES: readonly AlertType[] = ["HELPFUL"];

export function isAlertType(v: unknown): v is AlertType {
  return typeof v === "string" && v in ALERT_TYPES;
}

export function channelPrefs(prefs: unknown, type: AlertType): ChannelPrefs {
  const saved = (prefs && typeof prefs === "object" ? (prefs as AlertPrefs)[type] : undefined) ?? {};
  const d = ALERT_TYPES[type];
  return {
    email: typeof saved.email === "boolean" ? saved.email : d.email,
    whatsapp: typeof saved.whatsapp === "boolean" ? saved.whatsapp : d.whatsapp,
  };
}
