import type { Locale } from "./locales";
import type { MessageKey, Messages } from "./messages/en";

export type Vars = Record<string, string | number>;

export interface Translator {
  (key: MessageKey, vars?: Vars): string;
  /** Picks `<key>_one` for 1 and `<key>_other` otherwise; `{n}` is the count. */
  n: (key: PluralBase, n: number, vars?: Vars) => string;
  locale: Locale;
}

type PluralBase = MessageKey extends infer K ? (K extends `${infer B}_one` ? B : never) : never;

export function makeTranslator(locale: Locale, messages: Messages): Translator {
  const fill = (s: string, vars?: Vars) =>
    vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
  const t = ((key: MessageKey, vars?: Vars) => fill(messages[key] ?? key, vars)) as Translator;
  t.n = (key, n, vars) => {
    const fmt = n.toLocaleString("en-IN");
    return t(`${key}_${n === 1 ? "one" : "other"}` as MessageKey, { n: fmt, ...vars });
  };
  t.locale = locale;
  return t;
}


/**
 * A category's name in the visitor's language. Category names live in the
 * database (admins can rename them), so English always shows the stored
 * name; other languages use the seeded category's translation if there is one.
 */
export function categoryName(t: Translator, slug: string, stored: string): string {
  if (t.locale === "en") return stored;
  const key = `cat.${slug}` as MessageKey;
  const out = t(key);
  return out === key ? stored : out;
}
