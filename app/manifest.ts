import type { MetadataRoute } from "next";

/** Makes the site installable as an app on Android, iOS and desktop (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KiraayaSense — honest, proof-backed reviews",
    short_name: "KiraayaSense",
    description: "Ratings and reviews of homes, PGs, employers and local businesses across India.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#141a2e",
    theme_color: "#141a2e",
    lang: "en-IN",
    categories: ["lifestyle", "shopping", "travel"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Search", url: "/search" },
      { name: "My reviews", url: "/profile" },
      { name: "Business owners", url: "/owner" },
    ],
  };
}
