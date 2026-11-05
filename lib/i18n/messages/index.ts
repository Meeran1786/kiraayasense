import "server-only";
import en, { type Messages } from "./en";
import hi from "./hi";
import ur from "./ur";
import te from "./te";
import mr from "./mr";
import bn from "./bn";
import gu from "./gu";
import ta from "./ta";
import type { Locale } from "../locales";

const ALL: Record<Locale, Partial<Messages>> = { en, hi, ur, te, mr, bn, gu, ta };

/** The locale's messages with English filling any gaps. */
export function messagesFor(locale: Locale): Messages {
  return { ...en, ...ALL[locale] } as Messages;
}

