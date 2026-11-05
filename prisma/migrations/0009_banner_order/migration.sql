-- Home-page banner carousel: admin-set order of the banners.
ALTER TABLE "ad_banners" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

DROP INDEX "ad_banners_placement_status_idx";
CREATE INDEX "ad_banners_placement_status_sortOrder_idx" ON "ad_banners"("placement", "status", "sortOrder");
