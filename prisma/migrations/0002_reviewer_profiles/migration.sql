-- Public reviewer profiles (/u/<handle>).
CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

ALTER TABLE "users" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "handle" TEXT,
ADD COLUMN     "profileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'PUBLIC';

-- Existing users get a placeholder handle they can change on /profile.
UPDATE "users" SET "handle" = 'user-' || left(replace("id"::text, '-', ''), 10) WHERE "handle" IS NULL;

CREATE UNIQUE INDEX "users_handle_key" ON "users"("handle");

ALTER TABLE "users" ADD CONSTRAINT "users_handle_format"
  CHECK ("handle" IS NULL OR "handle" ~ '^[a-z0-9][a-z0-9-]{2,29}$');
ALTER TABLE "users" ADD CONSTRAINT "users_bio_length" CHECK (char_length("bio") <= 280);
