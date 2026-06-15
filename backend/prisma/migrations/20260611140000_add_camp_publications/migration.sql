-- Recover partial state if 20260611092250 was marked applied without creating camp_photos
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PHOTOGRAPHE';

ALTER TABLE "users" ALTER COLUMN "nom" DROP NOT NULL,
ALTER COLUMN "prenoms" DROP NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "camp_publications" (
    "id" TEXT NOT NULL,
    "caption" TEXT,
    "campId" TEXT,
    "uploaderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "camp_publications_pkey" PRIMARY KEY ("id")
);

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'camp_photos'
  ) THEN
    -- No legacy table: create final schema directly (empty photothèque)
    CREATE TABLE "camp_photos" (
        "id" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "publicationId" TEXT NOT NULL,
        "uploaderId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "camp_photos_pkey" PRIMARY KEY ("id")
    );

  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'camp_photos' AND column_name = 'publicationId'
  ) THEN
    -- Already migrated
    NULL;

  ELSE
    -- Legacy schema (caption / campId): migrate rows into publications
    ALTER TABLE "camp_photos" ADD COLUMN IF NOT EXISTS "publicationId" TEXT;

    INSERT INTO "camp_publications" ("id", "caption", "campId", "uploaderId", "createdAt", "updatedAt")
    SELECT cp.id, cp.caption, cp."campId", cp."uploaderId", cp."createdAt", cp."updatedAt"
    FROM "camp_photos" cp
    WHERE NOT EXISTS (SELECT 1 FROM "camp_publications" pub WHERE pub.id = cp.id);

    UPDATE "camp_photos" SET "publicationId" = id WHERE "publicationId" IS NULL;

    ALTER TABLE "camp_photos" ALTER COLUMN "publicationId" SET NOT NULL;

    ALTER TABLE "camp_photos" DROP COLUMN IF EXISTS "caption";
    ALTER TABLE "camp_photos" DROP COLUMN IF EXISTS "campId";

    ALTER TABLE "camp_photos" DROP CONSTRAINT IF EXISTS "camp_photos_campId_fkey";
    DROP INDEX IF EXISTS "camp_photos_campId_idx";
  END IF;
END
$migration$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "camp_publications" ADD CONSTRAINT "camp_publications_campId_fkey"
    FOREIGN KEY ("campId") REFERENCES "camps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "camp_publications" ADD CONSTRAINT "camp_publications_uploaderId_fkey"
    FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "camp_photos" ADD CONSTRAINT "camp_photos_publicationId_fkey"
    FOREIGN KEY ("publicationId") REFERENCES "camp_publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "camp_photos" ADD CONSTRAINT "camp_photos_uploaderId_fkey"
    FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "camp_publications_campId_idx" ON "camp_publications"("campId");
CREATE INDEX IF NOT EXISTS "camp_publications_uploaderId_idx" ON "camp_publications"("uploaderId");
CREATE INDEX IF NOT EXISTS "camp_photos_publicationId_idx" ON "camp_photos"("publicationId");
CREATE INDEX IF NOT EXISTS "camp_photos_uploaderId_idx" ON "camp_photos"("uploaderId");
