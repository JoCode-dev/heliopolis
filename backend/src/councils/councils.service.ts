import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Council } from '../../generated/prisma/client.js';
import type {
  CouncilParticipant,
  Prisma,
} from '../../generated/prisma/client.js';
import {
  AuditAction,
  CouncilStatus,
  GuideRole,
  UserRole,
} from '../../generated/prisma/enums.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActionLogService } from '../logs/action-log.service.js';
import { CreateCouncilDto } from './dto/create-council.dto.js';
import { RegisterCouncilParticipantDto } from './dto/register-council-participant.dto.js';
import { UpdateCouncilFeedbackDto } from './dto/update-council-feedback.dto.js';

type MergedParticipantData = RegisterCouncilParticipantDto & {
  userId?: string;
};

const participantInclude = {
  district: { select: { id: true, nom: true } },
  parish: { select: { id: true, nom: true } },
  user: { select: { id: true, nom: true, prenoms: true } },
} satisfies Prisma.CouncilParticipantInclude;

type CouncilParticipantWithRelations = Prisma.CouncilParticipantGetPayload<{
  include: typeof participantInclude;
}>;

@Injectable()
export class CouncilsService {
  constructor(
    private prisma: PrismaService,
    private actionLog: ActionLogService,
  ) {}

  private readonly include = {
    region: { select: { id: true, nom: true } },
    district: { select: { id: true, nom: true } },
    parish: { select: { id: true, nom: true } },
    createdBy: { select: { id: true, nom: true, prenoms: true } },
  } as const;

  private readonly participantInclude = participantInclude;

  private scopeWhere(user: AuthUser) {
    if (user.role === UserRole.ADMIN) return {};
    if (user.role === UserRole.REGION && user.regionId)
      return { regionId: user.regionId };
    if (user.role === UserRole.SENTINELLE && user.districtId)
      return { districtId: user.districtId };
    if (user.role === UserRole.GUIDE && user.parishId)
      return { parishId: user.parishId };
    return {};
  }

  private toDayKey(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private computeStatus(date: Date, storedStatus: CouncilStatus) {
    if (storedStatus === CouncilStatus.ANNULE) return CouncilStatus.ANNULE;

    const now = new Date();
    const councilDay = this.toDayKey(date);
    const today = this.toDayKey(now);

    if (today < councilDay) return CouncilStatus.PLANIFIE;
    if (today > councilDay) return CouncilStatus.TERMINE;
    if (now < date) return CouncilStatus.PLANIFIE;
    return CouncilStatus.EN_COURS;
  }

  private isRegistrationOpen(date: Date, storedStatus: CouncilStatus) {
    if (storedStatus === CouncilStatus.ANNULE) return false;
    const today = this.toDayKey(new Date());
    const councilDay = this.toDayKey(date);
    return today === councilDay;
  }

  private enrichCouncil<T extends Council>(council: T) {
    return {
      ...council,
      statut: this.computeStatus(council.date, council.statut),
    };
  }

  private roleLabel(role: UserRole, guideRole: GuideRole | null) {
    const labels: Record<UserRole, string> = {
      [UserRole.GARDIEN]:     'Gardien',
      [UserRole.GUIDE]:       'Guide',
      [UserRole.SENTINELLE]:  'Sentinelle',
      [UserRole.REGION]:      'Région',
      [UserRole.ADMIN]:       'Admin',
      [UserRole.PHOTOGRAPHE]: 'Photographe',
    };
    const base = labels[role] ?? role;
    if (role !== UserRole.GUIDE || !guideRole) return base;
    const guideLabels: Record<GuideRole, string> = {
      [GuideRole.PLEIN]: 'Guide responsable',
      [GuideRole.ADJOINT]: 'Guide adjoint',
      [GuideRole.ASSISTANT]: 'Coordinateur de communauté',
    };
    return guideLabels[guideRole] ?? base;
  }

  private async resolveCouncilByToken(token: string) {
    const council = await this.prisma.council.findUnique({
      where: { qrToken: token },
      include: this.include,
    });
    if (!council) throw new NotFoundException('Conseil introuvable');
    return council;
  }

  private assertRegistrationOpen(council: Council) {
    if (!this.isRegistrationOpen(council.date, council.statut)) {
      throw new ForbiddenException(
        'Inscriptions ouvertes uniquement le jour du conseil',
      );
    }
  }

  private async validateTerritory(
    districtId?: string | null,
    parishId?: string | null,
  ) {
    if (!parishId) return;
    const parish = await this.prisma.parish.findUnique({
      where: { id: parishId },
      select: { districtId: true },
    });
    if (!parish) throw new NotFoundException('Paroisse introuvable');
    if (districtId && parish.districtId !== districtId) {
      throw new ConflictException(
        'La paroisse sélectionnée ne correspond pas au district',
      );
    }
  }

  private updateParticipantRecord(
    id: string,
    data: Prisma.CouncilParticipantUpdateInput,
  ): Promise<CouncilParticipantWithRelations> {
    return this.prisma.councilParticipant.update({
      where: { id },
      data,
      include: participantInclude,
    });
  }

  private createParticipantRecord(
    data: Prisma.CouncilParticipantCreateInput,
  ): Promise<CouncilParticipantWithRelations> {
    return this.prisma.councilParticipant.create({
      data,
      include: participantInclude,
    });
  }

  private async mergeFromUser(
    dto: RegisterCouncilParticipantDto,
    user?: AuthUser,
  ): Promise<MergedParticipantData> {
    if (!user) return dto;

    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!fullUser) return dto;

    return {
      nom: dto.nom || fullUser.nom || '',
      prenoms: dto.prenoms || fullUser.prenoms || '',
      contact: dto.contact ?? fullUser.telephone ?? fullUser.email ?? undefined,
      districtId: dto.districtId ?? fullUser.districtId ?? undefined,
      parishId: dto.parishId ?? fullUser.parishId ?? undefined,
      fonction:
        dto.fonction ?? this.roleLabel(fullUser.role, fullUser.guideRole),
      note: dto.note,
      avis: dto.avis,
      userId: fullUser.id,
    };
  }

