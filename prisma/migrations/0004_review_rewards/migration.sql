-- Review rewards: points ledger and helpful votes.
-- CreateEnum
CREATE TYPE "PointKind" AS ENUM ('VERIFIED_REVIEW', 'PHOTO', 'HELPFUL_VOTE');

-- CreateTable
CREATE TABLE "helpful_votes" (
    "reviewId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "helpful_votes_pkey" PRIMARY KEY ("reviewId","userId")
);

-- CreateTable
CREATE TABLE "point_events" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "kind" "PointKind" NOT NULL,
    "points" INTEGER NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "availableAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "helpful_votes_userId_idx" ON "helpful_votes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "point_events_dedupeKey_key" ON "point_events"("dedupeKey");

-- CreateIndex
CREATE INDEX "point_events_userId_createdAt_idx" ON "point_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "point_events_reviewId_kind_idx" ON "point_events"("reviewId", "kind");

-- AddForeignKey
ALTER TABLE "helpful_votes" ADD CONSTRAINT "helpful_votes_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpful_votes" ADD CONSTRAINT "helpful_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_events" ADD CONSTRAINT "point_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_events" ADD CONSTRAINT "point_events_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "point_events" ADD CONSTRAINT "point_events_points_positive" CHECK ("points" > 0);

-- Backfill: reviews already approved with an approved proof earn their points
-- now (held for 30 days like any new points).
INSERT INTO "point_events" ("id", "userId", "reviewId", "kind", "points", "dedupeKey", "availableAt")
SELECT gen_random_uuid(), r."userId", r."id", 'VERIFIED_REVIEW', 10, 'VERIFIED_REVIEW:' || r."id", now() + interval '30 days'
FROM "reviews" r
WHERE r."status" = 'APPROVED'
  AND EXISTS (SELECT 1 FROM "verification_proofs" p WHERE p."reviewId" = r."id" AND p."status" = 'APPROVED')
ON CONFLICT ("dedupeKey") DO NOTHING;

INSERT INTO "point_events" ("id", "userId", "reviewId", "kind", "points", "dedupeKey", "availableAt")
SELECT gen_random_uuid(), r."userId", r."id", 'PHOTO', 5, 'PHOTO:' || r."id", now() + interval '30 days'
FROM "reviews" r
WHERE r."status" = 'APPROVED'
  AND EXISTS (SELECT 1 FROM "verification_proofs" p WHERE p."reviewId" = r."id" AND p."status" = 'APPROVED')
  AND EXISTS (SELECT 1 FROM "review_media" m WHERE m."reviewId" = r."id" AND m."kind" = 'PHOTO' AND m."status" = 'APPROVED')
ON CONFLICT ("dedupeKey") DO NOTHING;
