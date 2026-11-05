/**
 * Site languages. The choice lives in the `ks_lang` cookie (no URL prefix),
 * so page URLs, canonicals and search indexing stay as they are; pages are
 * rendered per request anyway. Text a person wrote (reviews, business names)
 * is never machine-translated on the page; reviews get a "Translate" button
 * instead (components/property/ReviewText.tsx).
 */
export const LOCALES = [
  { code: "en", native: "English", english: "English", dir: "ltr" },
  { code: "hi", native: "हिन्दी", english: "Hindi", dir: "ltr" },
  { code: "ur", native: "اردو", english: "Urdu", dir: "rtl" },
  { code: "te", native: "తెలుగు", english: "Telugu", dir: "ltr" },
  { code: "mr", native: "मराठी", english: "Marathi", dir: "ltr" },
  { code: "bn", native: "বাংলা", english: "Bengali", dir: "ltr" },
  { code: "gu", native: "ગુજરાતી", english: "Gujarati", dir: "ltr" },
  { code: "ta", native: "தமிழ்", english: "Tamil", dir: "ltr" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "ks_lang";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.some((l) => l.code === value);
}

export function localeInfo(locale: Locale) {
  return LOCALES.find((l) => l.code === locale) ?? LOCALES[0];
}

/** Best match from an Accept-Language header, e.g. "hi-IN,hi;q=0.9,en;q=0.8". */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .filter((x) => x.lang && Number.isFinite(x.q))
    .sort((a, b) => b.q - a.q);
  for (const { lang } of ranked) if (isLocale(lang)) return lang;
  return null;
}
