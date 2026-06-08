-- AlterTable: add qrToken to councils
ALTER TABLE "councils" ADD COLUMN "qrToken" TEXT;

-- Backfill existing rows with unique tokens
UPDATE "councils" SET "qrToken" = gen_random_uuid()::text WHERE "qrToken" IS NULL;

-- Make qrToken required and unique
ALTER TABLE "councils" ALTER COLUMN "qrToken" SET NOT NULL;
CREATE UNIQUE INDEX "councils_qrToken_key" ON "councils"("qrToken");

-- CreateTable
CREATE TABLE "council_participants" (
    "id" TEXT NOT NULL,
    "councilId" TEXT NOT NULL,
    "userId" TEXT,
    "nom" TEXT NOT NULL,
    "prenoms" TEXT NOT NULL,
    "contact" TEXT,
    "districtId" TEXT,
    "parishId" TEXT,
    "fonction" TEXT,
    "note" INTEGER,
    "avis" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "council_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "council_participants_councilId_idx" ON "council_participants"("councilId");

-- CreateIndex
CREATE UNIQUE INDEX "council_participants_councilId_userId_key" ON "council_participants"("councilId", "userId");

-- AddForeignKey
ALTER TABLE "council_participants" ADD CONSTRAINT "council_participants_councilId_fkey" FOREIGN KEY ("councilId") REFERENCES "councils"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "council_participants" ADD CONSTRAINT "council_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "council_participants" ADD CONSTRAINT "council_participants_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "council_participants" ADD CONSTRAINT "council_participants_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
