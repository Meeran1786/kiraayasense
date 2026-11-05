"use client";

import { Share2 } from "lucide-react";

/** Share a business page: the phone's share sheet where there is one, otherwise WhatsApp. */
export function ShareButton({ name, url }: { name: string; url: string }) {
  async function share() {
    const text = `Reviews of ${name} on KiraayaSense`;
    if (navigator.share) {
      await navigator.share({ title: name, text, url }).catch(() => undefined);
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}: ${url}`)}`, "_blank", "noopener");
  }

  return (
    <button
      type="button"
      onClick={share}
      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold text-[var(--ks-text)]"
      style={{ borderColor: "var(--ks-border-strong)" }}
    >
      <Share2 size={13} /> Share
    </button>
  );
}
