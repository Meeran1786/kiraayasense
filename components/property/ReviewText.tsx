"use client";

import { useMemo, useState } from "react";
import { Languages, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import type { DbReviewReason } from "@/lib/db/properties";
import { useT } from "@/lib/i18n/client";
import { localeInfo, type Locale } from "@/lib/i18n/locales";
import { translateTargets } from "@/lib/i18n/script";
import { brand } from "@/lib/brand";

/**
 * A review's pros and cons, with one-tap translate buttons. A review in an
 * Indian script (Tamil, Telugu, Kannada, Bengali, Marathi, Urdu…) offers
 * "English" and "Hindi"; an English or Hinglish review offers "Hindi"; and
 * the reader's site language is added when it is neither. Translations come
 * from POST /api/reviews/[id]/translate (cached server-side per language);
 * when no translation service is configured each button opens Google
 * Translate instead.
 */
export function ReviewText({ reviewId, reasons, canTranslate }: { reviewId: string; reasons: DbReviewReason[]; canTranslate: boolean }) {
  const t = useT();
  const [translations, setTranslations] = useState<Partial<Record<Locale, { texts: Record<string, string>; sourceLang: string | null }>>>({});
  const [showing, setShowing] = useState<Locale | null>(null);
  const [busy, setBusy] = useState<Locale | null>(null);
  const [error, setError] = useState<string | null>(null);

  const targets = useMemo<Locale[]>(() => translateTargets(reasons.map((r) => r.text).join(" "), t.locale), [reasons, t.locale]);

  const languageName = (code: string) => {
    try {
      return new Intl.DisplayNames([t.locale], { type: "language" }).of(code) ?? code;
    } catch {
      return code;
    }
  };
  // "English", "हिन्दी" on an English page; "अंग्रेज़ी", "हिन्दी" on a Hindi one.
  const targetName = (target: Locale) => (t.locale === "en" || target === t.locale ? localeInfo(target).native : languageName(target));

  async function translate(target: Locale) {
    if (showing === target) {
      setShowing(null);
      return;
    }
    if (translations[target]) {
      setShowing(target);
      return;
    }
    if (!canTranslate) {
      const text = reasons.map((r) => `${r.label}: ${r.text}`).join("\n\n");
      window.open(`https://translate.google.com/?sl=auto&tl=${target}&op=translate&text=${encodeURIComponent(text)}`, "_blank", "noopener");
      return;
    }
    setBusy(target);
    setError(null);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: target }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.texts) {
        setError(res.status === 429 && body?.error?.message ? body.error.message : t("review.translateFailed"));
        return;
      }
      setTranslations((prev) => ({ ...prev, [target]: { texts: body.texts, sourceLang: body.sourceLang ?? null } }));
      setShowing(target);
    } catch {
      setError(t("review.translateFailed"));
    } finally {
      setBusy(null);
    }
  }

  const show = showing ? translations[showing] ?? null : null;
  const sourceName = show?.sourceLang ? languageName(show.sourceLang) : "";

  return (
    <>
      <ul className="mt-3 flex flex-col gap-1.5" lang={show ? (showing ?? undefined) : undefined} dir="auto">
        {reasons.map((reason) => {
          const Icon = reason.type === "PRO" ? ThumbsUp : ThumbsDown;
          return (
            <li key={reason.id} className="flex items-start gap-2 text-sm">
              <Icon
                size={14}
                className="mt-0.5 shrink-0"
                style={{ color: reason.type === "PRO" ? brand.success : brand.danger }}
              />
              <span className="text-[var(--ks-text-muted)]">
                <span className="text-[var(--ks-text-faint)]">{reason.label}: </span>
                <bdi>{show ? show.texts[reason.id] ?? reason.text : reason.text}</bdi>
              </span>
            </li>
          );
        })}
      </ul>

      {targets.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          {show ? (
            <button
              type="button"
              onClick={() => setShowing(null)}
              className="flex items-center gap-1 font-medium text-[var(--ks-coral)] hover:underline"
            >
              <Languages size={11} />
              {t("review.showOriginal")}
            </button>
          ) : (
            <span className="flex items-center gap-1 text-[var(--ks-text-faint)]">
              <Languages size={11} />
            </span>
          )}
          {targets
            .filter((target) => target !== showing)
            .map((target) => (
              <button
                key={target}
                type="button"
                onClick={() => translate(target)}
                disabled={busy !== null}
                className="flex items-center gap-1 font-medium text-[var(--ks-coral)] hover:underline disabled:opacity-60"
              >
                {busy === target && <Loader2 size={11} className="animate-spin" />}
                {busy === target
                  ? t("review.translating")
                  : canTranslate
                    ? t("review.translateTo", { lang: targetName(target) })
                    : `${t("review.translateTo", { lang: targetName(target) })} ↗`}
              </button>
            ))}
          {show && sourceName && (
            <span className="text-[var(--ks-text-faint)]">
              {t("review.translated", { lang: sourceName })}
            </span>
          )}
          {error && <span style={{ color: "var(--ks-danger)" }}>{error}</span>}
        </div>
      )}
    </>
  );
}
