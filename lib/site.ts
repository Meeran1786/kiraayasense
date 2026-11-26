/** Public origin of the site, used for canonical links and the sitemap. */
export const SITE_URL = (process.env.NEXTAUTH_URL || "https://kiraayasense.com").replace(/\/$/, "");
export const SITE_NAME = "KiraayaSense";
/** Shown when a page is shared or previewed (WhatsApp, X, search results). */
export const SHARE_IMAGE = { url: "/icons/icon-512.png", width: 512, height: 512, alt: "KiraayaSense" };
