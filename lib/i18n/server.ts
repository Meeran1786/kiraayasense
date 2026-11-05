import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localeFromAcceptLanguage, type Locale } from "./locales";
import { makeTranslator } from "./translate";
import { messagesFor } from "./messages";

/** The visitor's language: their pick (cookie), else their browser's, else English. */
export function getLocale(): Locale {
  const picked = cookies().get(LOCALE_COOKIE)?.value;
  if (isLocale(picked)) return picked;
  return localeFromAcceptLanguage(headers().get("accept-language")) ?? DEFAULT_LOCALE;
}

/** Translator for server components. */
export function getT() {
  const locale = getLocale();
  return makeTranslator(locale, messagesFor(locale));
}
