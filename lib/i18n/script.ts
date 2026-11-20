import type { Locale } from "@/lib/i18n/locales";

/**
 * Which writing system a piece of text is mostly in. Used to decide whether
 * a review needs a "Translate to English" button without asking a server.
 */
export type Script = "latin" | "devanagari" | "bengali" | "gurmukhi" | "gujarati" | "odia" | "tamil" | "telugu" | "kannada" | "malayalam" | "arabic" | "other";

const RANGES: [number, number, Script][] = [
  [0x0900, 0x097f, "devanagari"],
  [0x0980, 0x09ff, "bengali"],
  [0x0a00, 0x0a7f, "gurmukhi"],
  [0x0a80, 0x0aff, "gujarati"],
  [0x0b00, 0x0b7f, "odia"],
  [0x0b80, 0x0bff, "tamil"],
  [0x0c00, 0x0c7f, "telugu"],
  [0x0c80, 0x0cff, "kannada"],
  [0x0d00, 0x0d7f, "malayalam"],
  [0x0600, 0x06ff, "arabic"],
  [0x0750, 0x077f, "arabic"],
  [0xfb50, 0xfdff, "arabic"],
  [0xfe70, 0xfeff, "arabic"],
];

export function dominantScript(text: string): Script | null {
  const counts = new Map<Script, number>();
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    let script: Script | null = null;
    if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a) || (cp >= 0xc0 && cp <= 0x24f)) script = "latin";
    else {
      for (const [lo, hi, s] of RANGES) if (cp >= lo && cp <= hi) { script = s; break; }
      if (!script && /\p{L}/u.test(ch)) script = "other";
    }
    if (script) counts.set(script, (counts.get(script) ?? 0) + 1);
  }
  let best: Script | null = null;
  let bestCount = 0;
  counts.forEach((n, s) => {
    if (n > bestCount) { best = s; bestCount = n; }
  });
  return best;
}

/** The script each site language is written in. */
export const LOCALE_SCRIPT: Record<string, Script> = {
  en: "latin",
  hi: "devanagari",
  mr: "devanagari",
  ur: "arabic",
  bn: "bengali",
  gu: "gujarati",
  ta: "tamil",
  te: "telugu",
};

// Letters and words common in Marathi but rare in Hindi, so a Devanagari
// review that is probably Marathi still offers "Translate to Hindi".
const MARATHI_HINT = /ळ|आहे|नाही|आणि|होते|खूप|मला|आम्ही|तुम्ही|केले|चांगल/;

/**
 * Which languages a review can be translated into with one tap, in button
 * order. A review in an Indian script (Tamil, Telugu, Kannada, Bengali,
 * Urdu…) gets English and Hindi; one in Devanagari gets English, plus Hindi
 * when it looks like Marathi. The reader's site language is added when it
 * is in a different script from the review, which also gives English and
 * Hinglish reviews a Hindi button on the Hindi site.
 */
export function translateTargets(text: string, siteLocale: Locale): Locale[] {
  const script = dominantScript(text);
  if (!script) return [];
  const targets: Locale[] = [];
  if (script !== "latin") targets.push("en");
  if (script !== "latin" && (script !== "devanagari" || MARATHI_HINT.test(text))) targets.push("hi");
  if (!targets.includes(siteLocale) && LOCALE_SCRIPT[siteLocale] !== script) targets.push(siteLocale);
  return targets;
}
