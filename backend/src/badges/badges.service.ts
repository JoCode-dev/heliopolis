import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { AuditAction } from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActionLogService } from '../logs/action-log.service.js';
import type { AuthUser } from '../common/types/auth-user.js';

type BadgeConditionMeta =
  | { type: 'challenges_validated';    count: number }
  | { type: 'communautaire_validated'; count: number }
  | { type: 'spirituel_validated';     count: number }
  | { type: 'points_total';            points: number }
  | { type: 'categorie_validated';     categorie: string; count: number }
  | { type: 'categorie_spread';        minCategories: number };

function isBadgeConditionMeta(value: unknown): value is BadgeConditionMeta {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const m = value as Record<string, unknown>;
  switch (m.type) {
    case 'challenges_validated':
    case 'communautaire_validated':
    case 'spirituel_validated':
      return typeof m.count === 'number';
    case 'points_total':
      return typeof m.points === 'number';
    case 'categorie_validated':
      return typeof m.categorie === 'string' && typeof m.count === 'number';
    case 'categorie_spread':
      return typeof m.minCategories === 'number';
    default:
      return false;
  }
}

@Injectable()
export class BadgesService {
  constructor(
    private prisma: PrismaService,
    private actionLog: ActionLogService,
  ) {}

  async findAll() {
    return this.prisma.badge.findMany({ orderBy: { niveau: 'asc' } });
  }

  async create(
    dto: { nom: string; code: string; description: string; condition: string; niveau: string; conditionMeta?: unknown },
    actor: AuthUser,
  ) {
    const { conditionMeta, ...rest } = dto;
    const badge = await this.prisma.badge.create({
      data: { ...rest, niveau: dto.niveau as any, conditionMeta: conditionMeta as Prisma.InputJsonValue },
    });
    this.actionLog.record({
      action: AuditAction.CREATE,
      category: 'badge',
      summary: `Création de l'artefact « ${badge.nom} »`,
      actor: actor,
      target: { entityType: 'Badge', entityId: badge.id },
    });
    return badge;
  }

  async update(
    id: string,
    dto: Partial<{ nom: string; code: string; description: string; condition: string; niveau: string; conditionMeta: unknown }>,
    actor: AuthUser,
  ) {
    const { conditionMeta, ...rest } = dto;
    const badge = await this.prisma.badge.update({
      where: { id },
      data: {
        ...rest,
        ...(rest.niveau ? { niveau: rest.niveau as any } : {}),
        ...(conditionMeta !== undefined ? { conditionMeta: conditionMeta as Prisma.InputJsonValue } : {}),
      },
    });
    this.actionLog.record({
      action: AuditAction.UPDATE,
      category: 'badge',
      summary: `Modification de l'artefact « ${badge.nom} »`,
      actor: actor,
      target: { entityType: 'Badge', entityId: id },
    });
    return badge;
  }

  async remove(id: string, actor: AuthUser) {
    const badge = await this.prisma.badge.findUnique({ where: { id } });
    await this.prisma.userBadge.deleteMany({ where: { badgeId: id } });
    await this.prisma.badge.delete({ where: { id } });
    if (badge) {
      this.actionLog.record({
        action: AuditAction.DELETE,
        category: 'badge',
        summary: `Suppression de l'artefact « ${badge.nom} »`,
        actor: actor,
        target: { entityType: 'Badge', entityId: id },
      });
    }
    return { success: true };
  }

  async getMyBadges(userId: string) {
    const newlyAwardedNames = await this.checkAndAwardBadges(userId);
    const badges = await this.prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { awardedAt: 'desc' },
    });
    const newlyAwarded = newlyAwardedNames.length
      ? badges.filter(ub => newlyAwardedNames.includes(ub.badge.nom)).map(ub => ub.badge)
      : [];
    return { badges, newlyAwarded };
  }

  async checkAndAwardBadges(userId: string): Promise<string[]> {
    // Récupère toutes les soumissions validées avec les points du défi
    const validatedSubs = await this.prisma.submission.findMany({
      where: { gardienId: userId, statut: 'VALIDE' },
      select: { challenge: { select: { points: true, categorie: true } } },
    });

    const totalCount      = validatedSubs.length;
    const totalPoints     = validatedSubs.reduce((s, sub) => s + (sub.challenge?.points ?? 0), 0);
    const categoryCounts  = new Map<string, number>();
    for (const sub of validatedSubs) {
      const cat = sub.challenge?.categorie;
      if (cat) categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
    }
    const communautaireCount    = categoryCounts.get('COMMUNAUTAIRE') ?? 0;
    const spirituelCount        = categoryCounts.get('SPIRITUEL')     ?? 0;
    const uniqueCategoriesCount = categoryCounts.size;

    const allBadges = await this.prisma.badge.findMany();
    const owned = await this.prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    });
    const ownedIds = new Set(owned.map(b => b.badgeId));
    const newlyAwarded: string[] = [];

    for (const badge of allBadges) {
      if (ownedIds.has(badge.id)) continue;
      const meta = badge.conditionMeta;
      if (!isBadgeConditionMeta(meta)) continue;

      let earned = false;
      if (meta.type === 'challenges_validated'    && totalCount >= meta.count)                               earned = true;
      if (meta.type === 'communautaire_validated' && communautaireCount >= meta.count)                      earned = true;
      if (meta.type === 'spirituel_validated'     && spirituelCount >= meta.count)                          earned = true;
      if (meta.type === 'points_total'            && totalPoints >= meta.points)                            earned = true;
      if (meta.type === 'categorie_validated'     && (categoryCounts.get(meta.categorie) ?? 0) >= meta.count) earned = true;
      if (meta.type === 'categorie_spread'        && uniqueCategoriesCount >= meta.minCategories)           earned = true;

      if (earned) {
        await this.prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
        newlyAwarded.push(badge.nom);
      }
    }
    return newlyAwarded;
  }
}
