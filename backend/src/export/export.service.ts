import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../common/types/auth-user.js';
import * as XLSX from 'xlsx';

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN:      'Admin',
  REGION:     'Régional',
  SENTINELLE: 'Sentinelle',
  GUIDE:      'Guide',
  GARDIEN:    'Gardien',
};

const ADHESION_LABEL: Record<string, string> = {
  A_JOUR:     'À jour',
  NON_A_JOUR: 'Non à jour',
  EN_ATTENTE: 'En attente',
};

@Injectable()
export class ExportService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  private participantScopeWhere(user: AuthUser): Prisma.CampParticipantWhereInput {
    if (user.role === UserRole.ADMIN) return {};
    if (user.role === UserRole.REGION) {
      return user.regionId
        ? { district: { regionId: user.regionId } }
        : { id: '__no_scope__' };
    }
    if (user.role === UserRole.SENTINELLE) {
      return user.districtId ? { districtId: user.districtId } : { id: '__no_scope__' };
    }
    return { id: '__no_scope__' };
  }

  async exportParticipants(campId: string, user: AuthUser): Promise<Buffer> {
    const participants = await this.prisma.campParticipant.findMany({
      where: { campId, ...this.participantScopeWhere(user) },
      include: {
        user: {
          select: {
            nom: true,
            prenoms: true,
            matricule: true,
            dateNaissance: true,
            sexe: true,
          },
        },
        district: { select: { nom: true } },
        parish: { select: { nom: true } },
      },
      orderBy: [
        { district: { nom: 'asc' } },
        { parish: { nom: 'asc' } },
        { user: { nom: 'asc' } },
      ],
    });

    const rows = participants.map((p, i) => ({
      'N°': i + 1,
      Nom: p.user.nom,
      Prénoms: p.user.prenoms,
      Matricule: p.user.matricule ?? '',
      Doyenné: p.district.nom,
      Paroisse: p.parish.nom,
      'Adhésion (statut)': p.adhesionStatusSnapshot,
      'Statut participation': p.participationStatus,
      'Statut présence': p.presenceStatus,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Participants');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  private userScopeWhere(actor: AuthUser): Prisma.UserWhereInput {
    if (actor.role === UserRole.ADMIN) return {};
    if (actor.role === UserRole.REGION) {
      return actor.regionId ? { regionId: actor.regionId } : { id: '__no_scope__' };
    }
    if (actor.role === UserRole.SENTINELLE) {
      return actor.districtId ? { districtId: actor.districtId } : { id: '__no_scope__' };
    }
    return { id: '__no_scope__' };
  }

  async exportAdhesions(
    actor: AuthUser,
    campId?: string,
    anneeParam?: number,
  ): Promise<{ buffer: Buffer; annee: number; campNom?: string }> {
    const annee = anneeParam ?? await this.settings.getAnneePastorale();

    let campNom: string | undefined;
    if (campId) {
      const camp = await this.prisma.camp.findUnique({ where: { id: campId }, select: { nom: true } });
      campNom = camp?.nom;
    }

    const users = await this.prisma.user.findMany({
      where: {
        ...this.userScopeWhere(actor),
        role: { in: [UserRole.GARDIEN, UserRole.GUIDE, UserRole.SENTINELLE] },
        ...(campId ? { participations: { some: { campId } } } : {}),
      },
      select: {
        nom: true,
        prenoms: true,
        matricule: true,
        role: true,
        region:   { select: { nom: true } },
        district: { select: { nom: true } },
        parish:   { select: { nom: true } },
        adhesions: {
          where: { annee },
          take: 1,
          select: { statut: true },
        },
      },
      orderBy: [
        { district: { nom: 'asc' } },
        { parish:   { nom: 'asc' } },
        { nom: 'asc' },
      ],
    });

    const rows = users.map((u, i) => ({
      'N°':           i + 1,
      Nom:            u.nom,
      Prénoms:        u.prenoms,
      Matricule:      u.matricule ?? '',
      Rôle:           ROLE_LABEL[u.role] ?? u.role,
      Région:         u.region?.nom   ?? '',
      Doyenné:        u.district?.nom ?? '',
      Paroisse:       u.parish?.nom   ?? '',
      [`Cotisation ${annee}`]: ADHESION_LABEL[u.adhesions[0]?.statut ?? ''] ?? 'Non renseigné',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Largeurs de colonnes
    ws['!cols'] = [
      { wch: 5 }, { wch: 20 }, { wch: 25 }, { wch: 12 },
      { wch: 12 }, { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, `Cotisations ${annee}`);
    return { buffer: Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })), annee, campNom };
  }
}
