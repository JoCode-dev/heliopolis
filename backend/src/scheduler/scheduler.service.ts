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
    const today = startOfToday();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [enCours, clotures, archives] = await Promise.all([
      // OUVERT → EN_COURS
      this.prisma.camp.updateMany({
        where: {
          statut: { in: ['OUVERT'] },
          dateDebut: { lte: today },
          dateFin: { gte: today },
        },
        data: { statut: 'EN_COURS' },
      }),
      // → CLOTURE (dateDebut dépassée ou dateFin passée)
      this.prisma.camp.updateMany({
        where: {
          statut: { in: ['BROUILLON', 'OUVERT', 'EN_COURS'] },
          dateFin: { lt: today },
        },
        data: { statut: 'CLOTURE' },
      }),
      // CLOTURE → ARCHIVE après 30 jours
      this.prisma.camp.updateMany({
        where: {
          statut: 'CLOTURE',
          dateFin: { lt: thirtyDaysAgo },
        },
        data: { statut: 'ARCHIVE' },
      }),
    ]);

    const total = enCours.count + clotures.count + archives.count;
    if (total > 0) {
      this.logger.log(
        `Camps mis à jour — EN_COURS: ${enCours.count}, CLOTURE: ${clotures.count}, ARCHIVE: ${archives.count}`,
      );
    }
  }

  // ── Conseils ───────────────────────────────────────────────────────────────
  // Logique de transition :
  //   PLANIFIE  →  EN_COURS  le jour même (date ≥ début du jour)
  //   EN_COURS  →  TERMINE   le lendemain (date < début du jour)
  //   PLANIFIE  →  TERMINE   si la date est passée sans transition (rattrapage)

  @Cron(CronExpression.EVERY_HOUR)
  async updateCouncilStatuses() {
    const today      = startOfToday();
    const tomorrow   = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const [enCours, termines, rattrapage] = await Promise.all([
      // PLANIFIE → EN_COURS : date = aujourd'hui
      this.prisma.council.updateMany({
        where: {
          statut: 'PLANIFIE',
          date: { gte: today, lt: tomorrow },
        },
        data: { statut: 'EN_COURS' },
      }),
      // EN_COURS → TERMINE : date avant aujourd'hui
      this.prisma.council.updateMany({
        where: {
          statut: 'EN_COURS',
          date: { lt: today },
        },
        data: { statut: 'TERMINE' },
      }),
      // PLANIFIE → TERMINE : rattrapage si date passée sans transition
      this.prisma.council.updateMany({
        where: {
          statut: 'PLANIFIE',
          date: { lt: today },
        },
        data: { statut: 'TERMINE' },
      }),
    ]);

    const total = enCours.count + termines.count + rattrapage.count;
    if (total > 0) {
      this.logger.log(
        `Conseils mis à jour — EN_COURS: ${enCours.count}, TERMINE: ${termines.count + rattrapage.count}`,
      );
    }
  }

  // Exécuté au démarrage pour synchroniser immédiatement sans attendre le prochain cron
  async onModuleInit() {
    await Promise.all([
      this.updateCampStatuses(),
      this.updateCouncilStatuses(),
    ]);
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
