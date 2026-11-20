-- Separate from 0011 because Postgres can't use a new enum value in the
-- transaction that adds it.

-- Everyone who joined before sign-up points existed gets the 50-point
-- welcome bonus too, on the usual 30-day hold from when they joined.
INSERT INTO "point_events" ("id", "userId", "kind", "points", "dedupeKey", "availableAt", "createdAt")
SELECT gen_random_uuid(), u."id", 'SIGNUP', 50, 'SIGNUP:' || u."id", u."createdAt" + INTERVAL '30 days', u."createdAt"
FROM "users" u
WHERE u."status" = 'ACTIVE'
ON CONFLICT ("dedupeKey") DO NOTHING;

-- An invite code for every existing user (new users get one on first sign-in).
UPDATE "users"
SET "referralCode" = upper(substr(md5(random()::text || "id"::text), 1, 8))
WHERE "referralCode" IS NULL;
