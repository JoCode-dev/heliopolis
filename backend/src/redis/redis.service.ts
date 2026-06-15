import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

const REDIS_URL = () => process.env.REDIS_URL || 'redis://localhost:6379';

// retryStrategy: null = stop immédiatement, aucun retry automatique ioredis
// Toute la logique de reconnexion est gérée par notre propre setInterval
const NO_RETRY = () => null;

function buildClient(url: string): Redis {
  return new Redis(url, {
    lazyConnect: true,
    retryStrategy: NO_RETRY,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 0,
  });
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  private _client!: Redis;
  private _pub!: Redis;
  private _sub!: Redis;
  private _available = false;
  private _reconnectTimer: NodeJS.Timeout | null = null;

  async onModuleInit() {
    await this.tryConnect();
    // Tentative de reconnexion toutes les 30s si Redis est hors-ligne
    this._reconnectTimer = setInterval(() => void this.tryConnect(true), 30_000);
  }

  onModuleDestroy() {
    if (this._reconnectTimer) clearInterval(this._reconnectTimer);
    this.destroyClients();
  }

  // ── Connexion / reconnexion ────────────────────────────────────────────────

  private async tryConnect(silent = false): Promise<void> {
    if (this._available) return;

    const url = REDIS_URL();
    const next = [buildClient(url), buildClient(url), buildClient(url)] as const;

    // Handler no-op pour éviter les "Unhandled error event" ioredis.
    // Tout le logging est centralisé dans le bloc catch ci-dessous.
    next.forEach((c) => c.on('error', () => void 0));

    try {
      await Promise.all(next.map((c) => c.connect()));

      this.destroyClients();
      [this._client, this._pub, this._sub] = next;
      this._available = true;

      // Remplacer le no-op par un vrai handler d'erreur sur les clients actifs
      const names = ['client', 'pub', 'sub'] as const;
      next.forEach((c, i) =>
        c.removeAllListeners('error').on('error', (err: Error) =>
          this.logger.warn(`Redis ${names[i]} : ${err.message}`),
        ),
      );

      this.logger.log('Redis connecté');
    } catch (err) {
      next.forEach((c) => { try { c.disconnect(true); } catch { /* */ } });

      if (!silent) {
        this.logger.warn(
          `Redis indisponible — mode dégradé, retry toutes les 30s`,
        );
      }
    }
  }

  private destroyClients(): void {
    [this._client, this._pub, this._sub]
      .filter(Boolean)
      .forEach((c) => { try { c.disconnect(true); } catch { /* */ } });
  }

  // ── API publique ───────────────────────────────────────────────────────────

  get isAvailable(): boolean {
    return this._available;
  }

  get client(): Redis {
    return this._client;
  }

  get pub(): Redis {
    return this._pub;
  }

  get sub(): Redis {
    return this._sub;
  }

  async get(key: string): Promise<string | null> {
    if (!this._available) return null;
    try {
      return await this._client.get(key);
    } catch {
      this._available = false;
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this._available) return;
    try {
      if (ttlSeconds) {
        await this._client.setex(key, ttlSeconds, value);
      } else {
        await this._client.set(key, value);
      }
    } catch {
      this._available = false;
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this._available || !keys.length) return;
    try {
      await this._client.del(...keys);
    } catch {
      this._available = false;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  // ── Présence en ligne ──────────────────────────────────────────────────────

  async setPresence(userId: string, ttlSeconds = 300): Promise<void> {
    await this.set(`presence:${userId}`, '1', ttlSeconds);
  }

  async delPresence(userId: string): Promise<void> {
    await this.del(`presence:${userId}`);
  }

  async isOnline(userId: string): Promise<boolean> {
    if (!this._available) return false;
    try {
      return (await this._client.exists(`presence:${userId}`)) === 1;
    } catch {
      this._available = false;
      return false;
    }
  }

  async getManyPresence(userIds: string[]): Promise<Record<string, boolean>> {
    if (!this._available || !userIds.length) return {};
    try {
      const pipeline = this._client.pipeline();
      userIds.forEach((id) => pipeline.exists(`presence:${id}`));
      const results = await pipeline.exec();
      return Object.fromEntries(
        userIds.map((id, i) => [id, (results?.[i]?.[1] as number) === 1]),
      );
    } catch {
      this._available = false;
      return {};
    }
  }

  // ── Sockets utilisateur ────────────────────────────────────────────────────

  async trackSocket(userId: string, socketId: string): Promise<void> {
    if (!this._available) return;
    try {
      await this._client.setex(`socket:${socketId}`, 86400, userId);
      await this._client.sadd(`sockets:user:${userId}`, socketId);
    } catch {
      this._available = false;
    }
  }

  async untrackSocket(socketId: string): Promise<string | null> {
    if (!this._available) return null;
    try {
      const userId = await this._client.get(`socket:${socketId}`);
      if (!userId) return null;
      await this._client.del(`socket:${socketId}`);
      await this._client.srem(`sockets:user:${userId}`, socketId);
      return userId;
    } catch {
      this._available = false;
      return null;
    }
  }

  async socketCount(userId: string): Promise<number> {
    if (!this._available) return 0;
    try {
      return await this._client.scard(`sockets:user:${userId}`);
    } catch {
      this._available = false;
      return 0;
    }
  }

  // ── Invalidation du cache conversations ───────────────────────────────────

  async invalidateConvList(userId: string): Promise<void> {
    await this.del(`conv:list:${userId}`);
  }

  async invalidateConvIds(userId: string): Promise<void> {
    await this.del(`conv:ids:${userId}`);
  }
}
