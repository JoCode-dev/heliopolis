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

  async getPendingModeration() {
    return this.prisma.submission.findMany({
      where: {
        statut: 'VALIDE',
        publishedToCodex: false,
        moderation: 'EN_ATTENTE',
      },
      include: {
        gardien: { select: { id: true, nom: true, prenoms: true } },
        challenge: { select: { id: true, titre: true } },
        media: true,
      },
    });
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
