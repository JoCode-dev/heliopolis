ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "duree" INTEGER;

ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "pointsRequis" INTEGER;
UPDATE "challenges" SET "pointsRequis" = 0 WHERE "pointsRequis" IS NULL;
ALTER TABLE "challenges" ALTER COLUMN "pointsRequis" SET DEFAULT 0;
ALTER TABLE "challenges" ALTER COLUMN "pointsRequis" SET NOT NULL;
