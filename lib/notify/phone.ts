import "server-only";
import { createHash, randomInt, timingSafeEqual } from "crypto";

/**
 * Turns what a person typed into E.164. A bare 10-digit Indian mobile
 * (starting 6-9) gets +91; anything else must already start with +.
 */
export function normalisePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.replace(/[\s().-]/g, "");
  if (/^[6-9]\d{9}$/.test(s)) return `+91${s}`;
  if (/^0[6-9]\d{9}$/.test(s)) return `+91${s.slice(1)}`;
  if (/^91[6-9]\d{9}$/.test(s)) return `+${s}`;
  if (/^\+[1-9]\d{7,14}$/.test(s)) return s;
  return null;
}

export const newCode = () => randomInt(0, 1_000_000).toString().padStart(6, "0");

/** Codes are stored hashed, bound to the user and phone so a leaked row is useless elsewhere. */
export function hashCode(code: string, userId: string, phone: string) {
  return createHash("sha256").update(`${code}:${userId}:${phone}:${process.env.NEXTAUTH_SECRET ?? ""}`).digest("hex");
}

export function sameHash(a: string, b: string) {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_CODES_PER_HOUR = 5;
export const MAX_ATTEMPTS = 5;

/** Shows +91 98xxxxxx21 style, for screens and logs. */
export const maskPhone = (p: string) => (p.length > 6 ? `${p.slice(0, p.length - 8)}${"•".repeat(6)}${p.slice(-2)}` : p);