  async findAll(user: AuthUser) {
    const councils = await this.prisma.council.findMany({
      where: this.scopeWhere(user),
      include: this.include,
      orderBy: { date: 'asc' },
    });

    return councils.map((c) => this.enrichCouncil(c));
  }

  async findOne(id: string) {
    const council = await this.prisma.council.findUnique({
      where: { id },
      include: this.include,
    });
    if (!council) throw new NotFoundException('Conseil introuvable');
    return this.enrichCouncil(council);
  }

  async findPublicByToken(token: string) {
    const council = await this.resolveCouncilByToken(token);
    const enriched = this.enrichCouncil(council);
    const registrationOpen = this.isRegistrationOpen(
      council.date,
      council.statut,
    );

    return {
      nom: enriched.nom,
      description: enriched.description,
      date: enriched.date,
      lieu: enriched.lieu,
      statut: enriched.statut,
      targetRoles: enriched.targetRoles,
      region: enriched.region,
      district: enriched.district,
      parish: enriched.parish,
      registrationOpen,
    };
  }

  async getParticipants(
    id: string,
    user: AuthUser,
  ): Promise<CouncilParticipantWithRelations[]> {
    const council = await this.prisma.council.findFirst({
      where: { id, ...this.scopeWhere(user) },
    });
    if (!council) throw new NotFoundException('Conseil introuvable');

    return this.prisma.councilParticipant.findMany({
      where: { councilId: id },
      include: this.participantInclude,
      orderBy: { registeredAt: 'asc' },
    });
  }

