import { Injectable } from '@nestjs/common';
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
