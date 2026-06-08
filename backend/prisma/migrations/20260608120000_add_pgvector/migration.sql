-- pgvector : activé uniquement si l'extension est disponible sur le serveur PostgreSQL.
-- Sinon, l'app utilise le fallback FTS (voir VectorService).
DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    CREATE EXTENSION IF NOT EXISTS vector;

    ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "embedding" vector(1024);
    ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "embedding" vector(1024);

    CREATE INDEX IF NOT EXISTS "messages_embedding_idx"
      ON "messages" USING ivfflat ("embedding" vector_cosine_ops)
      WITH (lists = 100);

    CREATE INDEX IF NOT EXISTS "challenges_embedding_idx"
      ON "challenges" USING ivfflat ("embedding" vector_cosine_ops)
      WITH (lists = 50);
  ELSE
    RAISE NOTICE 'pgvector indisponible sur ce serveur — colonnes embedding ignorées';
  END IF;
END
$migration$;
