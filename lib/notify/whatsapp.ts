import "server-only";

/**
 * WhatsApp through Meta's WhatsApp Business Cloud API. Business-initiated
 * messages must use templates that Meta has approved; their names and text
 * are in deploy/WHATSAPP_TEMPLATES.md and must match exactly.
 *
 * Needs WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN (a permanent
 * system-user token). Without them nothing is sent and callers record SKIPPED.
 */
export const whatsappConfigured = () => !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);

const GRAPH = "https://graph.facebook.com/v21.0";

export type WhatsAppTemplate = { name: string; params: string[] };

async function post(payload: object): Promise<boolean> {
  if (!whatsappConfigured()) return false;
  try {
    const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("[whatsapp]", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("[whatsapp]", e);
    return false;
  }
}

/** Template params can't hold newlines, tabs or 4+ spaces; Meta also caps their length. */
const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 300) || "-";

export function sendTemplate(phoneE164: string, t: WhatsAppTemplate): Promise<boolean> {
  return post({
    to: phoneE164.replace(/^\+/, ""),
    type: "template",
    template: {
      name: t.name,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
      components: t.params.length ? [{ type: "body", parameters: t.params.map((text) => ({ type: "text", text: clean(text) })) }] : [],
    },
  });
}

/** Meta "authentication" template with a copy-code button: the code goes in the body and the button. */
export function sendCode(phoneE164: string, code: string): Promise<boolean> {
  return post({
    to: phoneE164.replace(/^\+/, ""),
    type: "template",
    template: {
      name: process.env.WHATSAPP_OTP_TEMPLATE || "ks_verify_code",
      language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
      components: [
        { type: "body", parameters: [{ type: "text", text: code }] },
        { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
      ],
    },
  });
}
