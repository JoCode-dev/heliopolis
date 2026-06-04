import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MessageType, ConversationMemberRole } from '../../generated/prisma/enums.js';

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  async assertMember(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member || member.leftAt) {
      throw new ForbiddenException('Accès refusé à cette conversation');
    }
    return member;
  }

  async getMyConversations(userId: string) {
    return this.prisma.conversation.findMany({
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
        author: { select: { id: true, nom: true, prenoms: true, avatarUrl: true } },
        replyTo: {
          include: { author: { select: { id: true, nom: true, prenoms: true } } },
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return message;
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
              select: { id: true, nom: true, prenoms: true, avatarUrl: true, role: true, parish: { select: { nom: true } } },
            },
          },
        },
      },
    });
  }

  async addMember(conversationId: string, targetUserId: string, actorId: string) {
    const actor = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: actorId } },
    });
    if (!actor || actor.role !== ConversationMemberRole.OWNER) {
      throw new ForbiddenException(`Seul l'administrateur peut gérer les membres`);
    }
    return this.prisma.conversationMember.upsert({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
      create: { conversationId, userId: targetUserId, role: ConversationMemberRole.MEMBRE },
      update: { leftAt: null },
    });
  }

  async removeMember(conversationId: string, targetUserId: string, actorId: string) {
    if (targetUserId === actorId) throw new ForbiddenException('Vous ne pouvez pas vous retirer');
    const actor = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: actorId } },
    });
    if (!actor || actor.role !== ConversationMemberRole.OWNER) {
      throw new ForbiddenException(`Seul l'administrateur peut retirer des membres`);
    }
    return this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
      data: { leftAt: new Date() },
    });
  }

  async togglePin(conversationId: string, userId: string) {
    await this.assertMember(conversationId, userId);
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation introuvable');
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { isPinned: !conv.isPinned },
    });
  }

  async archiveConversation(conversationId: string, userId: string) {
    await this.assertMember(conversationId, userId);
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { archivedAt: new Date() },
    });
  }

  async createGroupConversation(creatorId: string, data: { nom: string; memberIds: string[] }) {
    const allMembers = [...new Set([creatorId, ...data.memberIds])];
    return this.prisma.conversation.create({
      data: {
        type: 'GROUPE',
        nom: data.nom,
        members: {
          create: allMembers.map(uid => ({
            user: { connect: { id: uid } },
            role: uid === creatorId ? ConversationMemberRole.OWNER : ConversationMemberRole.MEMBRE,
          })),
        },
      },
    });
  }

  async editMessage(messageId: string, userId: string, contenu: string) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message introuvable');
    if (msg.authorId !== userId) throw new ForbiddenException('Non autorisé');
    if (msg.deletedAt) throw new ForbiddenException('Message supprimé');
    return this.prisma.message.update({
      where: { id: messageId },
      data: { contenu, editedAt: new Date() },
      include: { author: { select: { id: true, nom: true, prenoms: true, avatarUrl: true } } },
    });
  }

  async deleteMessage(messageId: string, userId: string) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message introuvable');
    if (msg.authorId !== userId) throw new ForbiddenException('Non autorisé');
    return this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), contenu: null },
    });
  }

  async markRead(conversationId: string, userId: string) {
    await this.assertMember(conversationId, userId);
    return this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
  }

  async createPrivateConversation(userId1: string, userId2: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: 'PRIVE',
        archivedAt: null,
        members: {
          some: { userId: userId1, leftAt: null },
        },
        AND: [{
          members: {
            some: { userId: userId2, leftAt: null },
          },
        }],
      },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
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
  }
}
