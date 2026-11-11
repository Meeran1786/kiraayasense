import "server-only";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Email through Resend (https://resend.com). Needs RESEND_API_KEY and a
 * verified sender domain; ALERTS_FROM_EMAIL defaults to
 * "KiraayaSense <alerts@kiraayasense.com>". Without a key nothing is sent and
 * callers record SKIPPED.
 */
export const emailConfigured = () => !!process.env.RESEND_API_KEY;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function sendEmail(to: string, subject: string, body: string, link?: string | null): Promise<boolean> {
  if (!emailConfigured()) return false;
  const url = link ? new URL(link, SITE_URL).toString() : null;
  const text = `${body}${url ? `\n\n${url}` : ""}\n\n— ${SITE_NAME}\nChange your alerts: ${SITE_URL}/profile#alerts`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#141a2e">
<p>${esc(body).replace(/\n/g, "<br>")}</p>
${url ? `<p><a href="${esc(url)}" style="display:inline-block;background:#d94f5c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Open on KiraayaSense</a></p>` : ""}
<p style="color:#6b7280;font-size:12px">${SITE_NAME} · <a href="${SITE_URL}/profile#alerts" style="color:#6b7280">Change your alerts</a></p></div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.ALERTS_FROM_EMAIL || "KiraayaSense <alerts@kiraayasense.com>",
        to: [to],
        subject,
        text,
        html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("[email] Resend", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("[email]", e);
    return false;
  }
}
