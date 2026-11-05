"use client";

import { useState } from "react";
import { Check, Copy, Download, MessageCircle, Printer } from "lucide-react";

/** Owner dashboard: share the review link by copy, WhatsApp, QR or printed poster. */
export function InviteTools({ propertyId, url, message, qrSvg }: { propertyId: string; url: string; message: string; qrSvg: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const button = "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold text-[var(--ks-text)]";
  const qrHref = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`;

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="flex-1">
        <p className="text-xs text-[var(--ks-text-muted)]">Your review link</p>
        <div className="mt-1 flex items-center gap-2 rounded-lg border px-2.5 py-1.5" style={{ borderColor: "var(--ks-border)" }}>
          <code className="min-w-0 flex-1 truncate text-xs text-[var(--ks-text)]">{url}</code>
          <button type="button" onClick={copy} className="shrink-0 text-[var(--ks-text-muted)] hover:text-[var(--ks-text)]" aria-label="Copy link">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={button}
            style={{ borderColor: "var(--ks-border-strong)" }}
          >
            <MessageCircle size={13} /> Send on WhatsApp
          </a>
          <a href={`/owner/${propertyId}/poster`} target="_blank" className={button} style={{ borderColor: "var(--ks-border-strong)" }}>
            <Printer size={13} /> Print a QR poster
          </a>
          <a href={qrHref} download="kiraayasense-review-qr.svg" className={button} style={{ borderColor: "var(--ks-border-strong)" }}>
            <Download size={13} /> Download QR code
          </a>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--ks-text-faint)]">
          Send it to every customer or tenant, not only the happy ones, and never offer discounts or gifts for a review.
          Selective or paid invitations break India&apos;s online review standard (IS 19000) and can get reviews removed.
        </p>
      </div>
      {/* Generated server-side by the qrcode library from our own URL. */}
      <div
        className="h-32 w-32 shrink-0 self-center overflow-hidden rounded-lg bg-white p-1"
        aria-label="QR code for your review link"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
    </div>
  );
}
