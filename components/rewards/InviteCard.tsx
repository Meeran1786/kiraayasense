"use client";

import { useState } from "react";
import { Check, Copy, Gift, Share2 } from "lucide-react";

/** "Invite friends" on My Rewards: the personal invite link with copy, WhatsApp and share buttons. */
export function InviteCard({ url, points, value, joined, welcome }: { url: string; points: number; value: string; joined: number; welcome: number }) {
  const [copied, setCopied] = useState(false);
  const message = `I use KiraayaSense to check honest, proof-backed reviews of PGs, rentals and local businesses. Join with my link and get ${welcome} points: ${url}`;

  const copy = async () => {
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const share = async () => {
    if (navigator.share) await navigator.share({ title: "KiraayaSense", text: message }).catch(() => undefined);
    else copy();
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border p-4" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--ks-text)]">
          <Gift size={15} style={{ color: "var(--ks-coral)" }} /> Invite friends, earn {points} points each ({value})
        </h2>
        <p className="text-xs text-[var(--ks-text-faint)]">
          {joined === 0 ? "No one has joined with your link yet" : `${joined.toLocaleString("en-IN")} joined with your link`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          readOnly
          value={url}
          aria-label="Your invite link"
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-[var(--ks-border-strong)] bg-transparent px-3 py-2 text-sm text-[var(--ks-text)]"
        />
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-[var(--ks-text)]"
          style={{ borderColor: "var(--ks-border-strong)" }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg px-3 py-2 text-sm font-semibold text-white"
          style={{ background: "#25D366" }}
        >
          WhatsApp
        </a>
        <button
          type="button"
          onClick={share}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-[var(--ks-text)]"
          style={{ borderColor: "var(--ks-border-strong)" }}
          aria-label="Share invite link"
        >
          <Share2 size={14} />
        </button>
      </div>
      <p className="text-[11px] text-[var(--ks-text-faint)]">
        Your friend gets {welcome} points for joining, and you get {points} once their account is created. Only new accounts count.
      </p>
    </section>
  );
}
