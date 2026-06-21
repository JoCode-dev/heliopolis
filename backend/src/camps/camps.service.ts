import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateCampDto } from './dto/create-camp.dto.js';
import { CreateAutorisationDto } from './dto/create-autorisation.dto.js';
import { RepondreAutorisationDto } from './dto/repondre-autorisation.dto.js';
import {
  AdhesionStatus,
  AuditAction,
  AutorisationStatut,
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
    private notifications: NotificationsService,
  ) {}

  private isRegionalManager(user?: AuthUser) {
    return user?.role === UserRole.ADMIN || user?.role === UserRole.REGION;
  }

  private noScope(): Prisma.CampWhereInput {
    return { id: '__no_scope__' };
  }

  private async campScopeWhere(user?: AuthUser): Promise<Prisma.CampWhereInput> {
    if (!user) {
      return { statut: { notIn: [CampStatus.BROUILLON, CampStatus.ARCHIVE] } };
    }
    if (user.role === UserRole.ADMIN || user.role === UserRole.REGION) return {};
    if (user.role === UserRole.SENTINELLE || user.role === UserRole.GUIDE) {
      let districtId = user.districtId;
      if (!districtId && user.parishId) {
        const parish = await this.prisma.parish.findUnique({
          where: { id: user.parishId },
          select: { districtId: true },
        });
        districtId = parish?.districtId ?? null;
      }
      if (!districtId) return this.noScope();
      return {
        statut: { notIn: [CampStatus.BROUILLON, CampStatus.ARCHIVE] },
        OR: [
          { districts: { none: {} } },
          { districts: { some: { districtId } } },
        ],
      };
    }
    return { statut: { notIn: [CampStatus.BROUILLON, CampStatus.ARCHIVE] } };
  }

  private participantScopeWhere(user: AuthUser): Prisma.CampParticipantWhereInput {
    if (user.role === UserRole.ADMIN || user.role === UserRole.REGION) return {};
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
    if (actor.role === UserRole.ADMIN || actor.role === UserRole.REGION) return true;
    if (actor.role === UserRole.SENTINELLE) {
      return Boolean(actor.districtId && actor.districtId === user.districtId);
    }
    if (actor.role === UserRole.GUIDE) {
      return Boolean(actor.parishId && actor.parishId === user.parishId);
    }
    return actor.id === user.id;
  }

  private async assertCampRegionalScope(campId: string, actor: AuthUser) {
    if (actor.role === UserRole.ADMIN || actor.role === UserRole.REGION) return;
    const camp = await this.prisma.camp.findUnique({
      where: { id: campId },
      select: { regionId: true },
    });
    if (!camp) throw new NotFoundException('Camp introuvable');
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
      AND: [await this.campScopeWhere(user)],
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
    const dateDebut = new Date(dto.dateDebut);
    const dateFin = new Date(dto.dateFin);
    if (isNaN(dateDebut.getTime()) || isNaN(dateFin.getTime())) {
      throw new BadRequestException('Dates invalides');
    }
    if (dateFin <= dateDebut) {
      throw new BadRequestException('La date de fin doit être après la date de début');
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
            role: true,
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
        parish: { select: { districtId: true } },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Les administrateurs ne peuvent pas être sélectionnés comme participants');
    }

    const adhesionStatus =
      user.adhesions[0]?.statut ?? AdhesionStatus.NON_A_JOUR;
    const selector = await this.prisma.user.findUnique({
      where: { id: selectedById },
    });
    if (!selector) throw new ForbiddenException('Sélecteur introuvable');

    const isEncadrant = user.role === UserRole.SENTINELLE || user.role === UserRole.REGION;
    // Vérifier le scope seulement pour les gardiens et guides
    if (!isEncadrant && !this.userIsInActorScope(selector, user)) {
      throw new ForbiddenException('Gardien hors périmètre');
    }

    const districtId = user.districtId ?? user.parish?.districtId ?? null;
    const parishId   = user.parishId ?? null;

    // Pour gardiens et guides, le territoire est obligatoire
    if (!isEncadrant && (!districtId || !parishId)) {
      throw new ForbiddenException(`Territoire introuvable pour ${user.prenoms} ${user.nom} — vérifiez que la paroisse est bien renseignée.`);
    }

    if (!isEncadrant && districtId) {
      const campDistricts = await this.prisma.campDistrict.findMany({
        where: { campId },
        select: { districtId: true },
      });
      if (
        campDistricts.length > 0 &&
        !campDistricts.some((d) => d.districtId === districtId)
      ) {
        throw new ForbiddenException(`${user.prenoms} ${user.nom} — ce camp n'est pas ouvert au district de cette paroisse.`);
      }
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
        districtId: districtId ?? undefined,
        parishId: parishId ?? undefined,
        roleAtCamp: user.role,
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
      include: {
        adhesions: { where: { annee: await this.settings.getAnneePastorale() }, take: 1 },
        parish: { select: { districtId: true } },
      },
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
    const districtId = target.districtId ?? target.parish?.districtId ?? null;
    const parishId   = target.parishId;
    if (!districtId || !parishId) throw new ForbiddenException(`Territoire introuvable pour ${target.prenoms} ${target.nom}`);
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

  async getPendingRequestsCount(user: AuthUser) {
    const scopeWhere =
      user.role === UserRole.ADMIN || user.role === UserRole.REGION
        ? {}
        : user.role === UserRole.SENTINELLE || user.role === UserRole.GUIDE
          ? this.participantScopeWhere(user)
          : null;
    if (scopeWhere === null) return { total: 0, byCamp: {} as Record<string, number> };

    const grouped = await this.prisma.campParticipant.groupBy({
      by: ['campId'],
      where: { participationStatus: 'EN_ATTENTE', ...scopeWhere },
      _count: { id: true },
    });
    const byCamp: Record<string, number> = {};
    let total = 0;
    for (const g of grouped) {
      byCamp[g.campId] = g._count.id;
      total += g._count.id;
    }
    return { total, byCamp };
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

    const parishId = user.parishId ?? null;
    const districtId = user.districtId ?? user.parish?.districtId ?? null;

    const isEncadrant = user.role === UserRole.SENTINELLE || user.role === UserRole.REGION;

    // Gardiens et guides doivent être rattachés à une paroisse
    if (!isEncadrant && (!districtId || !parishId))
      throw new ForbiddenException('Ton compte n\'est pas encore rattaché à une paroisse. Contacte ton administrateur.');

    // Vérification du scope du camp par district (sauf pour REGION et encadrants sans district)
    if (user.role !== UserRole.REGION && districtId) {
      const campDistricts = await this.prisma.campDistrict.findMany({
        where: { campId },
        select: { districtId: true },
      });
      if (campDistricts.length > 0 && !campDistricts.some((d) => d.districtId === districtId))
        throw new ForbiddenException('Ce camp n\'est pas ouvert à ton district');
    }

    const adhesionStatus = user.adhesions[0]?.statut ?? AdhesionStatus.NON_A_JOUR;

    // Sentinelles et membres de région : participation directe sans validation
    const participationStatus = isEncadrant ? 'SELECTIONNE' : 'EN_ATTENTE';

    const participant = await this.prisma.campParticipant.upsert({
      where: { campId_userId: { campId, userId } },
      create: {
        campId, userId,
        selectedById: userId,
        districtId: districtId ?? undefined,
        parishId: parishId ?? undefined,
        roleAtCamp: user.role,
        adhesionStatusSnapshot: adhesionStatus,
        participationStatus,
      },
      update: { participationStatus },
    });

    this.actionLog.record({
      action: AuditAction.CREATE,
      category: 'camp',
      summary: isEncadrant
        ? `${user.prenoms} ${user.nom} s'est inscrit(e) au camp « ${camp.nom} »`
        : `${user.prenoms} ${user.nom} a manifesté son intérêt pour le camp « ${camp.nom} »`,
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

  async validerDemandeParticipation(campId: string, userId: string, actor: AuthUser) {
    if (
      actor.role !== UserRole.SENTINELLE &&
      actor.role !== UserRole.REGION &&
      actor.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('Accès non autorisé');
    }

    const participant = await this.prisma.campParticipant.findUnique({
      where: { campId_userId: { campId, userId } },
      include: { user: { select: { id: true, nom: true, prenoms: true, role: true } } },
    });
    if (!participant) throw new NotFoundException('Demande de participation introuvable');
    if (participant.participationStatus !== 'EN_ATTENTE') {
      throw new BadRequestException('Ce participant n\'a pas de demande en attente');
    }

    const updated = await this.prisma.campParticipant.update({
      where: { campId_userId: { campId, userId } },
      data: { participationStatus: 'SELECTIONNE', selectedById: actor.id },
      include: { user: { select: { id: true, nom: true, prenoms: true } } },
    });

    const camp = await this.prisma.camp.findUnique({ where: { id: campId }, select: { nom: true } });
    await this.notifications.sendToUser(userId, {
      title: 'Participation validée ✓',
      body: `Ta demande de participation au camp « ${camp?.nom ?? '' } » a été acceptée.`,
      url: `/dashboard/guide/camps/${campId}`,
    });

    this.actionLog.record({
      action: AuditAction.STATUS_CHANGE,
      category: 'camp',
      summary: `Validation de la demande de ${participant.user.prenoms} ${participant.user.nom} pour le camp`,
      actor,
      target: { entityType: 'CampParticipant', entityId: participant.id },
      metadata: { campId, userId },
    });

    return updated;
  }

  // ─── Autorisations de sortie ───────────────────────────────────────────────

  async createAutorisation(campId: string, dto: CreateAutorisationDto, actor: AuthUser) {
    if (actor.role !== UserRole.SENTINELLE) {
      throw new ForbiddenException('Seules les Sentinelles peuvent demander une autorisation de sortie');
    }

    const camp = await this.prisma.camp.findUnique({ where: { id: campId } });
    if (!camp) throw new NotFoundException('Camp introuvable');
    if (camp.statut !== CampStatus.EN_COURS) {
      throw new BadRequestException('Les autorisations ne peuvent être demandées que pendant un camp en cours');
    }

    const participants = await this.prisma.campParticipant.findMany({
      where: { campId, userId: { in: dto.personneIds } },
      include: { user: { select: { id: true, nom: true, prenoms: true } } },
    });

    if (participants.length !== dto.personneIds.length) {
      throw new BadRequestException('Certaines personnes sélectionnées ne sont pas participants de ce camp');
    }

    const autorisation = await this.prisma.autorisationSortie.create({
      data: {
        campId,
        demandeurId: actor.id,
        motif: dto.motif,
        personnes: {
          create: participants.map(p => ({
            userId: p.userId,
            nomSnapshot: `${p.user.prenoms ?? ''} ${p.user.nom ?? ''}`.trim(),
          })),
        },
      },
      include: {
        demandeur: { select: { id: true, nom: true, prenoms: true } },
        personnes: { include: { user: { select: { id: true, nom: true, prenoms: true } } } },
      },
    });

    // Notifier les régionaux rattachés au camp
    const regionaux = await this.prisma.user.findMany({
      where: { role: UserRole.REGION, regionId: camp.regionId ?? undefined },
      select: { id: true },
    });
    for (const r of regionaux) {
      await this.notifications.sendToUser(r.id, {
        title: 'Demande d\'autorisation de sortie',
        body: `Une Sentinelle demande une autorisation de sortie pour ${participants.length} personne(s) — motif : ${dto.motif}`,
        url: `/dashboard/region/camps/${campId}`,
      });
    }

    return autorisation;
  }

  async getAutorisations(campId: string, actor: AuthUser) {
    const camp = await this.prisma.camp.findUnique({ where: { id: campId } });
    if (!camp) throw new NotFoundException('Camp introuvable');

    const where: Prisma.AutorisationSortieWhereInput = { campId };

    // Une Sentinelle ne voit que ses propres demandes
    if (actor.role === UserRole.SENTINELLE) {
      where.demandeurId = actor.id;
    } else if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.REGION) {
      throw new ForbiddenException('Accès non autorisé');
    }

    return this.prisma.autorisationSortie.findMany({
      where,
      include: {
        demandeur: { select: { id: true, nom: true, prenoms: true } },
        valideur: { select: { id: true, nom: true, prenoms: true } },
        personnes: { include: { user: { select: { id: true, nom: true, prenoms: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async validerAutorisation(campId: string, autorisationId: string, dto: RepondreAutorisationDto, actor: AuthUser) {
    if (actor.role !== UserRole.REGION && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Seul le Régional peut valider une autorisation');
    }

    const autorisation = await this.prisma.autorisationSortie.findFirst({
      where: { id: autorisationId, campId },
      include: {
        personnes: true,
        demandeur: { select: { id: true, nom: true, prenoms: true } },
      },
    });
    if (!autorisation) throw new NotFoundException('Autorisation introuvable');
    if (autorisation.statut !== AutorisationStatut.EN_ATTENTE) {
      throw new BadRequestException('Cette autorisation a déjà été traitée');
    }

    const result = await this.prisma.autorisationSortie.update({
      where: { id: autorisationId },
      data: { statut: AutorisationStatut.APPROUVEE, valideurId: actor.id, reponse: dto.reponse },
      include: {
        demandeur: { select: { id: true, nom: true, prenoms: true } },
        valideur: { select: { id: true, nom: true, prenoms: true } },
        personnes: { include: { user: { select: { id: true, nom: true, prenoms: true } } } },
      },
    });

    await this.notifications.sendToUser(autorisation.demandeurId, {
      title: 'Autorisation de sortie approuvée ✓',
      body: dto.reponse ?? `Votre demande de sortie (${autorisation.personnes.length} personne(s)) a été approuvée`,
      url: `/dashboard/guide/camps/${campId}`,
    });

    await this._notifierChargesSecurite(campId, autorisation.demandeurId, {
      title: 'Sortie autorisée',
      body: `Une sortie de ${autorisation.personnes.length} personne(s) a été approuvée`,
      url: `/dashboard/guide/camps/${campId}`,
    });

    return result;
  }

  async refuserAutorisation(campId: string, autorisationId: string, dto: RepondreAutorisationDto, actor: AuthUser) {
    if (actor.role !== UserRole.REGION && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Seul le Régional peut refuser une autorisation');
    }

    const autorisation = await this.prisma.autorisationSortie.findFirst({
      where: { id: autorisationId, campId },
      include: { personnes: true },
    });
    if (!autorisation) throw new NotFoundException('Autorisation introuvable');
    if (autorisation.statut !== AutorisationStatut.EN_ATTENTE) {
      throw new BadRequestException('Cette autorisation a déjà été traitée');
    }

    const result = await this.prisma.autorisationSortie.update({
      where: { id: autorisationId },
      data: { statut: AutorisationStatut.REFUSEE, valideurId: actor.id, reponse: dto.reponse },
      include: {
        demandeur: { select: { id: true, nom: true, prenoms: true } },
        valideur: { select: { id: true, nom: true, prenoms: true } },
        personnes: { include: { user: { select: { id: true, nom: true, prenoms: true } } } },
      },
    });

    await this.notifications.sendToUser(autorisation.demandeurId, {
      title: 'Autorisation de sortie refusée',
      body: dto.reponse ?? 'Votre demande de sortie a été refusée',
      url: `/dashboard/guide/camps/${campId}`,
    });

    await this._notifierChargesSecurite(campId, autorisation.demandeurId, {
      title: 'Sortie refusée',
      body: `Une demande de sortie de ${autorisation.personnes.length} personne(s) a été refusée`,
      url: `/dashboard/guide/camps/${campId}`,
    });

    return result;
  }

  async toggleChargeSecurite(campId: string, userId: string, actor: AuthUser) {
    if (actor.role !== UserRole.REGION && actor.role !== UserRole.ADMIN && actor.role !== UserRole.SENTINELLE) {
      throw new ForbiddenException('Accès non autorisé');
    }

    const participant = await this.prisma.campParticipant.findUnique({
      where: { campId_userId: { campId, userId } },
    });
    if (!participant) throw new NotFoundException('Participant introuvable dans ce camp');
    if (participant.roleAtCamp === UserRole.GARDIEN) {
      throw new ForbiddenException('Un Gardien ne peut pas être désigné chargé à la sécurité');
    }

    return this.prisma.campParticipant.update({
      where: { campId_userId: { campId, userId } },
      data: { chargeSecurite: !participant.chargeSecurite },
      include: { user: { select: { id: true, nom: true, prenoms: true } } },
    });
  }

  private async _notifierChargesSecurite(
    campId: string,
    excludeUserId: string,
    payload: { title: string; body: string; url: string },
  ) {
    const chargesSecurite = await this.prisma.campParticipant.findMany({
      where: { campId, chargeSecurite: true, userId: { not: excludeUserId } },
      select: { userId: true },
    });
    for (const cs of chargesSecurite) {
      await this.notifications.sendToUser(cs.userId, payload);
    }
  }
}
