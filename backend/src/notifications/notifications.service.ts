import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PushNotificationPayload } from './notifications.types.js';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private configured = false;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (!publicKey || !privateKey || !subject) {
      this.logger.warn(
        'VAPID keys not configured — push notifications disabled',
      );
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.configured = true;
  }

  getPublicKey(): string {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      throw new ServiceUnavailableException(
        'Les notifications push ne sont pas configurées',
      );
    }
    return publicKey;
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async subscribe(
    userId: string,
    data: {
      endpoint: string;
      p256dh: string;
      auth: string;
      userAgent?: string;
    },
  ) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: {
        userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent,
      },
      update: {
        userId,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent,
      },
    });
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    return { ok: true };
  }

  async sendToUser(userId: string, payload: PushNotificationPayload) {
    if (!this.configured) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notifPush: true },
    });
    if (!user?.notifPush) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });
    if (!subscriptions.length) return;

    const body = JSON.stringify({
      ...payload,
      icon: payload.icon ?? '/icons/icon-192.png',
    });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            body,
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await this.prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
            return;
          }
          this.logger.warn(
            `Push failed for user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }),
    );
  }
}
