import "server-only";
import QRCode from "qrcode";
import { SITE_URL } from "@/lib/site";

/**
 * Review invitations. One open link per business, the same for every
 * customer: owners share it with everyone, not only happy customers, and
 * it never carries an offer or reward (IS 19000:2022 on solicited reviews).
 */

export function inviteUrl(propertyId: string): string {
  return `${SITE_URL}/property/${propertyId}?startReview=1`;
}

export function inviteMessage(name: string, url: string): string {
  return `Hi! Thanks for choosing ${name}. Could you take two minutes to share an honest review on KiraayaSense? Good or bad, it helps us improve and helps others decide. ${url}`;
}

/** The invite link as an SVG QR code, for posters and download. */
export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#0b1020", light: "#ffffff" } });
}
