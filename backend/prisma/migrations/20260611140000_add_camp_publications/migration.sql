-- CreateTable
CREATE TABLE "camp_publications" (
    "id" TEXT NOT NULL,
    "caption" TEXT,
    "campId" TEXT,
    "uploaderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "camp_publications_pkey" PRIMARY KEY ("id")
);

-- AddColumn to camp_photos
ALTER TABLE "camp_photos" ADD COLUMN "publicationId" TEXT;

-- Migrate existing data: create one publication per existing photo
INSERT INTO "camp_publications" ("id", "caption", "campId", "uploaderId", "createdAt", "updatedAt")
SELECT id, caption, "campId", "uploaderId", "createdAt", "updatedAt" FROM "camp_photos";

-- Set publicationId = id for existing photos (each photo becomes its own publication)
UPDATE "camp_photos" SET "publicationId" = id;

-- Now make publicationId NOT NULL
ALTER TABLE "camp_photos" ALTER COLUMN "publicationId" SET NOT NULL;

-- Drop old columns from camp_photos
ALTER TABLE "camp_photos" DROP COLUMN IF EXISTS "caption";
ALTER TABLE "camp_photos" DROP COLUMN IF EXISTS "campId";

-- AddForeignKey
ALTER TABLE "camp_publications" ADD CONSTRAINT "camp_publications_campId_fkey" FOREIGN KEY ("campId") REFERENCES "camps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "camp_publications" ADD CONSTRAINT "camp_publications_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "camp_photos" ADD CONSTRAINT "camp_photos_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "camp_publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "camp_publications_campId_idx" ON "camp_publications"("campId");
CREATE INDEX "camp_publications_uploaderId_idx" ON "camp_publications"("uploaderId");
CREATE INDEX "camp_photos_publicationId_idx" ON "camp_photos"("publicationId");