  async registerParticipant(
    token: string,
    dto: RegisterCouncilParticipantDto,
    user?: AuthUser,
  ): Promise<CouncilParticipantWithRelations> {
    const council = await this.resolveCouncilByToken(token);
    this.assertRegistrationOpen(council);

    const merged = await this.mergeFromUser(dto, user);
    await this.validateTerritory(merged.districtId, merged.parishId);

    const existing: CouncilParticipant | null = merged.userId
      ? await this.prisma.councilParticipant.findUnique({
          where: {
            councilId_userId: {
              councilId: council.id,
              userId: merged.userId,
            },
          },
        })
      : merged.contact
        ? await this.prisma.councilParticipant.findFirst({
            where: { councilId: council.id, contact: merged.contact },
          })
        : null;

    if (existing) {
      return this.updateParticipantRecord(existing.id, {
        note: dto.note ?? existing.note,
        avis: dto.avis ?? existing.avis,
      });
    }

    const participant = await this.createParticipantRecord({
      council: { connect: { id: council.id } },
      user: merged.userId ? { connect: { id: merged.userId } } : undefined,
      nom: merged.nom,
      prenoms: merged.prenoms,
      contact: merged.contact ?? null,
      district: merged.districtId
        ? { connect: { id: merged.districtId } }
        : undefined,
      parish: merged.parishId
        ? { connect: { id: merged.parishId } }
        : undefined,
      fonction: merged.fonction ?? null,
      note: dto.note ?? null,
      avis: dto.avis ?? null,
    });
    this.actionLog.record({
      action: AuditAction.CREATE,
      category: 'council',
      summary: `Inscription au conseil « ${council.nom} » par ${merged.prenoms} ${merged.nom}`,
      actor: user ?? undefined,
      target: { entityType: 'CouncilParticipant', entityId: participant.id },
      metadata: { councilId: council.id },
    });
    return participant;
  }

  async updateFeedback(
    token: string,
    dto: UpdateCouncilFeedbackDto,
    user?: AuthUser,
  ): Promise<CouncilParticipantWithRelations> {
    const council = await this.resolveCouncilByToken(token);
    this.assertRegistrationOpen(council);

    if (dto.note === undefined && dto.avis === undefined) {
      throw new ConflictException('Aucune donnée à mettre à jour');
    }

    let participant: CouncilParticipant | null = user
      ? await this.prisma.councilParticipant.findUnique({
          where: {
            councilId_userId: { councilId: council.id, userId: user.id },
          },
        })
      : null;

    if (!participant && dto.contact) {
      participant = await this.prisma.councilParticipant.findFirst({
        where: { councilId: council.id, contact: dto.contact },
      });
    }

    if (!participant) {
      throw new NotFoundException('Inscription introuvable pour ce conseil');
    }

    return this.updateParticipantRecord(participant.id, {
      note: dto.note ?? participant.note,
      avis: dto.avis ?? participant.avis,
    });
  }

  async create(dto: CreateCouncilDto, actor: AuthUser) {
    const regionId = dto.regionId ?? actor.regionId ?? undefined;
    const districtId = dto.districtId ?? actor.districtId ?? undefined;
    const parishId = dto.parishId ?? actor.parishId ?? undefined;

    const council = await this.prisma.council.create({
      data: {
        nom: dto.nom,
        description: dto.description,
        date: new Date(dto.date),
        lieu: dto.lieu,
        statut: dto.statut ?? CouncilStatus.PLANIFIE,
        targetRoles: dto.targetRoles,
        regionId: regionId || null,
        districtId: districtId || null,
        parishId: parishId || null,
        createdById: actor.id,
      },
      include: this.include,
    });
    this.actionLog.record({
      action: AuditAction.CREATE,
      category: 'council',
      summary: `Création du conseil « ${council.nom} »`,
      actor: actor,
      target: { entityType: 'Council', entityId: council.id },
    });
    return this.enrichCouncil(council);
  }

  async update(id: string, dto: Partial<CreateCouncilDto>, actor: AuthUser) {
    await this.findOne(id);
    const data: Record<string, unknown> = {};
    if (dto.nom) data.nom = dto.nom;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.date) data.date = new Date(dto.date);
    if (dto.lieu !== undefined) data.lieu = dto.lieu;
    if (dto.statut) data.statut = dto.statut;
    if (dto.targetRoles) data.targetRoles = dto.targetRoles;

    const council = await this.prisma.council.update({
      where: { id },
      data,
      include: this.include,
    });
    this.actionLog.record({
      action: AuditAction.UPDATE,
      category: 'council',
      summary: `Modification du conseil « ${council.nom} »`,
      actor: actor,
      target: { entityType: 'Council', entityId: id },
    });
    return this.enrichCouncil(council);
  }

  async remove(id: string, actor: AuthUser) {
    const council = await this.findOne(id);
    await this.prisma.council.delete({ where: { id } });
    this.actionLog.record({
      action: AuditAction.DELETE,
      category: 'council',
      summary: `Suppression du conseil « ${council.nom} »`,
      actor: actor,
      target: { entityType: 'Council', entityId: id },
    });
    return { success: true };
  }
}
