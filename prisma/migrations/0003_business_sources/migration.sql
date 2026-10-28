-- Business listings from open data (OSM, Overture, MCA), import bookkeeping, and owner claims.
-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('USER', 'ADMIN', 'OSM', 'OVERTURE', 'MCA');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportAction" AS ENUM ('CREATED', 'UPDATED', 'MERGED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "BusinessClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "localities" ADD COLUMN     "location" geography(Point, 4326);

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "cin" TEXT,
ADD COLUMN     "source" "DataSource" NOT NULL DEFAULT 'USER',
ADD COLUMN     "sourceRef" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" UUID NOT NULL,
    "source" "DataSource" NOT NULL,
    "area" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'RUNNING',
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "merged" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_records" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "action" "ImportAction" NOT NULL,
    "reason" TEXT,
    "propertyId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_claims" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "claimantRole" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "workEmail" TEXT,
    "proofStorageKey" TEXT,
    "message" TEXT,
    "status" "BusinessClaimStatus" NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_jobs_startedAt_idx" ON "import_jobs"("startedAt");

-- CreateIndex
CREATE INDEX "import_records_jobId_action_idx" ON "import_records"("jobId", "action");

-- CreateIndex
CREATE INDEX "business_claims_status_createdAt_idx" ON "business_claims"("status", "createdAt");

-- CreateIndex
CREATE INDEX "business_claims_propertyId_idx" ON "business_claims"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "properties_cin_key" ON "properties"("cin");

-- CreateIndex
CREATE UNIQUE INDEX "properties_source_sourceRef_key" ON "properties"("source", "sourceRef");

-- AddForeignKey
ALTER TABLE "import_records" ADD CONSTRAINT "import_records_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_records" ADD CONSTRAINT "import_records_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_claims" ADD CONSTRAINT "business_claims_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_claims" ADD CONSTRAINT "business_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_claims" ADD CONSTRAINT "business_claims_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


CREATE INDEX "localities_location_gist" ON "localities" USING GIST ("location");

-- One open claim per user per business.
CREATE UNIQUE INDEX "business_claims_one_pending" ON "business_claims"("propertyId", "userId") WHERE "status" = 'PENDING';

-- Imported listings must say which source record they came from.
ALTER TABLE "properties" ADD CONSTRAINT "properties_import_has_ref" CHECK ("source" IN ('USER', 'ADMIN') OR "sourceRef" IS NOT NULL);
