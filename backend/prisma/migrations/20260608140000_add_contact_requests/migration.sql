CREATE TABLE "contact_requests" (
    "id"        TEXT NOT NULL,
    "prenom"    TEXT NOT NULL,
    "contact"   TEXT NOT NULL,
    "role"      TEXT,
    "message"   TEXT,
    "lu"        BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contact_requests_createdAt_idx" ON "contact_requests"("createdAt");
