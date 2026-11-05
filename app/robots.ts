import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Signed-in and moderator pages have nothing for search engines.
const PRIVATE = ["/admin", "/api/", "/profile", "/owner", "/embed/", "/badge/", "/business/new", "/property/*/claim"];

// AI search and assistant crawlers, named so it is explicit that KiraayaSense
// wants to be read and cited by them (GEO). A crawler that matches a named
// group ignores the "*" group, so each group repeats the private paths.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "DuckAssistBot",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
