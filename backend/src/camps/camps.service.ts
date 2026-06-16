import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { CreateCampDto } from './dto/create-camp.dto.js';
import {
  AdhesionStatus,
  AuditAction,
  CampStatus,
  CampType,
  UserRole,
} from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { ActionLogService } from '../logs/action-log.service.js';

@Injectable()
export class CampsService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
    private actionLog: ActionLogService,
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

    const dateDebut = new Date(dto.dateDebut);
    const dateFin = new Date(dto.dateFin);
    if (isNaN(dateDebut.getTime()) || isNaN(dateFin.getTime())) {
      throw new BadRequestException('Dates invalides');
    }
    if (dateFin <= dateDebut) {
      throw new BadRequestException('La date de fin doit être après la date de début');
    }

    if (districtIds?.length && createdBy.role === UserRole.REGION) {
      const allowedCount = await this.prisma.district.count({
        where: { id: { in: districtIds }, regionId: createdBy.regionId ?? '' },
      });
      if (allowedCount !== districtIds.length) {
        throw new ForbiddenException('District hors périmètre régional');
      }
    }
    const camp = await this.prisma.camp.create({
      data: {
        ...rest,
        dateDebut,
        dateFin,
        createdById: createdBy.id,
        regionId: createdBy.regionId,
        ...(districtIds?.length && {
          districts: { create: districtIds.map((id) => ({ districtId: id })) },
        }),
      },
      select: this.campSelect,
    });
    this.actionLog.record({
      action: AuditAction.CREATE,
      category: 'camp',
      summary: `Création du camp « ${camp.nom} »`,
      actor: createdBy,
      target: { entityType: 'Camp', entityId: camp.id },
      metadata: { type: camp.type, statut: camp.statut },
    });
    return camp;
  }

  async updateStatus(id: string, statut: CampStatus, actor: AuthUser) {
    await this.findOne(id, actor);
    await this.assertCampRegionalScope(id, actor);
    const camp = await this.prisma.camp.update({
      where: { id },
      data: { statut },
      select: this.campSelect,
    });
    this.actionLog.record({
      action: AuditAction.STATUS_CHANGE,
      category: 'camp',
      summary: `Statut du camp « ${camp.nom} » → ${statut}`,
      actor: actor,
      target: { entityType: 'Camp', entityId: id },
      metadata: { statut },
    });
    return camp;
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

    const participant = await this.prisma.campParticipant.upsert({
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
    if (selector) {
      this.actionLog.record({
        action: AuditAction.CREATE,
        category: 'camp',
        summary: `Sélection de ${user.prenoms} ${user.nom} pour le camp « ${camp.nom} »`,
        actor: selector,
        target: { entityType: 'CampParticipant', entityId: participant.id },
        metadata: { campId, userId },
      });
    }
    return participant;
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
    this.actionLog.record({
      action: AuditAction.DELETE,
      category: 'camp',
      summary: `Retrait de ${target.prenoms} ${target.nom} du camp`,
      actor: actor,
      target: { entityType: 'CampParticipant', entityId: `${campId}:${userId}` },
      metadata: { campId, userId },
    });
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
      const updated = await this.prisma.campParticipant.update({
        where: { campId_userId: { campId, userId } },
        data: { participationStatus: 'BLOQUE' },
      });
      this.actionLog.record({
        action: AuditAction.STATUS_CHANGE,
        category: 'camp',
        summary: `Blocage de ${target.prenoms} ${target.nom} pour le camp`,
        actor: actor,
        target: { entityType: 'CampParticipant', entityId: updated.id },
        metadata: { campId, userId },
      });
      return updated;
    }
    const districtId = target.districtId;
    const parishId   = target.parishId;
    if (!districtId || !parishId) throw new ForbiddenException('Territoire introuvable');
    const created = await this.prisma.campParticipant.create({
      data: {
        campId, userId, selectedById: actorId,
        districtId, parishId,
        adhesionStatusSnapshot: target.adhesions[0]?.statut ?? 'NON_A_JOUR',
        participationStatus: 'BLOQUE',
      },
    });
    this.actionLog.record({
      action: AuditAction.STATUS_CHANGE,
      category: 'camp',
      summary: `Blocage de ${target.prenoms} ${target.nom} pour le camp`,
      actor: actor,
      target: { entityType: 'CampParticipant', entityId: created.id },
      metadata: { campId, userId },
    });
    return created;
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
    this.actionLog.record({
      action: AuditAction.STATUS_CHANGE,
      category: 'camp',
      summary: `Déblocage de ${target.prenoms} ${target.nom} pour le camp`,
      actor: actor,
      target: { entityType: 'CampParticipant', entityId: `${campId}:${userId}` },
      metadata: { campId, userId },
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

  async getMyParticipation(campId: string, userId: string) {
    return this.prisma.campParticipant.findUnique({
      where: { campId_userId: { campId, userId } },
      select: { id: true, participationStatus: true, selectedAt: true },
    });
  }

  async expressInterest(campId: string, userId: string) {
    const camp = await this.prisma.camp.findUnique({ where: { id: campId } });
    if (!camp) throw new NotFoundException('Camp introuvable');
    if (!camp.selectionOuverte)
      throw new ForbiddenException('La sélection est fermée pour ce camp');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        adhesions: { where: { annee: await this.settings.getAnneePastorale() }, take: 1 },
        parish: { select: { districtId: true } },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const existing = await this.prisma.campParticipant.findUnique({
      where: { campId_userId: { campId, userId } },
    });
    if (existing?.participationStatus === 'BLOQUE')
      throw new ForbiddenException('Ta participation à ce camp n\'est pas disponible');
    if (existing && existing.participationStatus !== 'DESISTE')
      return existing;

    const parishId = user.parishId;
    const districtId = user.districtId ?? user.parish?.districtId ?? null;
    if (!districtId || !parishId)
      throw new ForbiddenException('Ton compte n\'est pas encore rattaché à une paroisse. Contacte ton administrateur.');

    const campDistricts = await this.prisma.campDistrict.findMany({
      where: { campId },
      select: { districtId: true },
    });
    if (campDistricts.length > 0 && !campDistricts.some((d) => d.districtId === districtId))
      throw new ForbiddenException('Ce camp n\'est pas ouvert à ton district');

    const adhesionStatus = user.adhesions[0]?.statut ?? AdhesionStatus.NON_A_JOUR;

    const participant = await this.prisma.campParticipant.upsert({
      where: { campId_userId: { campId, userId } },
      create: {
        campId, userId,
        selectedById: userId,
        districtId, parishId,
        adhesionStatusSnapshot: adhesionStatus,
        participationStatus: 'EN_ATTENTE',
      },
      update: { participationStatus: 'EN_ATTENTE' },
    });

    this.actionLog.record({
      action: AuditAction.CREATE,
      category: 'camp',
      summary: `${user.prenoms} ${user.nom} a manifesté son intérêt pour le camp « ${camp.nom} »`,
      actor: { id: userId, role: user.role, parishId, districtId } as AuthUser,
      target: { entityType: 'CampParticipant', entityId: participant.id },
      metadata: { campId, userId },
    });

    return participant;
  }

  async withdrawInterest(campId: string, userId: string) {
    const existing = await this.prisma.campParticipant.findUnique({
      where: { campId_userId: { campId, userId } },
    });
    if (!existing) return { success: true };

    if (existing.participationStatus === 'EN_ATTENTE') {
      await this.prisma.campParticipant.delete({
        where: { campId_userId: { campId, userId } },
      });
    } else {
      await this.prisma.campParticipant.update({
        where: { campId_userId: { campId, userId } },
        data: { participationStatus: 'DESISTE' },
      });
    }

    const [user, camp] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.camp.findUnique({ where: { id: campId } }),
    ]);
    if (user && camp) {
      this.actionLog.record({
        action: AuditAction.STATUS_CHANGE,
        category: 'camp',
        summary: `${user.prenoms} ${user.nom} s'est retiré(e) du camp « ${camp.nom} »`,
        actor: { id: userId, role: user.role } as AuthUser,
        target: { entityType: 'CampParticipant', entityId: `${campId}:${userId}` },
        metadata: { campId, userId },
      });
    }

    return { success: true };
  }
}
