"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

function Snippet({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[var(--ks-text-muted)]">{label}</p>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(code).catch(() => undefined);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex items-center gap-1 text-[11px] text-[var(--ks-text-muted)] hover:text-[var(--ks-text)]"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre className="mt-1 overflow-x-auto rounded-lg border p-2 text-[11px] text-[var(--ks-text)]" style={{ borderColor: "var(--ks-border)" }}>
        {code}
      </pre>
    </div>
  );
}

/** Copy-paste code for the rating badge and the reviews widget. */
export function EmbedTools({ siteUrl, propertyId, name }: { siteUrl: string; propertyId: string; name: string }) {
  const page = `${siteUrl}/property/${propertyId}`;
  const alt = `${name} reviews on KiraayaSense`.replace(/"/g, "&quot;");
  const badge = `<a href="${page}" target="_blank" rel="noopener"><img src="${siteUrl}/badge/${propertyId}" alt="${alt}" height="22"></a>`;
  const widget = `<iframe src="${siteUrl}/embed/${propertyId}" title="${alt}" width="100%" height="380" style="border:0;max-width:420px" loading="lazy"></iframe>`;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- our own SVG badge */}
        <img src={`/badge/${propertyId}`} alt="Your rating badge" height={22} />
      </div>
      <Snippet label="Rating badge (for your website header or footer)" code={badge} />
      <Snippet label="Reviews widget (shows your rating and latest reviews)" code={widget} />
      <iframe src={`/embed/${propertyId}`} title="Widget preview" width="100%" height={380} className="max-w-[420px] rounded-xl" style={{ border: 0 }} />
      <p className="text-[11px] text-[var(--ks-text-faint)]">
        Both update on their own as new reviews come in, and always show your real score. Add <code>?theme=dark</code> to
        the widget address for a dark background.
      </p>
    </div>
  );
}
