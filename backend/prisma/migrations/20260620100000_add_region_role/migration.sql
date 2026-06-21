-- CreateEnum
CREATE TYPE "RegionRole" AS ENUM ('RESPONSABLE', 'ADJOINT', 'CHARGE_COMMUNICATION');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "regionRole" "RegionRole";
