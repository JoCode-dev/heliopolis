-- CreateEnum
CREATE TYPE "CouncilStatus" AS ENUM ('PLANIFIE', 'EN_COURS', 'TERMINE', 'ANNULE');

-- AlterEnum
ALTER TYPE "ParticipationStatus" ADD VALUE 'BLOQUE';

-- AlterTable
ALTER TABLE "adhesions" ADD COLUMN "preuveUrl" TEXT;

-- CreateTable
CREATE TABLE "councils" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "lieu" TEXT,
    "statut" "CouncilStatus" NOT NULL DEFAULT 'PLANIFIE',
    "targetRoles" TEXT[],
    "regionId" TEXT,
    "districtId" TEXT,
    "parishId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "councils_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "councils_regionId_idx" ON "councils"("regionId");

-- CreateIndex
CREATE INDEX "councils_districtId_idx" ON "councils"("districtId");

-- CreateIndex
CREATE INDEX "councils_date_idx" ON "councils"("date");

-- AddForeignKey
ALTER TABLE "councils" ADD CONSTRAINT "councils_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "councils" ADD CONSTRAINT "councils_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "councils" ADD CONSTRAINT "councils_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "councils" ADD CONSTRAINT "councils_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
