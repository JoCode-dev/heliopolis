import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import type { AdhesionStatus, CampStatus } from '../../generated/prisma/enums.js';

export interface DashboardStatsResponse {
  overview: {
    totalGardiens: number;
    campsOuverts: number;
    defisValides: number;
    districts: number;
    sentinelles: number;
  };
  activeCamp: { id: string; nom: string } | null;
  districts: Array<{
    id: string;
    nom: string;
    routiers: number;
    selectionnes: number;
    paroisses: number;
  }>;
  adhesions: {
    annee: number;
    aJour: number;
    nonAJour: number;
    enAttente: number;
    total: number;
  };
  challenges: Array<{ id: string; titre: string; submissions: number }>;
  camps: Array<{
    id: string;
    nom: string;
    participants: number;
    statut: CampStatus;
  }>;
}

@Injectable()
export class TerritoriesService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

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

  async getDashboardStats(): Promise<DashboardStatsResponse> {
    const annee = await this.settings.getAnneePastorale();

    const [
      totalGardiens,
      campsOuverts,
      defisValides,
      districtCount,
      sentinelles,
      activeCamp,
      districtRows,
      gardiensByDistrict,
      campsRows,
      adhesionGroups,
      topChallenges,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { deletedAt: null, role: 'GARDIEN' },
      }),
      this.prisma.camp.count({ where: { statut: 'OUVERT' } }),
      this.prisma.submission.count({ where: { statut: 'VALIDE' } }),
      this.prisma.district.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { deletedAt: null, role: 'SENTINELLE' },
      }),
      this.prisma.camp.findFirst({
        where: { statut: { in: ['OUVERT', 'EN_COURS'] } },
        orderBy: { dateDebut: 'desc' },
        select: { id: true, nom: true },
      }),
      this.prisma.district.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          nom: true,
          _count: { select: { parishes: true } },
        },
        orderBy: { nom: 'asc' },
      }),
      this.prisma.user.groupBy({
        by: ['districtId'],
        where: {
          deletedAt: null,
          role: 'GARDIEN',
          districtId: { not: null },
        },
        _count: { id: true },
      }),
      this.prisma.camp.findMany({
        where: { statut: { in: ['OUVERT', 'EN_COURS'] } },
        select: {
          id: true,
          nom: true,
          statut: true,
          _count: { select: { participants: true } },
        },
        orderBy: { dateDebut: 'desc' },
      }),
      this.prisma.adhesion.groupBy({
        by: ['statut'],
        where: {
          annee,
          user: { deletedAt: null, role: 'GARDIEN' },
        },
        _count: { id: true },
      }),
      this.prisma.challenge.findMany({
        select: {
          id: true,
          titre: true,
          _count: { select: { submissions: true } },
        },
        orderBy: { submissions: { _count: 'desc' } },
        take: 5,
      }),
    ]);

    const participantsByDistrict =
      activeCamp != null
        ? await this.prisma.campParticipant.groupBy({
            by: ['districtId'],
            where: { campId: activeCamp.id },
            _count: { id: true },
          })
        : [];

    const routiersMap = new Map(
      gardiensByDistrict.map((g) => [g.districtId!, g._count.id]),
    );
    const selectionnesMap = new Map(
      participantsByDistrict.map((p) => [p.districtId, p._count.id]),
    );

    const adhesionCounts: Record<AdhesionStatus, number> = {
      A_JOUR: 0,
      NON_A_JOUR: 0,
      EN_ATTENTE: 0,
    };
    for (const group of adhesionGroups) {
      adhesionCounts[group.statut] = group._count.id;
    }

    return {
      overview: {
        totalGardiens,
        campsOuverts,
        defisValides,
        districts: districtCount,
        sentinelles,
      },
      activeCamp,
      districts: districtRows.map((d) => ({
        id: d.id,
        nom: d.nom,
        routiers: routiersMap.get(d.id) ?? 0,
        selectionnes: selectionnesMap.get(d.id) ?? 0,
        paroisses: d._count.parishes,
      })),
      adhesions: {
        annee,
        aJour: adhesionCounts.A_JOUR,
        nonAJour: adhesionCounts.NON_A_JOUR,
        enAttente: adhesionCounts.EN_ATTENTE,
        total:
          adhesionCounts.A_JOUR +
          adhesionCounts.NON_A_JOUR +
          adhesionCounts.EN_ATTENTE,
      },
      challenges: topChallenges.map((c) => ({
        id: c.id,
        titre: c.titre,
        submissions: c._count.submissions,
      })),
      camps: campsRows.map((c) => ({
        id: c.id,
        nom: c.nom,
        participants: c._count.participants,
        statut: c.statut,
      })),
    };
  }
}
