-- AlterEnum: add PLANIFIE value (must run outside transaction)
ALTER TYPE "AnnouncementStatus" ADD VALUE 'PLANIFIE';

-- AlterTable: add expiresAt to announcements
ALTER TABLE "announcements" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateTable: announcement_photos
CREATE TABLE "announcement_photos" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "annonceId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcement_photos_annonceId_idx" ON "announcement_photos"("annonceId");

-- AddForeignKey
ALTER TABLE "announcement_photos" ADD CONSTRAINT "announcement_photos_annonceId_fkey"
    FOREIGN KEY ("annonceId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_photos" ADD CONSTRAINT "announcement_photos_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
