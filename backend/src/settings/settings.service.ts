import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const KEY = 'anneePastorale';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAnneePastorale(): Promise<number> {
    const cfg = await this.prisma.systemConfig.findUnique({ where: { key: KEY } });
    return cfg ? Number(cfg.value) : new Date().getFullYear();
  }

  async setAnneePastorale(annee: number): Promise<{ annee: number }> {
    await this.prisma.systemConfig.upsert({
      where: { key: KEY },
      create: { key: KEY, value: String(annee) },
      update: { value: String(annee) },
    });
    return { annee };
  }
}
