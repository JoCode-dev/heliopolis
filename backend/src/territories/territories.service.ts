import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

  async createDistrict(dto: { nom: string; code?: string; regionId: string }) {
    const region = await this.prisma.region.findFirst({
      where: { id: dto.regionId, deletedAt: null },
    });
    if (!region) throw new NotFoundException('Région introuvable');

    const existing = await this.prisma.district.findFirst({
      where: { regionId: dto.regionId, nom: dto.nom, deletedAt: null },
    });
    if (existing) throw new ConflictException('Un district avec ce nom existe déjà dans cette région');

    return this.prisma.district.create({
      data: {
        nom: dto.nom,
        ...(dto.code ? { code: dto.code } : {}),
        regionId: dto.regionId,
      },
      include: {
        region: { select: { id: true, nom: true } },
        _count: { select: { parishes: true, users: true } },
      },
    });
  }

  async deleteDistrict(id: string) {
    const district = await this.prisma.district.findFirst({
      where: { id, deletedAt: null },
    });
    if (!district) throw new NotFoundException('District introuvable');

    return this.prisma.district.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createParish(dto: { nom: string; districtId: string }) {
    const district = await this.prisma.district.findFirst({
      where: { id: dto.districtId, deletedAt: null },
    });
    if (!district) throw new NotFoundException('District introuvable');

    const existing = await this.prisma.parish.findFirst({
      where: { districtId: dto.districtId, nom: dto.nom, deletedAt: null },
    });
    if (existing) throw new ConflictException('Une paroisse avec ce nom existe déjà dans ce district');

    return this.prisma.parish.create({
      data: { nom: dto.nom, districtId: dto.districtId },
      include: {
        district: { select: { id: true, nom: true } },
      },
    });
  }

  async deleteParish(id: string) {
    const parish = await this.prisma.parish.findFirst({
      where: { id, deletedAt: null },
    });
    if (!parish) throw new NotFoundException('Paroisse introuvable');

    return this.prisma.parish.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getStats() {
    // count() peut retourner null avec @prisma/adapter-pg — on utilise une seule
    // requête SQL pour éviter le bug de batching du driver adapter
    type Row = {
      total_gardiens: bigint;
      camps_ouverts:  bigint;
      defis_valides:  bigint;
      districts:      bigint;
    };
    const [row] = await this.prisma.$queryRawUnsafe<Row[]>(`
      SELECT
        (SELECT COUNT(*) FROM users       WHERE "deletedAt" IS NULL AND role = 'GARDIEN') AS total_gardiens,
        (SELECT COUNT(*) FROM camps       WHERE statut = 'OUVERT')                        AS camps_ouverts,
        (SELECT COUNT(*) FROM submissions WHERE statut = 'VALIDE')                        AS defis_valides,
        (SELECT COUNT(*) FROM districts   WHERE "deletedAt" IS NULL)                      AS districts
    `);
    return {
      totalGardiens: Number(row?.total_gardiens ?? 0),
      campsOuverts:  Number(row?.camps_ouverts  ?? 0),
      defisValides:  Number(row?.defis_valides  ?? 0),
      districts:     Number(row?.districts      ?? 0),
    };
  }
}
