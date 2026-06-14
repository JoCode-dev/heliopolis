-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'PHOTOGRAPHE';

-- DropIndex
DROP INDEX IF EXISTS "challenges_embedding_idx";

-- DropIndex
DROP INDEX IF EXISTS "messages_embedding_idx";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "nom" DROP NOT NULL,
ALTER COLUMN "prenoms" DROP NOT NULL;

-- CreateTable
CREATE TABLE "camp_photos" (
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
CREATE INDEX "camp_photos_campId_idx" ON "camp_photos"("campId");

-- CreateIndex
CREATE INDEX "camp_photos_uploaderId_idx" ON "camp_photos"("uploaderId");

-- AddForeignKey
ALTER TABLE "camp_photos" ADD CONSTRAINT "camp_photos_campId_fkey" FOREIGN KEY ("campId") REFERENCES "camps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_photos" ADD CONSTRAINT "camp_photos_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
