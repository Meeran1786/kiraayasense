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

export default async function Home() {
  const [categories, banners] = await Promise.all([getCategoryTree(), liveBanners("HOME_HERO").catch(() => [])]);
  const t = getT();
  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
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
