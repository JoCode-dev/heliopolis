import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { BadgesService } from '../badges/badges.service.js';
import { CreateChallengeDto } from './dto/create-challenge.dto.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  ChallengeCategory,
  ChallengeStatus,
  AuditAction,
  UserRole,
} from '../../generated/prisma/enums.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { ActionLogService } from '../logs/action-log.service.js';

@Injectable()
export class ChallengesService {
  constructor(
    private prisma: PrismaService,
    private badges: BadgesService,
    private actionLog: ActionLogService,
  ) {}

  private submissionScopeWhere(actor: AuthUser): Prisma.SubmissionWhereInput {
    if (actor.role === UserRole.ADMIN) return {};
    if (actor.role === UserRole.REGION) {
      return actor.regionId
        ? { gardien: { regionId: actor.regionId } }
        : { id: '__no_scope__' };
    }
    if (actor.role === UserRole.SENTINELLE) {
      return actor.districtId
        ? { gardien: { districtId: actor.districtId } }
        : { id: '__no_scope__' };
    }
    if (actor.role === UserRole.GUIDE) {
      return actor.parishId
        ? { gardien: { parishId: actor.parishId } }
        : { id: '__no_scope__' };
    }
    return { gardienId: actor.id };
  }

  async findAll(filters?: {
    categorie?: ChallengeCategory;
    statut?: ChallengeStatus;
    campId?: string;
  }) {
    const where: Prisma.ChallengeWhereInput = {
      statut: filters?.statut ?? ChallengeStatus.ACTIF,
    };
    if (filters?.categorie) where.categorie = filters.categorie;
    if (filters?.campId) where.campId = filters.campId;
    return this.prisma.challenge.findMany({
      where,
      include: { _count: { select: { submissions: true } } },
      orderBy: { points: 'desc' },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.challenge.findUnique({
      where: { id },
      include: { _count: { select: { submissions: true } } },
    });
    if (!c) throw new NotFoundException('Défi introuvable');
    return c;
  }

  async create(dto: CreateChallengeDto, actor: AuthUser) {
    const challenge = await this.prisma.challenge.create({
      data: { ...dto, createdById: actor.id },
    });
    this.actionLog.record({
      action: AuditAction.CREATE,
      category: 'challenge',
      summary: `Création du défi « ${challenge.titre} »`,
      actor: actor,
      target: { entityType: 'Challenge', entityId: challenge.id },
    });
    return challenge;
  }

  async getMySubmissions(userId: string) {
    return this.prisma.submission.findMany({
      where: { gardienId: userId },
      include: { challenge: true, media: true },
      orderBy: { submittedAt: 'asc' },
    });
  }

  private async getGardienTotalPoints(gardienId: string): Promise<number> {
    const subs = await this.prisma.submission.findMany({
      where: { gardienId, statut: 'VALIDE' },
      select: { challenge: { select: { points: true } } },
    });
    return subs.reduce((sum, s) => sum + (s.challenge?.points ?? 0), 0);
  }

  async submit(
    challengeId: string,
    gardienId: string,
    data: { texte?: string; preuveUrl?: string },
  ) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { id: true, statut: true, duree: true, pointsRequis: true },
    });
    if (!challenge || challenge.statut !== ChallengeStatus.ACTIF) {
      throw new NotFoundException('Défi introuvable');
    }

    // Vérification des points requis
    if (challenge.pointsRequis > 0) {
      const totalPoints = await this.getGardienTotalPoints(gardienId);
      if (totalPoints < challenge.pointsRequis) {
        throw new BadRequestException(
          `Il te faut ${challenge.pointsRequis} pts pour tenter ce défi. Tu en as ${totalPoints}.`,
        );
      }
    }

    // Pour les défis avec durée : bloquer si une preuve a déjà été soumise aujourd'hui
    if (challenge.duree) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const alreadyToday = await this.prisma.submission.findFirst({
        where: {
          challengeId,
          gardienId,
          submittedAt: { gte: todayStart, lte: todayEnd },
        },
        select: { id: true },
      });
      if (alreadyToday) {
        throw new BadRequestException('Tu as déjà soumis ta preuve pour aujourd\'hui.');
      }

      const validatedCount = await this.prisma.submission.count({
        where: { challengeId, gardienId, statut: 'VALIDE' },
      });
      if (validatedCount >= challenge.duree) {
        throw new BadRequestException('Ce défi est déjà complété !');
      }
    }

    const submission = await this.prisma.submission.create({
      data: {
        challengeId,
        gardienId,
        texte: data.texte,
        preuveUrl: data.preuveUrl,
      },
    });
    const gardien = await this.prisma.user.findUnique({
      where: { id: gardienId },
      select: { id: true, nom: true, prenoms: true, role: true },
    });
    if (gardien) {
      this.actionLog.record({
        action: AuditAction.CREATE,
        category: 'challenge',
        summary: `Soumission de preuve par ${gardien.prenoms} ${gardien.nom}`,
        actor: gardien,
        target: { entityType: 'Submission', entityId: submission.id },
        metadata: { challengeId },
      });
    }
    return submission;
  }

  async validateSubmission(
    submissionId: string,
    validateur: AuthUser,
    approved: boolean,
    comment?: string,
  ) {
    const submission = await this.prisma.submission.findFirst({
      where: {
        id: submissionId,
        ...this.submissionScopeWhere(validateur),
      },
      select: { id: true, gardienId: true },
    });
    if (!submission) {
      throw new ForbiddenException('Soumission hors périmètre');
    }

    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        statut: approved ? 'VALIDE' : 'REJETE',
        validateurId: validateur.id,
        commentaireValidateur: comment,
        validatedAt: new Date(),
        moderation: approved ? 'APPROUVE' : 'REJETE',
      },
    });

    this.actionLog.record({
      action: approved ? AuditAction.VALIDATE : AuditAction.REJECT,
      category: 'challenge',
      summary: approved
        ? `Validation d'une soumission par ${validateur.prenoms} ${validateur.nom}`
        : `Rejet d'une soumission par ${validateur.prenoms} ${validateur.nom}`,
      actor: validateur,
      target: { entityType: 'Submission', entityId: submissionId },
      metadata: { approved, gardienId: submission.gardienId },
    });

    // Vérification et attribution automatique des artefacts
    let newBadges: string[] = [];
    if (approved) {
      newBadges = await this.badges.checkAndAwardBadges(submission.gardienId);
    }

    return { ...updated, newBadges };
  }

  async retractSubmission(submissionId: string, gardienId: string) {
    const submission = await this.prisma.submission.findFirst({
      where: { id: submissionId, gardienId },
      select: { id: true, statut: true },
    });
    if (!submission) throw new NotFoundException('Soumission introuvable');
    if (submission.statut !== 'EN_ATTENTE') {
      throw new ConflictException('Seules les soumissions en attente peuvent être annulées.');
    }
    await this.prisma.submission.delete({ where: { id: submissionId } });
    return { success: true };
  }

  async getPendingSubmissions(actor: AuthUser) {
    return this.prisma.submission.findMany({
      where: {
        statut: 'EN_ATTENTE',
        ...this.submissionScopeWhere(actor),
      },
      include: {
        challenge: true,
        gardien: {
          select: { id: true, nom: true, prenoms: true, avatarUrl: true },
        },
        media: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
