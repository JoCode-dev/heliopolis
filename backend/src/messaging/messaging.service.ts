import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { VectorService } from '../vector/vector.service.js';
import {
  ConversationType,
  MessageType,
  ConversationMemberRole,
  UserRole,
} from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const ROLE_MESSAGES_BASE: Record<UserRole, string> = {
  ADMIN:       '/dashboard/admin/messages',
  REGION:      '/dashboard/region/messages',
  SENTINELLE:  '/dashboard/guide/messages',
  GUIDE:       '/dashboard/guide/messages',
  GARDIEN:     '/dashboard/gardien/messages',
  PHOTOGRAPHE: '/dashboard/region/messages',
};

@Injectable()
export class MessagingService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private vector: VectorService,
    private notifications: NotificationsService,
  ) {}

  async assertMember(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member || member.leftAt) {
      throw new ForbiddenException('Accès refusé à cette conversation');
    }
    return member;
  }

  // ── IDs des conversations d'un utilisateur (cache 5min) ──────────────────

  async getUserConversationIds(userId: string): Promise<string[]> {
    const cacheKey = `conv:ids:${userId}`;
    const cached = await this.redis.getJson<string[]>(cacheKey);
    if (cached) return cached;

    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId, leftAt: null },
      select: { conversationId: true },
    });
    const ids = memberships.map((m) => m.conversationId);
    await this.redis.setJson(cacheKey, ids, 300);
    return ids;
  }

  // ── Liste des conversations (cache 15s) ───────────────────────────────────

  async getMyConversations(userId: string) {
    const cacheKey = `conv:list:${userId}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const conversations = await this.prisma.conversation.findMany({
      where: {
        members: { some: { userId, leftAt: null } },
        archivedAt: null,
      },
      include: {
        members: {
          where: { leftAt: null },
          select: {
            userId: true,
            lastReadAt: true,
            role: true,
            user: {
              select: {
                id: true,
                nom: true,
                prenoms: true,
                avatarUrl: true,
                parish: { select: { nom: true } },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            author: { select: { id: true, nom: true, prenoms: true } },
          },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Comptage non-lus en une seule requête groupée — remplace le N+1 query précédent
    const unreadMap = new Map<string, number>();
    if (conversations.length > 0) {
      const convIds = conversations.map((c) => c.id);
      const rows = await this.prisma.$queryRaw<{ conversationId: string; count: bigint }[]>(
        Prisma.sql`
          SELECT m."conversationId", COUNT(m.id)::int AS count
          FROM messages m
          JOIN conversation_members cm
            ON cm."conversationId" = m."conversationId"
            AND cm."userId"        = ${userId}
            AND cm."leftAt"        IS NULL
          WHERE m."conversationId" = ANY(ARRAY[${Prisma.join(convIds)}]::text[])
            AND (m."authorId" IS NULL OR m."authorId" != ${userId})
            AND m."deletedAt" IS NULL
            AND (cm."lastReadAt" IS NULL OR m."createdAt" > cm."lastReadAt")
          GROUP BY m."conversationId"
        `,
      );
      rows.forEach((r) => unreadMap.set(r.conversationId, Number(r.count)));
    }

    const result = conversations.map((conv) => ({
      ...conv,
      unreadCount: unreadMap.get(conv.id) ?? 0,
    }));

    await this.redis.setJson(cacheKey, result, 15);
    return result;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    page = 1,
    limit = 50,
  ) {
    await this.assertMember(conversationId, userId);

    const skip = (page - 1) * limit;
    return this.prisma.message.findMany({
      where: { conversationId, deletedAt: null },
      include: {
        author: {
          select: { id: true, nom: true, prenoms: true, avatarUrl: true },
        },
        attachments: { include: { media: true } },
        replyTo: { include: { author: { select: { id: true, nom: true } } } },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    });
  }

  async sendMessage(
    conversationId: string,
    authorId: string,
    data: { contenu?: string; type?: MessageType; replyToId?: string },
  ) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conv) throw new NotFoundException('Conversation introuvable');
    await this.assertMember(conversationId, authorId);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        authorId,
        contenu: data.contenu,
        type: data.type ?? MessageType.TEXTE,
        ...(data.replyToId ? { replyToId: data.replyToId } : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            nom: true,
            prenoms: true,
            avatarUrl: true,
          },
        },
        replyTo: {
          include: {
            author: { select: { id: true, nom: true, prenoms: true } },
          },
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Invalider le cache de liste pour l'expéditeur
    await this.redis.invalidateConvList(authorId);

    // Indexation vectorielle asynchrone (non bloquante)
    if (data.contenu) {
      void this.vector.indexMessage(message.id, data.contenu);
    }

    void this.notifyNewMessage(conversationId, authorId, {
      contenu: message.contenu,
      author: {
          nom:     message.author?.nom     ?? 'Utilisateur',
          prenoms: message.author?.prenoms ?? '',
        },
    });

    return message;
  }

  private async notifyNewMessage(
    conversationId: string,
    authorId: string,
    message: {
      contenu?: string | null;
      author: { nom: string; prenoms: string };
    },
  ) {
    const members = await this.prisma.conversationMember.findMany({
      where: {
        conversationId,
        leftAt: null,
        userId: { not: authorId },
      },
      select: {
        userId: true,
        user: { select: { role: true } },
      },
    });

    if (!members.length) return;

    const authorName = `${message.author.prenoms} ${message.author.nom}`;
    const excerpt = (message.contenu?.trim() || 'Nouveau message').slice(0, 80);
    const tag = `conv-${conversationId}`;

    for (const member of members) {
      const online = await this.redis.isOnline(member.userId);
      if (online) continue;

      const base = ROLE_MESSAGES_BASE[member.user.role];
      void this.notifications.sendToUser(member.userId, {
        title: authorName,
        body: excerpt,
        url: `${base}/${conversationId}`,
        tag,
      });
    }
  }

  async getConversationDetails(conversationId: string, userId: string) {
    await this.assertMember(conversationId, userId);
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                nom: true,
                prenoms: true,
                avatarUrl: true,
                role: true,
                parish: { select: { nom: true } },
              },
            },
          },
        },
      },
    });
  }

  async addMember(
    conversationId: string,
    targetUserId: string,
    actorId: string,
  ) {
    const actor = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: actorId } },
    });
    if (!actor || actor.role !== ConversationMemberRole.OWNER) {
      throw new ForbiddenException(
        `Seul l'administrateur peut gérer les membres`,
      );
    }
    const result = await this.prisma.conversationMember.upsert({
      where: {
        conversationId_userId: { conversationId, userId: targetUserId },
      },
      create: {
        conversationId,
        userId: targetUserId,
        role: ConversationMemberRole.MEMBRE,
      },
      update: { leftAt: null },
    });
    await this.redis.invalidateConvIds(targetUserId);
    return result;
  }

  async removeMember(
    conversationId: string,
    targetUserId: string,
    actorId: string,
  ) {
    if (targetUserId === actorId)
      throw new ForbiddenException('Vous ne pouvez pas vous retirer');
    const actor = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: actorId } },
    });
    if (!actor || actor.role !== ConversationMemberRole.OWNER) {
      throw new ForbiddenException(
        `Seul l'administrateur peut retirer des membres`,
      );
    }
    const result = await this.prisma.conversationMember.update({
      where: {
        conversationId_userId: { conversationId, userId: targetUserId },
      },
      data: { leftAt: new Date() },
    });
    await this.redis.invalidateConvIds(targetUserId);
    return result;
  }

  async togglePin(conversationId: string, userId: string) {
    await this.assertMember(conversationId, userId);
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conv) throw new NotFoundException('Conversation introuvable');
    const result = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { isPinned: !conv.isPinned },
    });
    await this.redis.invalidateConvList(userId);
    return result;
  }

  async archiveConversation(conversationId: string, userId: string) {
    await this.assertMember(conversationId, userId);
    const result = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { archivedAt: new Date() },
    });
    await Promise.all([
      this.redis.invalidateConvList(userId),
      this.redis.invalidateConvIds(userId),
    ]);
    return result;
  }

  async createGroupConversation(
    creatorId: string,
    data: { nom: string; memberIds: string[] },
  ) {
    const allMembers = [...new Set([creatorId, ...data.memberIds])];
    const result = await this.prisma.conversation.create({
      data: {
        type: 'GROUPE',
        nom: data.nom,
        members: {
          create: allMembers.map((uid) => ({
            user: { connect: { id: uid } },
            role:
              uid === creatorId
                ? ConversationMemberRole.OWNER
                : ConversationMemberRole.MEMBRE,
          })),
        },
      },
    });
    // Invalider le cache de chaque membre
    await Promise.all(allMembers.map((uid) => this.redis.invalidateConvIds(uid)));
    return result;
  }

  async editMessage(messageId: string, userId: string, contenu: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!msg) throw new NotFoundException('Message introuvable');
    if (msg.authorId !== userId) throw new ForbiddenException('Non autorisé');
    if (msg.deletedAt) throw new ForbiddenException('Message supprimé');
    const result = await this.prisma.message.update({
      where: { id: messageId },
      data: { contenu, editedAt: new Date() },
      include: {
        author: { select: { id: true, nom: true, prenoms: true, avatarUrl: true } },
      },
    });
    // Ré-indexer le contenu modifié
    void this.vector.indexMessage(messageId, contenu);
    return result;
  }

  async deleteMessage(messageId: string, userId: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!msg) throw new NotFoundException('Message introuvable');
    if (msg.authorId !== userId) throw new ForbiddenException('Non autorisé');
    return this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), contenu: null },
    });
  }

  async markRead(conversationId: string, userId: string) {
    await this.assertMember(conversationId, userId);
    const result = await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
    await this.redis.invalidateConvList(userId);
    return result;
  }

  async createPrivateConversation(userId1: string, userId2: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: 'PRIVE',
        archivedAt: null,
        members: { some: { userId: userId1, leftAt: null } },
        AND: [{ members: { some: { userId: userId2, leftAt: null } } }],
      },
    });
    if (existing) return existing;

    const result = await this.prisma.conversation.create({
      data: {
        type: 'PRIVE',
        members: {
          create: [
            { userId: userId1, role: 'MEMBRE' },
            { userId: userId2, role: 'MEMBRE' },
          ],
        },
      },
    });
    await Promise.all([
      this.redis.invalidateConvIds(userId1),
      this.redis.invalidateConvIds(userId2),
    ]);
    return result;
  }

  // ── Recherche full-text / vectorielle ─────────────────────────────────────

  async searchMessages(query: string, userId: string) {
    return this.vector.searchMessages(query, userId);
  }

  // ── Canaux d'équipe ──────────────────────────────────────────────────────────

  async getSuggestedChannels(user: AuthUser) {
    type Suggestion = {
      channelKey: string;
      convType: ConversationType;
      nomPrefix: string;
      nom: string;
      description: string;
      icon: string;
      territoryId: string;
      conversationId: string | null;
      memberCount: number;
      isMember: boolean;
    };
    const suggestions: Suggestion[] = [];

    const checkExisting = async (
      convType: ConversationType,
      nomPrefix: string,
      where: object,
    ) => {
      const existing = await this.prisma.conversation.findFirst({
        where: {
          type: convType,
          nom: { startsWith: nomPrefix },
          archivedAt: null,
          ...where,
        },
        include: {
          _count: { select: { members: { where: { leftAt: null } } } },
        },
      });
      const member = existing
        ? await this.prisma.conversationMember.findUnique({
            where: {
              conversationId_userId: {
                conversationId: existing.id,
                userId: user.id,
              },
            },
          })
        : null;
      const isMember = !!member && !member.leftAt;
      return { existing, isMember };
    };

    if (user.parishId) {
      const parish = await this.prisma.parish.findUnique({
        where: { id: user.parishId },
        select: { id: true, nom: true },
      });
      if (parish) {
        if (
          ([UserRole.GARDIEN, UserRole.GUIDE] as UserRole[]).includes(user.role)
        ) {
          const { existing, isMember } = await checkExisting(
            ConversationType.PAROISSE,
            'Équipe ',
            { parishId: parish.id },
          );
          suggestions.push({
            channelKey: 'PAROISSE',
            convType: ConversationType.PAROISSE,
            nomPrefix: 'Équipe ',
            nom: `Équipe ${parish.nom}`,
            description: 'Canal de la paroisse · Guides & Gardiens',
            icon: '⛪',
            territoryId: parish.id,
            conversationId: existing?.id ?? null,
            memberCount: existing?._count.members ?? 0,
            isMember,
          });
        }
        if (
          (
            [
              UserRole.GUIDE,
              UserRole.SENTINELLE,
              UserRole.REGION,
              UserRole.ADMIN,
            ] as UserRole[]
          ).includes(user.role)
        ) {
          const { existing, isMember } = await checkExisting(
            ConversationType.PAROISSE,
            'Gardiens — ',
            { parishId: parish.id },
          );
          suggestions.push({
            channelKey: 'GARDIENS',
            convType: ConversationType.PAROISSE,
            nomPrefix: 'Gardiens — ',
            nom: `Gardiens — ${parish.nom}`,
            description: 'Canal des Gardiens de la paroisse',
            icon: '🤝',
            territoryId: parish.id,
            conversationId: existing?.id ?? null,
            memberCount: existing?._count.members ?? 0,
            isMember,
          });
        }
      }
    }

    if (user.districtId) {
      const district = await this.prisma.district.findUnique({
        where: { id: user.districtId },
        select: { id: true, nom: true },
      });
      if (district) {
        if (
          ([UserRole.GUIDE, UserRole.SENTINELLE] as UserRole[]).includes(
            user.role,
          )
        ) {
          const { existing, isMember } = await checkExisting(
            ConversationType.DOYENNE,
            'Équipe District ',
            { districtId: district.id },
          );
          suggestions.push({
            channelKey: 'DOYENNE',
            convType: ConversationType.DOYENNE,
            nomPrefix: 'Équipe District ',
            nom: `Équipe District ${district.nom}`,
            description: 'Canal du district · Sentinelle & Guides',
            icon: '🛡️',
            territoryId: district.id,
            conversationId: existing?.id ?? null,
            memberCount: existing?._count.members ?? 0,
            isMember,
          });
        }
        if (
          (
            [UserRole.SENTINELLE, UserRole.REGION, UserRole.ADMIN] as UserRole[]
          ).includes(user.role)
        ) {
          const { existing, isMember } = await checkExisting(
            ConversationType.DOYENNE,
            'Guides — ',
            { districtId: district.id },
          );
          suggestions.push({
            channelKey: 'GUIDES',
            convType: ConversationType.DOYENNE,
            nomPrefix: 'Guides — ',
            nom: `Guides — ${district.nom}`,
            description: 'Canal des Guides du district',
            icon: '📖',
            territoryId: district.id,
            conversationId: existing?.id ?? null,
            memberCount: existing?._count.members ?? 0,
            isMember,
          });
        }
      }
    }

    if (user.regionId) {
      const region = await this.prisma.region.findUnique({
        where: { id: user.regionId },
        select: { id: true, nom: true },
      });
      if (region) {
        if (
          (
            [UserRole.SENTINELLE, UserRole.REGION, UserRole.ADMIN] as UserRole[]
          ).includes(user.role)
        ) {
          const { existing, isMember } = await checkExisting(
            ConversationType.REGION,
            'Équipe Régionale ',
            { regionId: region.id },
          );
          suggestions.push({
            channelKey: 'REGION',
            convType: ConversationType.REGION,
            nomPrefix: 'Équipe Régionale ',
            nom: `Équipe Régionale ${region.nom}`,
            description: 'Canal régional · Responsables & Sentinelles',
            icon: '🗺️',
            territoryId: region.id,
            conversationId: existing?.id ?? null,
            memberCount: existing?._count.members ?? 0,
            isMember,
          });
        }
        if (
          ([UserRole.REGION, UserRole.ADMIN] as UserRole[]).includes(user.role)
        ) {
          const { existing, isMember } = await checkExisting(
            ConversationType.REGION,
            'Sentinelles — ',
            { regionId: region.id },
          );
          suggestions.push({
            channelKey: 'SENTINELLES',
            convType: ConversationType.REGION,
            nomPrefix: 'Sentinelles — ',
            nom: `Sentinelles — ${region.nom}`,
            description: 'Canal des Sentinelles de la région',
            icon: '🛡️',
            territoryId: region.id,
            conversationId: existing?.id ?? null,
            memberCount: existing?._count.members ?? 0,
            isMember,
          });
        }
      }
    }

    return suggestions;
  }

  async createOrJoinTerritoryChannel(
    user: AuthUser,
    channelKey:
      | 'PAROISSE'
      | 'DOYENNE'
      | 'REGION'
      | 'GARDIENS'
      | 'GUIDES'
      | 'SENTINELLES',
  ) {
    type TerritoryWhere = {
      parishId?: string;
      districtId?: string;
      regionId?: string;
    };
    let where: TerritoryWhere = {};
    let convType: ConversationType;
    let nomPrefix: string;
    let channelNom = '';
    let memberRoles: UserRole[] = [];
    let isModerated = false;

    switch (channelKey) {
      case 'PAROISSE':
        if (!user.parishId) throw new ForbiddenException('Paroisse introuvable');
        where = { parishId: user.parishId };
        convType = ConversationType.PAROISSE;
        nomPrefix = 'Équipe ';
        {
          const p = await this.prisma.parish.findUnique({
            where: { id: user.parishId },
            select: { nom: true },
          });
          channelNom = `Équipe ${p?.nom ?? 'Paroisse'}`;
        }
        memberRoles = [UserRole.GUIDE, UserRole.GARDIEN];
        break;

      case 'GARDIENS':
        if (!user.parishId) throw new ForbiddenException('Paroisse introuvable');
        where = { parishId: user.parishId };
        convType = ConversationType.PAROISSE;
        nomPrefix = 'Gardiens — ';
        {
          const p = await this.prisma.parish.findUnique({
            where: { id: user.parishId },
            select: { nom: true },
          });
          channelNom = `Gardiens — ${p?.nom ?? 'Paroisse'}`;
        }
        memberRoles = [UserRole.GARDIEN];
        break;

      case 'DOYENNE':
        if (!user.districtId)
          throw new ForbiddenException('District introuvable');
        where = { districtId: user.districtId };
        convType = ConversationType.DOYENNE;
        nomPrefix = 'Équipe District ';
        {
          const d = await this.prisma.district.findUnique({
            where: { id: user.districtId },
            select: { nom: true },
          });
          channelNom = `Équipe District ${d?.nom ?? 'District'}`;
        }
        memberRoles = [UserRole.SENTINELLE, UserRole.GUIDE];
        isModerated = true;
        break;

      case 'GUIDES':
        if (!user.districtId)
          throw new ForbiddenException('District introuvable');
        where = { districtId: user.districtId };
        convType = ConversationType.DOYENNE;
        nomPrefix = 'Guides — ';
        {
          const d = await this.prisma.district.findUnique({
            where: { id: user.districtId },
            select: { nom: true },
          });
          channelNom = `Guides — ${d?.nom ?? 'District'}`;
        }
        memberRoles = [UserRole.GUIDE];
        break;

      case 'REGION':
        if (!user.regionId) throw new ForbiddenException('Région introuvable');
        where = { regionId: user.regionId };
        convType = ConversationType.REGION;
        nomPrefix = 'Équipe Régionale ';
        {
          const r = await this.prisma.region.findUnique({
            where: { id: user.regionId },
            select: { nom: true },
          });
          channelNom = `Équipe Régionale ${r?.nom ?? 'Région'}`;
        }
        memberRoles = [UserRole.REGION, UserRole.SENTINELLE];
        isModerated = true;
        break;

      case 'SENTINELLES':
        if (!user.regionId) throw new ForbiddenException('Région introuvable');
        where = { regionId: user.regionId };
        convType = ConversationType.REGION;
        nomPrefix = 'Sentinelles — ';
        {
          const r = await this.prisma.region.findUnique({
            where: { id: user.regionId },
            select: { nom: true },
          });
          channelNom = `Sentinelles — ${r?.nom ?? 'Région'}`;
        }
        memberRoles = [UserRole.SENTINELLE];
        isModerated = true;
        break;

      default:
        throw new ForbiddenException('Type de canal invalide');
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: convType,
        nom: { startsWith: nomPrefix },
        archivedAt: null,
        ...where,
      },
    });

    if (existing) {
      await this.prisma.conversationMember.upsert({
        where: {
          conversationId_userId: { conversationId: existing.id, userId: user.id },
        },
        create: {
          conversationId: existing.id,
          userId: user.id,
          role: ConversationMemberRole.MEMBRE,
        },
        update: { leftAt: null },
      });
      await Promise.all([
        this.redis.invalidateConvIds(user.id),
        this.redis.invalidateConvList(user.id),
      ]);
      return existing;
    }

    const territoryUsers = await this.prisma.user.findMany({
      where: {
        role: { in: memberRoles },
        statutProfil: 'ACTIF',
        deletedAt: null,
        ...where,
      },
      select: { id: true },
    });
    const allIds = [...new Set([user.id, ...territoryUsers.map((u) => u.id)])];

    const result = await this.prisma.conversation.create({
      data: {
        type: convType,
        nom: channelNom,
        isModerated,
        ...where,
        members: {
          create: allIds.map((uid) => ({
            userId: uid,
            role:
              uid === user.id
                ? ConversationMemberRole.OWNER
                : ConversationMemberRole.MEMBRE,
          })),
        },
      },
    });

    await Promise.all(
      allIds.map((uid) => this.redis.invalidateConvIds(uid)),
    );
    return result;
  }
}
