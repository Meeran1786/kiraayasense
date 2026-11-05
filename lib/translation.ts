import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Machine translation of review text, with a database cache so a review is
 * sent to the provider at most once per target language.
 *
 * Providers (first one configured wins):
 * - Microsoft Azure AI Translator: AZURE_TRANSLATOR_KEY (+ AZURE_TRANSLATOR_REGION
 *   for regional resources). The free F0 tier covers 2 million characters a
 *   month; all eight site languages are supported.
 * - Google Cloud Translation (Basic, v2): GOOGLE_TRANSLATE_API_KEY. 500,000
 *   characters a month free, then billed per character.
 * With neither set, translationProvider() is null and the review shows a
 * link to Google Translate instead.
 */

export type Provider = "azure" | "google";

export function translationProvider(): Provider | null {
  if (process.env.AZURE_TRANSLATOR_KEY) return "azure";
  if (process.env.GOOGLE_TRANSLATE_API_KEY) return "google";
  return null;
}

interface Batch {
  texts: string[];
  sourceLang: string | null;
}

async function azure(texts: string[], to: string): Promise<Batch> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Ocp-Apim-Subscription-Key": process.env.AZURE_TRANSLATOR_KEY!,
  };
  if (process.env.AZURE_TRANSLATOR_REGION) headers["Ocp-Apim-Subscription-Region"] = process.env.AZURE_TRANSLATOR_REGION;
  const endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || "https://api.cognitive.microsofttranslator.com";
  const res = await fetch(`${endpoint}/translate?api-version=3.0&to=${encodeURIComponent(to)}`, {
    method: "POST",
    headers,
    body: JSON.stringify(texts.map((Text) => ({ Text }))),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Azure Translator ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { detectedLanguage?: { language: string }; translations: { text: string }[] }[];
  return { texts: body.map((r) => r.translations[0]?.text ?? ""), sourceLang: body[0]?.detectedLanguage?.language ?? null };
}

async function google(texts: string[], to: string): Promise<Batch> {
  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(process.env.GOOGLE_TRANSLATE_API_KEY!)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: texts, target: to, format: "text" }),
      signal: AbortSignal.timeout(10_000),
    }
  );
  if (!res.ok) throw new Error(`Google Translate ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { data: { translations: { translatedText: string; detectedSourceLanguage?: string }[] } };
  const rows = body.data.translations;
  return { texts: rows.map((r) => r.translatedText), sourceLang: rows[0]?.detectedSourceLanguage ?? null };
}

export interface ReviewTranslationResult {
  /** review_reasons.id → translated text */
  texts: Record<string, string>;
  sourceLang: string | null;
  cached: boolean;
}

export type TranslateOutcome =
  | { ok: true; result: ReviewTranslationResult }
  | { ok: false; status: number; code: string; message: string };

/** Translates an approved review's written reasons into `to`, using the cache when it covers them. */
export async function translateReview(reviewId: string, to: string, allowNew: () => boolean): Promise<TranslateOutcome> {
  const review = await prisma.review.findFirst({
    where: { id: reviewId, status: "APPROVED" },
    select: { reasons: { select: { id: true, text: true } } },
  });
  if (!review) return { ok: false, status: 404, code: "NOT_FOUND", message: "Review not found" };

  const cached = await prisma.reviewTranslation.findUnique({ where: { reviewId_targetLang: { reviewId, targetLang: to } } });
  const cachedTexts = (cached?.texts ?? {}) as Record<string, string>;
  if (cached && review.reasons.every((r) => typeof cachedTexts[r.id] === "string")) {
    return { ok: true, result: { texts: cachedTexts, sourceLang: cached.sourceLang, cached: true } };
  }

  const provider = translationProvider();
  if (!provider) return { ok: false, status: 503, code: "NOT_CONFIGURED", message: "Translation is not set up" };
  if (!allowNew()) return { ok: false, status: 429, code: "RATE_LIMITED", message: "Too many translations. Try again later." };

  const reasons = review.reasons;
  if (reasons.reduce((n, r) => n + r.text.length, 0) > 20_000) {
    return { ok: false, status: 413, code: "TOO_LONG", message: "This review is too long to translate" };
  }

  let batch: Batch;
  try {
    batch = provider === "azure" ? await azure(reasons.map((r) => r.text), to) : await google(reasons.map((r) => r.text), to);
  } catch (err) {
    console.error("[translate]", err);
    return { ok: false, status: 502, code: "PROVIDER_ERROR", message: "Translation failed" };
  }

  const texts = Object.fromEntries(reasons.map((r, i) => [r.id, batch.texts[i] ?? r.text]));
  await prisma.reviewTranslation.upsert({
    where: { reviewId_targetLang: { reviewId, targetLang: to } },
    create: { reviewId, targetLang: to, sourceLang: batch.sourceLang, texts, provider },
    update: { sourceLang: batch.sourceLang, texts, provider, createdAt: new Date() },
  });
  return { ok: true, result: { texts, sourceLang: batch.sourceLang, cached: false } };
}
