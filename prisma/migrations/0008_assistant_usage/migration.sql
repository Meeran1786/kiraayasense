-- Ask KiraayaSense: questions and estimated spend per user per day, for the
-- per-user daily limit and the site-wide daily budget.
CREATE TABLE "assistant_usage" (
    "userId" UUID NOT NULL,
    "day" DATE NOT NULL,
    "questions" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costMicroUsd" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_usage_pkey" PRIMARY KEY ("userId","day")
);

CREATE INDEX "assistant_usage_day_idx" ON "assistant_usage"("day");

ALTER TABLE "assistant_usage" ADD CONSTRAINT "assistant_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
