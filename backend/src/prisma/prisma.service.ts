import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

function formatDatabaseTarget(connectionString: string | undefined) {
  if (!connectionString) return 'DATABASE_URL absent';
  try {
    const url = new URL(connectionString);
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}${url.pathname}`;
  } catch {
    return 'DATABASE_URL invalide';
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private static readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;
  private heartbeat: NodeJS.Timeout | null = null;
  private pinging = false;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL est requis pour initialiser Prisma.');
    }

    const pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5_000,
      options: '-c statement_timeout=15000',
    });

    pool.on('error', (err) => {
      PrismaService.logger.warn(`pg pool error : ${err.message}`);
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      await this.$queryRaw`SELECT 1`;
      PrismaService.logger.log(
        `Base de données connectée : ${formatDatabaseTarget(process.env.DATABASE_URL)}`,
      );
    } catch (error) {
      PrismaService.logger.error(
        `Connexion Prisma impossible (${formatDatabaseTarget(process.env.DATABASE_URL)}). ` +
          "Si tu utilises Prisma dev, lance `npm run db:dev`, puis `npm run db:sync` avant de relancer l'API.",
      );
      throw error;
    }

    // Ping toutes les 20 s — health check et maintien de la connexion principale.
    this.heartbeat = setInterval(() => void this.ping(), 20_000);
  }

  private async ping() {
    if (this.pinging) return;
    this.pinging = true;
    try {
      await this.$queryRaw`SELECT 1`;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      PrismaService.logger.warn(`Heartbeat DB échoué : ${msg}`);
      // Tenter une reconnexion immédiate pour réchauffer le pool
      await this.$connect().catch(() => {});
    } finally {
      this.pinging = false;
    }
  }

  async onModuleDestroy() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    await this.$disconnect();
    await this.pool.end();
  }
}
