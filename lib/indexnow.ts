import "server-only";
import { SITE_URL } from "@/lib/site";

/**
 * IndexNow (https://www.indexnow.org): tells Bing, Yandex, Seznam and Naver
 * that a page changed, so it is recrawled within hours instead of weeks.
 * Bing's index also feeds ChatGPT search and Copilot.
 *
 * The key comes from INDEXNOW_KEY in .env (deploy/deploy.sh creates one) and
 * is served at /indexnow-key.txt so the engines can check we own the site.
 * Does nothing without a key or outside production. Never throws.
 */
export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "";

export function pingIndexNow(paths: string[]): void {
  if (!INDEXNOW_KEY || process.env.NODE_ENV !== "production" || !paths.length) return;
  const host = new URL(SITE_URL).host;
  fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/indexnow-key.txt`,
      urlList: paths.map((p) => SITE_URL + p),
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch((e) => console.warn("IndexNow ping failed:", e instanceof Error ? e.message : e));
}
