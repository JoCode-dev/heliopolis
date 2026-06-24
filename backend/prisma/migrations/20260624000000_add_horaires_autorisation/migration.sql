-- AlterTable
ALTER TABLE "autorisations_sortie" ADD COLUMN "heureSortie" TIMESTAMP(3) NOT NULL,
ADD COLUMN "dateHeureRetour" TIMESTAMP(3) NOT NULL;
