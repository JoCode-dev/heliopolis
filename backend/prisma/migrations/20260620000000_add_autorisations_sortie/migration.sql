-- CreateEnum
CREATE TYPE "AutorisationStatut" AS ENUM ('EN_ATTENTE', 'APPROUVEE', 'REFUSEE');

-- AlterTable: ajouter chargeSecurite aux participants de camp
ALTER TABLE "camp_participants" ADD COLUMN "chargeSecurite" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: autorisations_sortie
CREATE TABLE "autorisations_sortie" (
    "id" TEXT NOT NULL,
    "campId" TEXT NOT NULL,
    "demandeurId" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "statut" "AutorisationStatut" NOT NULL DEFAULT 'EN_ATTENTE',
    "reponse" TEXT,
    "valideurId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "autorisations_sortie_pkey" PRIMARY KEY ("id")
);

-- CreateTable: autorisation_sortie_personnes
CREATE TABLE "autorisation_sortie_personnes" (
    "id" TEXT NOT NULL,
    "autorisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nomSnapshot" TEXT NOT NULL,

    CONSTRAINT "autorisation_sortie_personnes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "autorisations_sortie_campId_statut_idx" ON "autorisations_sortie"("campId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "autorisation_sortie_personnes_autorisationId_userId_key" ON "autorisation_sortie_personnes"("autorisationId", "userId");

-- AddForeignKey
ALTER TABLE "autorisations_sortie" ADD CONSTRAINT "autorisations_sortie_campId_fkey"
    FOREIGN KEY ("campId") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "autorisations_sortie" ADD CONSTRAINT "autorisations_sortie_demandeurId_fkey"
    FOREIGN KEY ("demandeurId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "autorisations_sortie" ADD CONSTRAINT "autorisations_sortie_valideurId_fkey"
    FOREIGN KEY ("valideurId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "autorisation_sortie_personnes" ADD CONSTRAINT "autorisation_sortie_personnes_autorisationId_fkey"
    FOREIGN KEY ("autorisationId") REFERENCES "autorisations_sortie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "autorisation_sortie_personnes" ADD CONSTRAINT "autorisation_sortie_personnes_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
