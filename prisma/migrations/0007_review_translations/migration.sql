-- Machine translations of reviews, cached so each review is translated into
-- a language at most once.
CREATE TABLE "review_translations" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "targetLang" TEXT NOT NULL,
    "sourceLang" TEXT,
    "texts" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_translations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "review_translations_reviewId_targetLang_key" ON "review_translations"("reviewId", "targetLang");

ALTER TABLE "review_translations" ADD CONSTRAINT "review_translations_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
