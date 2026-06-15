-- AlterEnum
ALTER TYPE "AnnouncementStatus" ADD VALUE IF NOT EXISTS 'PLANIFIE';

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "announcement_photos" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "annonceId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "announcement_photos_annonceId_idx" ON "announcement_photos"("annonceId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "announcement_photos" ADD CONSTRAINT "announcement_photos_annonceId_fkey"
    FOREIGN KEY ("annonceId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "announcement_photos" ADD CONSTRAINT "announcement_photos_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
