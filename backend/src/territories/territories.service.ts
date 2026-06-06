import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class TerritoriesService {
  constructor(private prisma: PrismaService) {}

  async getRegions() {
    return this.prisma.region.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { districts: true, users: true } },
      },
      orderBy: { nom: 'asc' },
    });
  }

  async getDistricts(regionId?: string) {
    return this.prisma.district.findMany({
      where: { deletedAt: null, ...(regionId && { regionId }) },
      include: {
        region: { select: { id: true, nom: true } },
        _count: { select: { parishes: true, users: true } },
      },
      orderBy: { nom: 'asc' },
    });
  }

  async getParishes(districtId?: string) {
    return this.prisma.parish.findMany({
      where: { deletedAt: null, ...(districtId && { districtId }) },
      include: {
        district: {
          select: {
            id: true,
            nom: true,
            region: { select: { id: true, nom: true } },
          },
        },
        guide: { select: { id: true, nom: true, prenoms: true } },
        _count: { select: { members: true } },
      },
      orderBy: { nom: 'asc' },
    });
  }

  async getStats() {
    const [totalGardiens, campsOuverts, defisValides, districts] =
      await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null, role: 'GARDIEN' } }),
        this.prisma.camp.count({ where: { statut: 'OUVERT' } }),
        this.prisma.submission.count({ where: { statut: 'VALIDE' } }),
        this.prisma.district.count({ where: { deletedAt: null } }),
      ]);
    return { totalGardiens, campsOuverts, defisValides, districts };
  }
}
