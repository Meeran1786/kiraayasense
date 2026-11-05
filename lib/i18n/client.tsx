"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./locales";
import { makeTranslator, type Translator } from "./translate";
import type { Messages } from "./messages/en";

const I18nContext = createContext<Translator | null>(null);

/** The root layout passes only the current language's messages down. */
export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  const t = useMemo(() => makeTranslator(locale, messages), [locale, messages]);
  return <I18nContext.Provider value={t}>{children}</I18nContext.Provider>;
}

export function useT(): Translator {
  const t = useContext(I18nContext);
  if (!t) throw new Error("useT() needs <I18nProvider> above it");
  return t;
}
