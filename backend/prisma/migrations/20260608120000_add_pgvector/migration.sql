-- Activer l'extension pgvector (nécessite PostgreSQL avec pgvector installé)
CREATE EXTENSION IF NOT EXISTS "vector";

-- Colonne embedding pour la recherche sémantique de messages
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "embedding" vector(1024);

-- Colonne embedding pour les défis similaires
ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "embedding" vector(1024);

-- Index IVFFlat pour la recherche par similarité cosinus (messages)
-- Paramètre lists = sqrt(nombre de lignes estimé) — ajuster si > 1M messages
CREATE INDEX IF NOT EXISTS "messages_embedding_idx"
  ON "messages" USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100);

-- Index IVFFlat pour les défis
CREATE INDEX IF NOT EXISTS "challenges_embedding_idx"
  ON "challenges" USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 50);
