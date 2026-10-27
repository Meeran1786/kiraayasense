import { SearchHero } from "@/components/home/SearchHero";
import { CategoryChips } from "@/components/home/CategoryChips";
import { PopularLocalities } from "@/components/home/PopularLocalities";
import { FeaturedProperties } from "@/components/home/FeaturedProperties";
import { Footer } from "@/components/layout/Footer";
import { brand } from "@/lib/brand";

export default async function Home() {
  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <SearchHero />
      <CategoryChips />
      <PopularLocalities />
      <FeaturedProperties />
      <Footer />
    </main>
  );
}
