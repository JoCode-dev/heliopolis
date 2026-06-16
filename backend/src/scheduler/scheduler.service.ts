import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

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

      const [enCours, clotures, archives] = await Promise.all([
        this.prisma.camp.updateMany({
          where: { statut: { in: ['OUVERT'] }, dateDebut: { lte: today }, dateFin: { gte: today } },
          data: { statut: 'EN_COURS' },
        }),
        this.prisma.camp.updateMany({
          where: { statut: { in: ['BROUILLON', 'OUVERT', 'EN_COURS'] }, dateFin: { lt: today } },
          data: { statut: 'CLOTURE' },
        }),
        this.prisma.camp.updateMany({
          where: { statut: 'CLOTURE', dateFin: { lt: thirtyDaysAgo } },
          data: { statut: 'ARCHIVE' },
        }),
      ]);

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

      const [enCours, termines, rattrapage] = await Promise.all([
        this.prisma.council.updateMany({
          where: { statut: 'PLANIFIE', date: { gte: today, lt: tomorrow } },
          data: { statut: 'EN_COURS' },
        }),
        this.prisma.council.updateMany({
          where: { statut: 'EN_COURS', date: { lt: today } },
          data: { statut: 'TERMINE' },
        }),
        this.prisma.council.updateMany({
          where: { statut: 'PLANIFIE', date: { lt: today } },
          data: { statut: 'TERMINE' },
        }),
      ]);

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
    await Promise.all([
      this.updateCampStatuses().catch((err: unknown) =>
        this.logger.error('Sync initiale camps échouée', err instanceof Error ? err.stack : String(err)),
      ),
      this.updateCouncilStatuses().catch((err: unknown) =>
        this.logger.error('Sync initiale conseils échouée', err instanceof Error ? err.stack : String(err)),
      ),
    ]);
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
