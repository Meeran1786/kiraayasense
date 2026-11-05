"use client";

import { useMemo, useState } from "react";
import { Languages, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import type { DbReviewReason } from "@/lib/db/properties";
import { useT } from "@/lib/i18n/client";
import { localeInfo, type Locale } from "@/lib/i18n/locales";
import { LOCALE_SCRIPT, dominantScript } from "@/lib/i18n/script";
import { brand } from "@/lib/brand";

/**
 * A review's pros and cons, with a "Translate to English" button when the
 * review is written in another script, or "Translate to <your language>" for
 * an English review when the site is in another language. Translations come
 * from POST /api/reviews/[id]/translate (cached server-side); when no
 * translation service is configured the button opens Google Translate.
 */
export function ReviewText({ reviewId, reasons, canTranslate }: { reviewId: string; reasons: DbReviewReason[]; canTranslate: boolean }) {
  const t = useT();
  const [translated, setTranslated] = useState<{ texts: Record<string, string>; sourceLang: string | null } | null>(null);
  const [showing, setShowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = useMemo<Locale | null>(() => {
    const script = dominantScript(reasons.map((r) => r.text).join(" "));
    if (!script) return null;
    // Anything not in the Latin script gets an English translation; an
    // English review gets one into the site language when that isn't English.
    if (script !== "latin") return "en";
    return LOCALE_SCRIPT[t.locale] !== "latin" ? t.locale : null;
  }, [reasons, t.locale]);

  const languageName = (code: string) => {
    try {
      return new Intl.DisplayNames([t.locale], { type: "language" }).of(code) ?? code;
    } catch {
      return code;
    }
  };
  const targetName = target ? (t.locale === "en" || target === t.locale ? localeInfo(target).native : languageName(target)) : "";

  async function translate() {
    if (!target) return;
    if (translated) {
      setShowing((s) => !s);
      return;
    }
    if (!canTranslate) {
      const text = reasons.map((r) => `${r.label}: ${r.text}`).join("\n\n");
      window.open(`https://translate.google.com/?sl=auto&tl=${target}&op=translate&text=${encodeURIComponent(text)}`, "_blank", "noopener");
      return;
    }
    setBusy(true);
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
      setTranslated({ texts: body.texts, sourceLang: body.sourceLang ?? null });
      setShowing(true);
    } catch {
      setError(t("review.translateFailed"));
    } finally {
      setBusy(false);
    }
  }

  const sourceName = translated?.sourceLang ? languageName(translated.sourceLang) : "";
  const show = showing ? translated : null;

  return (
    <>
      <ul className="mt-3 flex flex-col gap-1.5" lang={show ? (target ?? undefined) : undefined} dir="auto">
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

      {target && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <button
            type="button"
            onClick={translate}
            disabled={busy}
            className="flex items-center gap-1 font-medium text-[var(--ks-coral)] hover:underline disabled:opacity-60"
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Languages size={11} />}
            {busy
              ? t("review.translating")
              : show
                ? t("review.showOriginal")
                : canTranslate
                  ? t("review.translateTo", { lang: targetName })
                  : `${t("review.translateTo", { lang: targetName })} ↗`}
          </button>
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
