import { SearchHero } from "@/components/home/SearchHero";
import { CategoryChips } from "@/components/home/CategoryChips";
import { PopularLocalities } from "@/components/home/PopularLocalities";
import { FeaturedProperties } from "@/components/home/FeaturedProperties";
import { Footer } from "@/components/layout/Footer";
import { brand } from "@/lib/brand";
import { getCategoryTree } from "@/lib/db/categories";
import { getT } from "@/lib/i18n/server";
import { categoryName } from "@/lib/i18n/translate";

export default async function Home() {
  const categories = await getCategoryTree();
  const t = getT();
  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <SearchHero categories={categories.map(({ slug, name }) => ({ slug, name: categoryName(t, slug, name) }))} />
      <CategoryChips />
      <PopularLocalities />
      <FeaturedProperties />
      <Footer />
    </main>
  );
}
