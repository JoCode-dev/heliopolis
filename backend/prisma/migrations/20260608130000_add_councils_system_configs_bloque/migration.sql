-- Ajout de la valeur BLOQUE à l'enum ParticipationStatus
ALTER TYPE "ParticipationStatus" ADD VALUE IF NOT EXISTS 'BLOQUE';

-- Création de l'enum CouncilStatus (idempotent)
DO $$ BEGIN
  CREATE TYPE "CouncilStatus" AS ENUM ('PLANIFIE', 'EN_COURS', 'TERMINE', 'ANNULE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Création de la table councils (idempotent)
CREATE TABLE IF NOT EXISTS "councils" (
    "id"          TEXT NOT NULL,
    "nom"         TEXT NOT NULL,
    "description" TEXT,
    "date"        TIMESTAMP(3) NOT NULL,
    "lieu"        TEXT,
    "statut"      "CouncilStatus" NOT NULL DEFAULT 'PLANIFIE',
    "targetRoles" TEXT[],
    "regionId"    TEXT,
    "districtId"  TEXT,
    "parishId"    TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "councils_pkey" PRIMARY KEY ("id")
);

-- FK councils → regions (idempotent)
DO $$ BEGIN
  ALTER TABLE "councils" ADD CONSTRAINT "councils_regionId_fkey"
    FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- FK councils → districts (idempotent)
DO $$ BEGIN
  ALTER TABLE "councils" ADD CONSTRAINT "councils_districtId_fkey"
    FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- FK councils → parishes (idempotent)
DO $$ BEGIN
  ALTER TABLE "councils" ADD CONSTRAINT "councils_parishId_fkey"
    FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- FK councils → users (créateur, idempotent)
DO $$ BEGIN
  ALTER TABLE "councils" ADD CONSTRAINT "councils_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "councils_regionId_idx"   ON "councils"("regionId");
CREATE INDEX IF NOT EXISTS "councils_districtId_idx" ON "councils"("districtId");
CREATE INDEX IF NOT EXISTS "councils_date_idx"       ON "councils"("date");

-- Création de la table system_configs (idempotent)
CREATE TABLE IF NOT EXISTS "system_configs" (
    "key"       TEXT NOT NULL,
    "value"     TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("key")
);
