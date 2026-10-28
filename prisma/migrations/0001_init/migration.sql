-- KiraayaSense v2 initial schema. PostGIS and pg_trgm must exist before the
-- properties table (geography column) is created.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GUEST', 'USER', 'MODERATOR', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'PHONE_OTP', 'EMAIL_OTP', 'PASSWORD');

-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "Relationship" AS ENUM ('TENANT_GUEST', 'CUSTOMER', 'EMPLOYEE', 'STUDENT_PARENT', 'PATIENT_FAMILY', 'VENDOR_SUPPLIER', 'JOB_APPLICANT');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('STAR', 'YES_NO', 'SINGLE_CHOICE', 'NUMBER');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('PENDING_VERIFICATION', 'APPROVED', 'REJECTED', 'MERGED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('UNCLAIMED', 'PENDING_VERIFICATION', 'VERIFIED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ReasonType" AS ENUM ('PRO', 'CON');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('PHOTO', 'VIDEO');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REDACTED');

-- CreateEnum
CREATE TYPE "ProofType" AS ENUM ('UPI_TRANSACTION', 'RENT_RECEIPT', 'BANK_STATEMENT', 'INVOICE_RECEIPT', 'OTHER_DOCUMENT');

-- CreateEnum
CREATE TYPE "ProofStatus" AS ENUM ('PENDING', 'AUTO_REDACTED', 'MANUALLY_REDACTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RedactionMethod" AS ENUM ('NONE', 'AUTO', 'MANUAL', 'AUTO_PLUS_MANUAL');

-- CreateEnum
CREATE TYPE "FlagResolution" AS ENUM ('OPEN', 'UPHELD', 'DISMISSED');

-- CreateEnum
CREATE TYPE "OwnerResponseStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BannerPlacement" AS ENUM ('HOME_HERO', 'LOCALITY_PAGE', 'SEARCH_INTERSTITIAL');

-- CreateEnum
CREATE TYPE "BannerStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BannerEventType" AS ENUM ('IMPRESSION', 'CLICK');

-- CreateEnum
CREATE TYPE "ExportType" AS ENUM ('PROPERTIES', 'ENGAGEMENT', 'MODERATION_THROUGHPUT');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarStorageKey" TEXT,
    "primaryEmail" TEXT,
    "primaryEmailVerifiedAt" TIMESTAMP(3),
    "primaryPhone" TEXT,
    "primaryPhoneVerifiedAt" TIMESTAMP(3),
    "alternateEmail" TEXT,
    "alternatePhone" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" UUID NOT NULL,
    "destination" TEXT NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "localities" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,

    CONSTRAINT "localities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" UUID,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "relationships" "Relationship"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_sets" (
    "id" UUID NOT NULL,
    "categoryId" UUID,
    "relationship" "Relationship" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "proofRequired" BOOLEAN NOT NULL DEFAULT false,
    "mediaRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "questionSetId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "helpText" TEXT,
    "type" "QuestionType" NOT NULL,
    "options" TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" UUID NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "doorNumber" TEXT,
    "street" TEXT,
    "localityId" UUID NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "googleMapsUrl" TEXT,
    "googlePlaceId" TEXT,
    "location" geography(Point, 4326),
    "approxRentMin" INTEGER,
    "approxRentMax" INTEGER,
    "unitCount" INTEGER,
    "ownerContactPhone" TEXT,
    "submittedById" UUID NOT NULL,
    "claimedByUserId" UUID,
    "claimStatus" "ClaimStatus" NOT NULL DEFAULT 'UNCLAIMED',
    "mergedIntoPropertyId" UUID,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "relationship" "Relationship" NOT NULL,
    "questionSetId" UUID NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "stayStartApprox" DATE,
    "stayEndApprox" DATE,
    "rejectionReason" TEXT,
    "moderatedById" UUID,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_answers" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "questionKey" TEXT NOT NULL,
    "starValue" INTEGER,
    "boolValue" BOOLEAN,
    "choiceValue" TEXT,
    "numberValue" DOUBLE PRECISION,

    CONSTRAINT "review_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_reasons" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "type" "ReasonType" NOT NULL,
    "questionKey" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "review_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_media" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT NOT NULL,
    "thumbnailKey" TEXT,
    "mimeType" TEXT NOT NULL,
    "widthPx" INTEGER,
    "heightPx" INTEGER,
    "durationSec" INTEGER,
    "byteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_proofs" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "proofType" "ProofType" NOT NULL,
    "status" "ProofStatus" NOT NULL DEFAULT 'PENDING',
    "redactionMethod" "RedactionMethod" NOT NULL DEFAULT 'NONE',
    "storageKey" TEXT NOT NULL,
    "redactedStorageKey" TEXT,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_flags" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "flaggedByUserId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "resolution" "FlagResolution" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_responses" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "respondedByUserId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "status" "OwnerResponseStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owner_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_banners" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "imageStorageKey" TEXT NOT NULL,
    "clickThroughUrl" TEXT NOT NULL,
    "placement" "BannerPlacement" NOT NULL,
    "status" "BannerStatus" NOT NULL DEFAULT 'DRAFT',
    "targetImpressions" INTEGER NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "advertiserName" TEXT NOT NULL,
    "advertiserContact" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banner_events" (
    "id" UUID NOT NULL,
    "bannerId" UUID NOT NULL,
    "eventType" "BannerEventType" NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banner_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" UUID NOT NULL,
    "requestedByUserId" UUID NOT NULL,
    "type" "ExportType" NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "fileStorageKey" TEXT,
    "errorMessage" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_primaryEmail_key" ON "users"("primaryEmail");

-- CreateIndex
CREATE UNIQUE INDEX "users_primaryPhone_key" ON "users"("primaryPhone");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "otp_challenges_destination_channel_idx" ON "otp_challenges"("destination", "channel");

-- CreateIndex
CREATE INDEX "localities_pincode_idx" ON "localities"("pincode");

-- CreateIndex
CREATE INDEX "localities_state_district_idx" ON "localities"("state", "district");

-- CreateIndex
CREATE UNIQUE INDEX "localities_name_district_pincode_key" ON "localities"("name", "district", "pincode");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_sortOrder_idx" ON "categories"("parentId", "sortOrder");

-- CreateIndex
CREATE INDEX "question_sets_relationship_isActive_idx" ON "question_sets"("relationship", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "question_sets_categoryId_relationship_version_key" ON "question_sets"("categoryId", "relationship", "version");

-- CreateIndex
CREATE UNIQUE INDEX "questions_questionSetId_key_key" ON "questions"("questionSetId", "key");

-- CreateIndex
CREATE INDEX "properties_status_categoryId_idx" ON "properties"("status", "categoryId");

-- CreateIndex
CREATE INDEX "properties_pincode_idx" ON "properties"("pincode");

-- CreateIndex
CREATE INDEX "properties_localityId_idx" ON "properties"("localityId");

-- CreateIndex
CREATE INDEX "reviews_propertyId_status_idx" ON "reviews"("propertyId", "status");

-- CreateIndex
CREATE INDEX "reviews_userId_idx" ON "reviews"("userId");

-- CreateIndex
CREATE INDEX "review_answers_questionKey_idx" ON "review_answers"("questionKey");

-- CreateIndex
CREATE UNIQUE INDEX "review_answers_reviewId_questionId_key" ON "review_answers"("reviewId", "questionId");

-- CreateIndex
CREATE INDEX "review_reasons_reviewId_idx" ON "review_reasons"("reviewId");

-- CreateIndex
CREATE INDEX "review_media_reviewId_status_idx" ON "review_media"("reviewId", "status");

-- CreateIndex
CREATE INDEX "verification_proofs_reviewId_status_idx" ON "verification_proofs"("reviewId", "status");

-- CreateIndex
CREATE INDEX "review_flags_reviewId_resolution_idx" ON "review_flags"("reviewId", "resolution");

-- CreateIndex
CREATE UNIQUE INDEX "review_flags_reviewId_flaggedByUserId_key" ON "review_flags"("reviewId", "flaggedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "owner_responses_reviewId_key" ON "owner_responses"("reviewId");

-- CreateIndex
CREATE INDEX "ad_banners_placement_status_idx" ON "ad_banners"("placement", "status");

-- CreateIndex
CREATE INDEX "banner_events_bannerId_eventType_createdAt_idx" ON "banner_events"("bannerId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "export_jobs_requestedByUserId_status_idx" ON "export_jobs"("requestedByUserId", "status");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_sets" ADD CONSTRAINT "question_sets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_questionSetId_fkey" FOREIGN KEY ("questionSetId") REFERENCES "question_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_localityId_fkey" FOREIGN KEY ("localityId") REFERENCES "localities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_mergedIntoPropertyId_fkey" FOREIGN KEY ("mergedIntoPropertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_questionSetId_fkey" FOREIGN KEY ("questionSetId") REFERENCES "question_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_answers" ADD CONSTRAINT "review_answers_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_answers" ADD CONSTRAINT "review_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_reasons" ADD CONSTRAINT "review_reasons_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_media" ADD CONSTRAINT "review_media_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_proofs" ADD CONSTRAINT "verification_proofs_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_flags" ADD CONSTRAINT "review_flags_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_flags" ADD CONSTRAINT "review_flags_flaggedByUserId_fkey" FOREIGN KEY ("flaggedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_responses" ADD CONSTRAINT "owner_responses_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_responses" ADD CONSTRAINT "owner_responses_respondedByUserId_fkey" FOREIGN KEY ("respondedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_banners" ADD CONSTRAINT "ad_banners_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banner_events" ADD CONSTRAINT "banner_events_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "ad_banners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ── Raw SQL Prisma can't express ──────────────────────────────────────────

-- Spatial + fuzzy-match indexes (FR-DISC-1, FR-DISC-3)
CREATE INDEX "properties_location_gist" ON "properties" USING GIST ("location");
CREATE INDEX "properties_name_trgm" ON "properties" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "localities_name_trgm" ON "localities" USING GIN ("name" gin_trgm_ops);

-- CHECK constraints
ALTER TABLE "review_answers"
  ADD CONSTRAINT "star_range" CHECK ("starValue" IS NULL OR "starValue" BETWEEN 1 AND 5);
ALTER TABLE "review_reasons"
  ADD CONSTRAINT "reason_min_length" CHECK (char_length("text") >= 20);
ALTER TABLE "owner_responses"
  ADD CONSTRAINT "response_max_length" CHECK (char_length("text") <= 1000);

-- Per-business, per-metric averages over approved reviews. Plain view for
-- now (computed on read); switch to a materialized view refreshed by the
-- worker once review volume makes that worthwhile.
CREATE VIEW "property_metric_averages" AS
SELECT
  r."propertyId" AS property_id,
  a."questionKey" AS question_key,
  avg(a."starValue")::float AS avg_score,
  count(*) AS answer_count
FROM "review_answers" a
JOIN "reviews" r ON r.id = a."reviewId" AND r.status = 'APPROVED'
WHERE a."starValue" IS NOT NULL
GROUP BY r."propertyId", a."questionKey";
