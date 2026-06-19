import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async withDbRetry<T>(label: string, operation: () => Promise<T>): Promise<T> {
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await operation();
      } catch (err) {
        lastError = err;
        if (!isConnectionError(err) || attempt === maxAttempts) break;

        const wait = 300 * attempt;
        this.logger.warn(
          `${label} — connexion DB interrompue, nouvelle tentative ${attempt + 1}/${maxAttempts} dans ${wait}ms`,
        );
        await this.prisma.$connect().catch(() => {});
        await sleep(wait);
      }
    }

    throw lastError;
  }

  // ── Camps ─────────────────────────────────────────────────────────────────
  // Logique de transition :
  //   BROUILLON | OUVERT  →  EN_COURS  quand dateDebut ≤ aujourd'hui ≤ dateFin
  //   BROUILLON | OUVERT | EN_COURS  →  CLOTURE  quand dateFin < aujourd'hui
  //   CLOTURE  →  ARCHIVE  30 jours après dateFin

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateCampStatuses() {
    try {
      const today = startOfToday();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const enCours = await this.withDbRetry('Camps EN_COURS', () =>
        this.prisma.camp.updateMany({
          where: { statut: { in: ['OUVERT'] }, dateDebut: { lte: today }, dateFin: { gte: today } },
          data: { statut: 'EN_COURS' },
        }),
      );
      const clotures = await this.withDbRetry('Camps CLOTURE', () =>
        this.prisma.camp.updateMany({
          where: { statut: { in: ['BROUILLON', 'OUVERT', 'EN_COURS'] }, dateFin: { lt: today } },
          data: { statut: 'CLOTURE' },
        }),
      );
      const archives = await this.withDbRetry('Camps ARCHIVE', () =>
        this.prisma.camp.updateMany({
          where: { statut: 'CLOTURE', dateFin: { lt: thirtyDaysAgo } },
          data: { statut: 'ARCHIVE' },
        }),
      );

      const total = enCours.count + clotures.count + archives.count;
      if (total > 0) {
        this.logger.log(
          `Camps mis à jour — EN_COURS: ${enCours.count}, CLOTURE: ${clotures.count}, ARCHIVE: ${archives.count}`,
        );
      }
    } catch (err) {
      this.logger.error('Échec mise à jour statuts camps', err instanceof Error ? err.stack : String(err));
    }
  }

  // ── Conseils ───────────────────────────────────────────────────────────────
  // Logique de transition :
  //   PLANIFIE  →  EN_COURS  le jour même (date ≥ début du jour)
  //   EN_COURS  →  TERMINE   le lendemain (date < début du jour)
  //   PLANIFIE  →  TERMINE   si la date est passée sans transition (rattrapage)

  @Cron(CronExpression.EVERY_HOUR)
  async updateCouncilStatuses() {
    try {
      const today    = startOfToday();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const enCours = await this.withDbRetry('Conseils EN_COURS', () =>
        this.prisma.council.updateMany({
          where: { statut: 'PLANIFIE', date: { gte: today, lt: tomorrow } },
          data: { statut: 'EN_COURS' },
        }),
      );
      const termines = await this.withDbRetry('Conseils TERMINE', () =>
        this.prisma.council.updateMany({
          where: { statut: 'EN_COURS', date: { lt: today } },
          data: { statut: 'TERMINE' },
        }),
      );
      const rattrapage = await this.withDbRetry('Conseils rattrapage', () =>
        this.prisma.council.updateMany({
          where: { statut: 'PLANIFIE', date: { lt: today } },
          data: { statut: 'TERMINE' },
        }),
      );

      const total = enCours.count + termines.count + rattrapage.count;
      if (total > 0) {
        this.logger.log(
          `Conseils mis à jour — EN_COURS: ${enCours.count}, TERMINE: ${termines.count + rattrapage.count}`,
        );
      }
    } catch (err) {
      this.logger.error('Échec mise à jour statuts conseils', err instanceof Error ? err.stack : String(err));
    }
  }

  // Exécuté au démarrage pour synchroniser immédiatement sans attendre le prochain cron
  async onModuleInit() {
    await this.updateCampStatuses();
    await this.updateCouncilStatuses();
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const CONNECTION_ERROR_MESSAGES = [
  'server has closed the connection',
  'connection terminated',
  'connection reset',
  'econnreset',
  'connection refused',
  'socket hang up',
];

function isConnectionError(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  if (err?.code === 'P1017') return true;
  if (err?.code === 'P1001' || err?.code === 'P2010') {
    const msg = (err?.message ?? '').toLowerCase();
    return CONNECTION_ERROR_MESSAGES.some((needle) => msg.includes(needle));
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
