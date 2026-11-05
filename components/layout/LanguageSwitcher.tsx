"use client";

import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { LOCALES, LOCALE_COOKIE, localeInfo, isLocale } from "@/lib/i18n/locales";
import { useT } from "@/lib/i18n/client";

/** Site language picker. Stores the choice in a cookie for a year and re-renders the page. */
export function LanguageSwitcher() {
  const t = useT();
  const router = useRouter();

  function choose(code: string) {
    if (!isLocale(code)) return;
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    // Flip direction at once so Urdu doesn't flash left-to-right before the refresh lands.
    document.documentElement.lang = code;
    document.documentElement.dir = localeInfo(code).dir;
    router.refresh();
  }

  return (
    <label
      className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs text-[var(--ks-text-muted)]"
      style={{ borderColor: "var(--ks-border-strong)" }}
      title={t("lang.label")}
    >
      <Languages size={14} aria-hidden className="hidden sm:block" />
      <span className="sr-only">{t("lang.label")}</span>
      <select
        value={t.locale}
        onChange={(e) => choose(e.target.value)}
        className="max-w-[5.5rem] cursor-pointer bg-transparent text-xs text-[var(--ks-text)] focus:outline-none"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code} title={l.english} className="bg-[var(--ks-bg-elevated)]">
            {l.native}
          </option>
        ))}
      </select>
    </label>
  );
}
