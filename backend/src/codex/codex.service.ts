import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditAction } from '../../generated/prisma/enums.js';
import { ActionLogService } from '../logs/action-log.service.js';

@Injectable()
export class CodexService {
  constructor(
    private prisma: PrismaService,
    private actionLog: ActionLogService,
  ) {}

  async getWall(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { statut: 'VALIDE' } as const;
    const [items, total] = await Promise.all([
      this.prisma.submission.findMany({
        where,
        include: {
          gardien: {
            select: {
              id: true,
              nom: true,
              prenoms: true,
              avatarUrl: true,
              parish: { select: { id: true, nom: true } },
            },
          },
          challenge: {
            select: { id: true, titre: true, categorie: true, points: true },
          },
          media: { where: { isPublic: true }, take: 3 },
          reactions: true,
          _count: { select: { reactions: true } },
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.submission.count({ where }),
    ]);
    return { items, total };
  }

  async react(submissionId: string, userId: string, emoji = '❤️') {
    return this.prisma.codexReaction.upsert({
      where: { submissionId_userId_emoji: { submissionId, userId, emoji } },
      create: { submissionId, userId, emoji },
      update: {},
    });
  }

  async unreact(submissionId: string, userId: string, emoji = '❤️') {
    return this.prisma.codexReaction.deleteMany({
      where: { submissionId, userId, emoji },
    });
  }

  async getPendingModeration(actor?: { role: string; parishId?: string; districtId?: string; regionId?: string }) {
    const scopeWhere = this.pendingScopeWhere(actor);
    return this.prisma.submission.findMany({
      where: {
        statut: 'VALIDE',
        publishedToCodex: false,
        moderation: 'EN_ATTENTE',
        ...scopeWhere,
      },
      include: {
        gardien: { select: { id: true, nom: true, prenoms: true } },
        challenge: { select: { id: true, titre: true } },
        media: true,
      },
    });
  }

  private pendingScopeWhere(actor?: { role: string; parishId?: string; districtId?: string; regionId?: string }) {
    if (!actor || actor.role === 'ADMIN') return {};
    if (actor.role === 'REGION' && actor.regionId)
      return { gardien: { regionId: actor.regionId } };
    if (actor.role === 'SENTINELLE' && actor.districtId)
      return { gardien: { districtId: actor.districtId } };
    if (actor.role === 'GUIDE' && actor.parishId)
      return { gardien: { parishId: actor.parishId } };
    return {};
  }

  async approvePublication(submissionId: string, moderatorId: string) {
    const moderator = await this.prisma.user.findUnique({
      where: { id: moderatorId },
      select: { id: true, nom: true, prenoms: true, role: true },
    });
    const [sub] = await Promise.all([
      this.prisma.submission.update({
        where: { id: submissionId },
        data: { publishedToCodex: true, moderation: 'APPROUVE' },
      }),
      this.prisma.moderationLog.create({
        data: {
          targetType: 'Submission',
          targetId: submissionId,
          action: 'APPROUVE',
          moderatorId,
        },
      }),
    ]);
    if (moderator) {
      this.actionLog.record({
        action: AuditAction.VALIDATE,
        category: 'codex',
        summary: `Publication approuvée sur le Mur du Codex par ${moderator.prenoms} ${moderator.nom}`,
        actor: moderator,
        target: { entityType: 'Submission', entityId: submissionId },
      });
    }
    return sub;
  }

  async rejectPublication(
    submissionId: string,
    moderatorId: string,
    reason?: string,
  ) {
    const moderator = await this.prisma.user.findUnique({
      where: { id: moderatorId },
      select: { id: true, nom: true, prenoms: true, role: true },
    });
    const [sub] = await Promise.all([
      this.prisma.submission.update({
        where: { id: submissionId },
        data: { moderation: 'REJETE' },
      }),
      this.prisma.moderationLog.create({
        data: {
          targetType: 'Submission',
          targetId: submissionId,
          action: 'REJETE',
          reason,
          moderatorId,
        },
      }),
    ]);
    if (moderator) {
      this.actionLog.record({
        action: AuditAction.REJECT,
        category: 'codex',
        summary: `Publication rejetée sur le Mur du Codex par ${moderator.prenoms} ${moderator.nom}`,
        actor: moderator,
        target: { entityType: 'Submission', entityId: submissionId },
        metadata: reason ? { reason } : undefined,
      });
    }
    return sub;
  }
}
