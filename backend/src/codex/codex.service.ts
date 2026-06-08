import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CodexService {
  constructor(private prisma: PrismaService) {}

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

  async react(submissionId: string, userId: string, emoji?: string) {
    const reactionEmoji = emoji || '❤️';

    await this.prisma.codexReaction.upsert({
      where: { submissionId_userId_emoji: { submissionId, userId, emoji: reactionEmoji } },
      create: { submissionId, userId, emoji: reactionEmoji },
      update: {},
    });

    return this.getReactionState(submissionId, userId, reactionEmoji);
  }

  async unreact(submissionId: string, userId: string, emoji?: string) {
    const reactionEmoji = emoji || '❤️';

    await this.prisma.codexReaction.deleteMany({
      where: { submissionId, userId, emoji: reactionEmoji },
    });

    return this.getReactionState(submissionId, userId, reactionEmoji);
  }

  private async getReactionState(submissionId: string, userId: string, emoji: string) {
    const [count, existing] = await Promise.all([
      this.prisma.codexReaction.count({ where: { submissionId } }),
      this.prisma.codexReaction.findUnique({
        where: { submissionId_userId_emoji: { submissionId, userId, emoji } },
        select: { id: true },
      }),
    ]);

    return {
      submissionId,
      emoji,
      count,
      reacted: !!existing,
    };
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
    return sub;
  }

  async rejectPublication(
    submissionId: string,
    moderatorId: string,
    reason?: string,
  ) {
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
    return sub;
  }
}
