import { SearchHero } from "@/components/home/SearchHero";
import { CategoryChips } from "@/components/home/CategoryChips";
import { PopularLocalities } from "@/components/home/PopularLocalities";
import { FeaturedProperties } from "@/components/home/FeaturedProperties";
import { BannerCarousel } from "@/components/home/BannerCarousel";
import { Footer } from "@/components/layout/Footer";
import { liveBanners } from "@/lib/banners";
import { brand } from "@/lib/brand";
import { getCategoryTree } from "@/lib/db/categories";
import { getT } from "@/lib/i18n/server";
import { categoryName } from "@/lib/i18n/translate";
import { SHARE_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

// Only the home page points its canonical at "/". (It used to be set in the
// root layout, which made every page without its own canonical, such as
// /privacy and /terms, claim to be a copy of the home page.)
export const metadata = { alternates: { canonical: "/" } };

// Tells Google and AI answer engines who runs the site and how to search it
// (sitelinks search box, knowledge panel name and logo).
const SITE_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}${SHARE_IMAGE.url}`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      inLanguage: "en-IN",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default async function Home() {
  const [categories, banners] = await Promise.all([getCategoryTree(), liveBanners("HOME_HERO").catch(() => [])]);
  const t = getT();
  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_DATA) }} />
      <SearchHero
        categories={categories.map(({ slug, name }) => ({ slug, name: categoryName(t, slug, name) }))}
        top={banners.length ? <BannerCarousel banners={banners} /> : undefined}
      />
      <CategoryChips />
      <PopularLocalities />
      <FeaturedProperties />
      <Footer />
    </main>
  );
}
