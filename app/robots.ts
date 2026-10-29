import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in and moderator pages have nothing for search engines.
      disallow: ["/admin", "/api/", "/profile", "/business/new", "/property/*/claim"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
