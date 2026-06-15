import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageType } from '../../generated/prisma/enums.js';
import { RedisService } from '../redis/redis.service.js';
import { MessagingService } from './messaging.service.js';

interface JwtPayload {
  sub: string;
  role: string;
}

interface SocketData {
  userId?: string;
}

interface SendMessagePayload {
  conversationId: string;
  contenu: string;
  type?: MessageType;
  replyToId?: string;
}

@WebSocketGateway({
  cors: {
    origin: (process.env.FRONTEND_URLS ?? 'http://localhost:3000')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean),
    credentials: true,
  },
  namespace: '/chat',
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  declare server: Server;

  constructor(
    private messagingService: MessagingService,
    private jwtService: JwtService,
    private redis: RedisService,
  ) {}

  // Récupère l'userId depuis Redis si disponible, sinon depuis socket.data
  private async getUserId(client: Socket): Promise<string | null> {
    if (this.redis.isAvailable) {
      const fromRedis = await this.redis.get(`socket:${client.id}`);
      if (fromRedis) return fromRedis;
    }
    return (client.data as SocketData).userId ?? null;
  }

  async handleConnection(client: Socket) {
    try {
      const auth = client.handshake.auth as { token?: unknown } | undefined;
      const header = client.handshake.headers?.authorization;
      const bearer =
        typeof header === 'string' ? header.split(' ')[1] : undefined;
      const token = typeof auth?.token === 'string' ? auth.token : bearer;
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET || 'codex-gardiens-secret',
      });
      const userId = payload.sub;

      // Toujours stocker dans socket.data (fallback si Redis hors-ligne)
      (client.data as SocketData).userId = userId;

      // Stocker dans Redis si disponible (pour le multi-instance et la présence)
      await this.redis.trackSocket(userId, client.id);
      await this.redis.setPresence(userId);

      // Rejoindre automatiquement les rooms des conversations
      const convIds =
        await this.messagingService.getUserConversationIds(userId);
      for (const convId of convIds) {
        await client.join(`conv:${convId}`);
      }

      // Notifier que l'utilisateur est en ligne
      for (const convId of convIds) {
        client.to(`conv:${convId}`).emit('user:online', { userId });
      }
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId =
      (await this.redis.untrackSocket(client.id)) ??
      (client.data as SocketData).userId;

    if (!userId) return;

    const remaining = await this.redis.socketCount(userId);
    if (remaining === 0) {
      await this.redis.delPresence(userId);

      const convIds =
        await this.messagingService.getUserConversationIds(userId);
      for (const convId of convIds) {
        this.server.to(`conv:${convId}`).emit('user:offline', { userId });
      }
    }
  }

  // ── Heartbeat — maintient la présence active ───────────────────────────────

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: Socket) {
    const userId = await this.getUserId(client);
    if (userId) {
      await this.redis.setPresence(userId);
      return { ok: true };
    }
    return { ok: false };
  }

  // ── Rejoindre / quitter une conversation ──────────────────────────────────

  @SubscribeMessage('join:conversation')
  async joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    const userId = await this.getUserId(client);
    if (!userId) {
      client.disconnect();
      return { joined: false };
    }
    await this.messagingService.assertMember(conversationId, userId);
    await client.join(`conv:${conversationId}`);
    return { joined: conversationId };
  }

  @SubscribeMessage('leave:conversation')
  async leaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    await client.leave(`conv:${conversationId}`);
  }

  // ── Envoi de message ──────────────────────────────────────────────────────

  @SubscribeMessage('send:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessagePayload,
  ) {
    const userId = await this.getUserId(client);
    if (!userId) {
      client.disconnect();
      return null;
    }
    const message = await this.messagingService.sendMessage(
      data.conversationId,
      userId,
      data,
    );
    this.server.to(`conv:${data.conversationId}`).emit('new:message', message);
    return message;
  }

  // ── Indicateur de frappe ──────────────────────────────────────────────────

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; typing: boolean },
  ) {
    const userId = await this.getUserId(client);
    client.to(`conv:${data.conversationId}`).emit('typing', {
      userId,
      typing: data.typing,
    });
  }

  // ── Présence en ligne dans une conversation ────────────────────────────────

  @SubscribeMessage('get:online')
  async getOnlineMembers(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    const userId = await this.getUserId(client);
    if (!userId) return {};

    const conv = await this.messagingService.getConversationDetails(
      conversationId,
      userId,
    );
    if (!conv) return {};

    const memberIds = (conv.members ?? []).map(
      (m: { userId: string }) => m.userId,
    );
    return this.redis.getManyPresence(memberIds);
  }
}
