import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { CreateCampDto } from './dto/create-camp.dto.js';
import {
  AdhesionStatus,
  CampStatus,
  CampType,
  UserRole,
} from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../common/types/auth-user.js';

@Injectable()
export class CampsService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  private isRegionalManager(user?: AuthUser) {
    return user?.role === UserRole.ADMIN || user?.role === UserRole.REGION;
  }

  private noScope(): Prisma.CampWhereInput {
    return { id: '__no_scope__' };
  }

  private campScopeWhere(user?: AuthUser): Prisma.CampWhereInput {
    if (!user) {
      return { statut: { notIn: [CampStatus.BROUILLON, CampStatus.ARCHIVE] } };
    }
    if (user.role === UserRole.ADMIN) return {};
    if (user.role === UserRole.REGION) {
      return user.regionId ? { regionId: user.regionId } : this.noScope();
    }
    if (user.role === UserRole.SENTINELLE || user.role === UserRole.GUIDE) {
      if (!user.districtId) return this.noScope();
      return {
        statut: { notIn: [CampStatus.BROUILLON, CampStatus.ARCHIVE] },
        OR: [
          { districts: { none: {} } },
          { districts: { some: { districtId: user.districtId } } },
        ],
      };
    }
    return { statut: { notIn: [CampStatus.BROUILLON, CampStatus.ARCHIVE] } };
  }

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
    if (user.role === UserRole.GUIDE) {
      return user.parishId ? { parishId: user.parishId } : { id: '__no_scope__' };
    }
    return { id: '__no_scope__' };
  }

  private userIsInActorScope(
    actor: AuthUser,
    user: {
      id: string;
      role: UserRole;
      regionId: string | null;
      districtId: string | null;
      parishId: string | null;
    },
  ) {
    if (actor.role === UserRole.ADMIN) return true;
    if (actor.role === UserRole.REGION) {
      return Boolean(actor.regionId && actor.regionId === user.regionId);
    }
    if (actor.role === UserRole.SENTINELLE) {
      return Boolean(actor.districtId && actor.districtId === user.districtId);
    }
    if (actor.role === UserRole.GUIDE) {
      return Boolean(actor.parishId && actor.parishId === user.parishId);
    }
    return actor.id === user.id;
  }

  private async assertCampRegionalScope(campId: string, actor: AuthUser) {
    if (actor.role === UserRole.ADMIN) return;
    const camp = await this.prisma.camp.findUnique({
      where: { id: campId },
      select: { regionId: true },
    });
    if (!camp) throw new NotFoundException('Camp introuvable');
    if (
      actor.role === UserRole.REGION &&
      camp.regionId &&
      camp.regionId !== actor.regionId
    ) {
      throw new ForbiddenException('Camp hors périmètre régional');
    }
  }

  private campSelect = {
    id: true,
    nom: true,
    theme: true,
    description: true,
    dateDebut: true,
    dateFin: true,
    lieu: true,
    type: true,
    statut: true,
    imageUrl: true,
    selectionOuverte: true,
    createdAt: true,
    region: { select: { id: true, nom: true } },
    districts: { include: { district: { select: { id: true, nom: true } } } },
    createdBy: { select: { id: true, nom: true, prenoms: true } },
    _count: { select: { participants: true } },
  } as const;

  async findAll(
    filters?: { statut?: CampStatus; type?: CampType },
    user?: AuthUser,
  ) {
    const where: Prisma.CampWhereInput = {
      AND: [this.campScopeWhere(user)],
    };
    if (filters?.statut) where.statut = filters.statut;
    if (filters?.type) where.type = filters.type;
    return this.prisma.camp.findMany({
      where,
      select: this.campSelect,
      orderBy: { dateDebut: 'desc' },
    });
  }

  async findOne(id: string, user?: AuthUser) {
    const camp = await this.prisma.camp.findUnique({
      where: { id },
      select: this.campSelect,
    });
    if (!camp) throw new NotFoundException('Camp introuvable');
    if (
      (camp.statut === CampStatus.BROUILLON ||
        camp.statut === CampStatus.ARCHIVE) &&
      !this.isRegionalManager(user)
    ) {
      throw new ForbiddenException('Accès refusé à ce camp');
    }
    return camp;
  }

  async create(dto: CreateCampDto, createdBy: AuthUser) {
    const { districtIds, ...rest } = dto;
    if (createdBy.role === UserRole.REGION && !createdBy.regionId) {
      throw new ForbiddenException('Aucune région rattachée à ce compte');
    }
    if (districtIds?.length && createdBy.role === UserRole.REGION) {
      const allowedCount = await this.prisma.district.count({
        where: { id: { in: districtIds }, regionId: createdBy.regionId ?? '' },
      });
      if (allowedCount !== districtIds.length) {
        throw new ForbiddenException('District hors périmètre régional');
      }
    }
    return this.prisma.camp.create({
      data: {
        ...rest,
        dateDebut: new Date(dto.dateDebut),
        dateFin: new Date(dto.dateFin),
        createdById: createdBy.id,
        regionId: createdBy.regionId,
        ...(districtIds?.length && {
          districts: { create: districtIds.map((id) => ({ districtId: id })) },
        }),
      },
      select: this.campSelect,
    });
  }

  async updateStatus(id: string, statut: CampStatus, actor: AuthUser) {
    await this.findOne(id, actor);
    await this.assertCampRegionalScope(id, actor);
    return this.prisma.camp.update({
      where: { id },
      data: { statut },
      select: this.campSelect,
    });
  }

  async getParticipants(campId: string, actor: AuthUser) {
    await this.findOne(campId, actor);
    return this.prisma.campParticipant.findMany({
      where: { campId, ...this.participantScopeWhere(actor) },
      include: {
        user: {
          select: {
            id: true,
            nom: true,
            prenoms: true,
            matricule: true,
            avatarUrl: true,
          },
        },
        district: { select: { id: true, nom: true } },
        parish: { select: { id: true, nom: true } },
      },
      orderBy: { user: { nom: 'asc' } },
    });
  }

  async selectParticipant(
    campId: string,
    userId: string,
    selectedById: string,
  ) {
    const camp = await this.prisma.camp.findUnique({ where: { id: campId } });
    if (!camp?.selectionOuverte)
      throw new ForbiddenException('La sélection est fermée pour ce camp');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        adhesions: { where: { annee: await this.settings.getAnneePastorale() }, take: 1 },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.role !== UserRole.GARDIEN && user.role !== UserRole.GUIDE) {
      throw new ForbiddenException('Seuls les Gardiens et les Guides peuvent être sélectionnés');
    }

    const adhesionStatus =
      user.adhesions[0]?.statut ?? AdhesionStatus.NON_A_JOUR;
    const selector = await this.prisma.user.findUnique({
      where: { id: selectedById },
    });
    if (!selector) throw new ForbiddenException('Sélecteur introuvable');
    if (!this.userIsInActorScope(selector, user)) {
      throw new ForbiddenException('Gardien hors périmètre');
    }
    const campDistricts = await this.prisma.campDistrict.findMany({
      where: { campId },
      select: { districtId: true },
    });
    if (
      campDistricts.length > 0 &&
      !campDistricts.some((d) => d.districtId === user.districtId)
    ) {
      throw new ForbiddenException('Camp non ouvert à ce district');
    }
    const districtId = user.districtId;
    const parishId = user.parishId;
    if (!districtId || !parishId) {
      throw new ForbiddenException('Territoire introuvable pour ce gardien');
    }

    // Vérifier si le participant n'est pas bloqué par un supérieur
    const existing = await this.prisma.campParticipant.findUnique({
      where: { campId_userId: { campId, userId } },
      select: { participationStatus: true },
    });
    if (existing?.participationStatus === 'BLOQUE') {
      throw new ForbiddenException('Ce participant a été bloqué pour ce camp par un supérieur hiérarchique.');
    }

    return this.prisma.campParticipant.upsert({
      where: { campId_userId: { campId, userId } },
      create: {
        campId,
        userId,
        selectedById,
        districtId,
        parishId,
        adhesionStatusSnapshot: adhesionStatus,
        participationStatus: 'SELECTIONNE',
      },
      update: { participationStatus: 'SELECTIONNE', selectedById },
    });
  }

  async removeParticipant(campId: string, userId: string, actorId: string) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!actor || !target) throw new NotFoundException('Utilisateur introuvable');
    if (!this.userIsInActorScope(actor, target))
      throw new ForbiddenException('Gardien hors périmètre');

    // Sentinelles/admins/region peuvent retirer même si la sélection est fermée
    if (actor.role === UserRole.GUIDE) {
      const camp = await this.prisma.camp.findUnique({ where: { id: campId } });
      if (!camp?.selectionOuverte)
        throw new ForbiddenException('La sélection est fermée pour ce camp');
    }

    await this.prisma.campParticipant.deleteMany({ where: { campId, userId } });
    return { success: true };
  }

  async blockParticipant(campId: string, userId: string, actorId: string) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { adhesions: { where: { annee: await this.settings.getAnneePastorale() }, take: 1 } },
    });
    if (!actor || !target) throw new NotFoundException('Utilisateur introuvable');
    if (!this.userIsInActorScope(actor, target))
      throw new ForbiddenException('Gardien hors périmètre');
    if (!([UserRole.GUIDE, UserRole.SENTINELLE, UserRole.REGION, UserRole.ADMIN] as UserRole[]).includes(actor.role))
      throw new ForbiddenException('Vous n\'avez pas les droits pour bloquer ce participant');

    const existing = await this.prisma.campParticipant.findUnique({
      where: { campId_userId: { campId, userId } },
    });
    if (existing) {
      return this.prisma.campParticipant.update({
        where: { campId_userId: { campId, userId } },
        data: { participationStatus: 'BLOQUE' },
      });
    }
    const districtId = target.districtId;
    const parishId   = target.parishId;
    if (!districtId || !parishId) throw new ForbiddenException('Territoire introuvable');
    return this.prisma.campParticipant.create({
      data: {
        campId, userId, selectedById: actorId,
        districtId, parishId,
        adhesionStatusSnapshot: target.adhesions[0]?.statut ?? 'NON_A_JOUR',
        participationStatus: 'BLOQUE',
      },
    });
  }

  async unblockParticipant(campId: string, userId: string, actorId: string) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!actor || !target) throw new NotFoundException('Utilisateur introuvable');
    if (!this.userIsInActorScope(actor, target))
      throw new ForbiddenException('Gardien hors périmètre');
    if (!([UserRole.GUIDE, UserRole.SENTINELLE, UserRole.REGION, UserRole.ADMIN] as UserRole[]).includes(actor.role))
      throw new ForbiddenException('Vous n\'avez pas les droits pour débloquer ce participant');

    await this.prisma.campParticipant.deleteMany({
      where: { campId, userId, participationStatus: 'BLOQUE' },
    });
    return { success: true };
  }

  async getByDistrict(campId: string) {
    return this.prisma.campParticipant.groupBy({
      by: ['districtId'],
      where: { campId },
      _count: { id: true },
    });
  }
}
