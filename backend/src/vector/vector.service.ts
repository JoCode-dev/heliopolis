import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface MessageSearchRow {
  id: string;
  contenu: string | null;
  conversationId: string;
  authorId: string | null;
  createdAt: Date;
  similarity?: number;
  rank?: number;
}

@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name);
  private readonly voyageApiKey = process.env.VOYAGE_API_KEY;
  private pgvectorAvailable: boolean | null = null;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.checkPgvector();
  }

  private async checkPgvector(): Promise<void> {
    try {
      await this.prisma.$queryRawUnsafe(
        `SELECT 1 FROM pg_extension WHERE extname = 'vector'`,
      );
      this.pgvectorAvailable = true;
      this.logger.log('pgvector disponible — recherche vectorielle activée');
    } catch {
      this.pgvectorAvailable = false;
      this.logger.warn('pgvector absent — recherche plein texte utilisée en fallback');
    }
  }

  // ── Embedding via VoyageAI (Anthropic) ────────────────────────────────────

  async embed(text: string): Promise<number[] | null> {
    if (!this.voyageApiKey || !text.trim()) return null;
    try {
      const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.voyageApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: [text], model: 'voyage-3' }),
      });
      if (!response.ok) {
        this.logger.warn(`VoyageAI error ${response.status}`);
        return null;
      }
      const data = (await response.json()) as {
        data: { embedding: number[] }[];
      };
      return data.data[0]?.embedding ?? null;
    } catch (err) {
      this.logger.warn(
        `Embedding échoué : ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  // ── Indexation d'un message ────────────────────────────────────────────────

  async indexMessage(messageId: string, text: string): Promise<void> {
    if (!this.pgvectorAvailable || !text.trim()) return;
    const embedding = await this.embed(text);
    if (!embedding) return;
    const vec = `[${embedding.join(',')}]`;
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE messages SET embedding = $1::vector WHERE id = $2`,
        vec,
        messageId,
      );
    } catch (err) {
      this.logger.warn(
        `Indexation message échouée : ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async indexChallenge(challengeId: string, text: string): Promise<void> {
    if (!this.pgvectorAvailable || !text.trim()) return;
    const embedding = await this.embed(text);
    if (!embedding) return;
    const vec = `[${embedding.join(',')}]`;
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE challenges SET embedding = $1::vector WHERE id = $2`,
        vec,
        challengeId,
      );
    } catch (err) {
      this.logger.warn(
        `Indexation défi échouée : ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ── Recherche de messages ──────────────────────────────────────────────────

  async searchMessages(
    query: string,
    userId: string,
    limit = 15,
  ): Promise<MessageSearchRow[]> {
    if (!query.trim()) return [];

    const embedding = this.pgvectorAvailable ? await this.embed(query) : null;

    if (embedding) {
      const vec = `[${embedding.join(',')}]`;
      try {
        // $1 = vec (réutilisé deux fois), $2 = userId, $3 = limit
        return await this.prisma.$queryRawUnsafe<MessageSearchRow[]>(
          `SELECT
            m.id,
            m.contenu,
            m."conversationId",
            m."authorId",
            m."createdAt",
            1 - (m.embedding <=> $1::vector) AS similarity
          FROM messages m
          JOIN conversation_members cm ON cm."conversationId" = m."conversationId"
          WHERE cm."userId" = $2
            AND cm."leftAt" IS NULL
            AND m."deletedAt" IS NULL
            AND m.embedding IS NOT NULL
          ORDER BY m.embedding <=> $1::vector
          LIMIT $3`,
          vec,
          userId,
          limit,
        );
      } catch (err) {
        this.logger.warn(
          `Recherche vectorielle échouée, fallback FTS : ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Fallback : recherche plein texte PostgreSQL
    // $1 = query (réutilisé deux fois), $2 = userId, $3 = limit
    return this.prisma.$queryRawUnsafe<MessageSearchRow[]>(
      `SELECT
        m.id,
        m.contenu,
        m."conversationId",
        m."authorId",
        m."createdAt",
        ts_rank(
          to_tsvector('french', COALESCE(m.contenu, '')),
          plainto_tsquery('french', $1)
        ) AS rank
      FROM messages m
      JOIN conversation_members cm ON cm."conversationId" = m."conversationId"
      WHERE cm."userId" = $2
        AND cm."leftAt" IS NULL
        AND m."deletedAt" IS NULL
        AND m.contenu IS NOT NULL
        AND to_tsvector('french', m.contenu) @@ plainto_tsquery('french', $1)
      ORDER BY rank DESC
      LIMIT $3`,
      query,
      userId,
      limit,
    );
  }

  // ── Défis similaires ───────────────────────────────────────────────────────

  async similarChallenges(challengeId: string, limit = 5) {
    if (!this.pgvectorAvailable) return [];
    try {
      // $1 = challengeId (réutilisé dans la sous-requête et le WHERE), $2 = limit
      return await this.prisma.$queryRawUnsafe(
        `SELECT
          c.id, c.titre, c.description, c.categorie, c.niveau,
          1 - (c.embedding <=> ref.embedding) AS similarity
        FROM challenges c, (
          SELECT embedding FROM challenges WHERE id = $1
        ) ref
        WHERE c.id != $1
          AND c.embedding IS NOT NULL
          AND ref.embedding IS NOT NULL
          AND c.statut = 'ACTIF'
        ORDER BY c.embedding <=> ref.embedding
        LIMIT $2`,
        challengeId,
        limit,
      );
    } catch {
      return [];
    }
  }
}
