import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdhesionStatus, UserRole } from '../../generated/prisma/enums.js';

const KEY = 'anneePastorale';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAnneePastorale(): Promise<number> {
    const cfg = await this.prisma.systemConfig.findUnique({ where: { key: KEY } });
    return cfg ? Number(cfg.value) : new Date().getFullYear();
  }

  async setAnneePastorale(annee: number): Promise<{ annee: number; membresInitialises: number }> {
    const current = await this.getAnneePastorale();

    let membresInitialises = 0;

    if (annee !== current) {
      // Récupérer tous les membres concernés par les cotisations
      const membres = await this.prisma.user.findMany({
        where: { role: { in: [UserRole.GARDIEN, UserRole.GUIDE, UserRole.SENTINELLE] } },
        select: { id: true },
      });

      // skipDuplicates = true : les adhésions déjà existantes pour cette année
      // (statuts A_JOUR, etc.) sont CONSERVÉES — seuls les membres qui n'ont
      // pas encore d'entrée pour cette année reçoivent NON_A_JOUR.
      const result = await this.prisma.adhesion.createMany({
        data: membres.map(m => ({
          userId: m.id,
          annee,
          statut: AdhesionStatus.NON_A_JOUR,
        })),
        skipDuplicates: true,
      });

      membresInitialises = result.count;
    }

    await this.prisma.systemConfig.upsert({
      where: { key: KEY },
      create: { key: KEY, value: String(annee) },
      update: { value: String(annee) },
    });

    return { annee, membresInitialises };
  }
}
