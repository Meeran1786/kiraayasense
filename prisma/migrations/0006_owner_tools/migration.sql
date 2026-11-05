-- Owner replies are moderated (FR-REV-7): keep who decided, when, and why a
-- reply was turned down, and when the owner last edited it.
ALTER TABLE "owner_responses"
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "moderatedById" UUID,
  ADD COLUMN "moderatedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "owner_responses_status_updatedAt_idx" ON "owner_responses"("status", "updatedAt");

-- Review reports (FR-REV-8): the reporter's explanation and the moderator
-- who settled the report.
ALTER TABLE "review_flags"
  ADD COLUMN "details" TEXT,
  ADD COLUMN "resolvedById" UUID;
