-- AlterEnum (idempotent: ADD VALUE cannot be rolled back in PostgreSQL)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PHOTOGRAPHE';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "nom" DROP NOT NULL,
ALTER COLUMN "prenoms" DROP NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "camp_photos" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "campId" TEXT,
    "uploaderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "camp_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "camp_photos_campId_idx" ON "camp_photos"("campId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "camp_photos_uploaderId_idx" ON "camp_photos"("uploaderId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "camp_photos" ADD CONSTRAINT "camp_photos_campId_fkey"
    FOREIGN KEY ("campId") REFERENCES "camps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "camp_photos" ADD CONSTRAINT "camp_photos_uploaderId_fkey"
    FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
