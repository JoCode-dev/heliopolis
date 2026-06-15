import { INestApplication, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(app: INestApplication) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';

    // retryStrategy: null = aucun retry automatique, handlers persistants pour silence
    const opts = {
      lazyConnect: true,
      retryStrategy: (): null => null,
      enableOfflineQueue: false,
    };

    const pubClient = new Redis(url, opts);
    const subClient = new Redis(url, opts);

    // Handlers persistants AVANT connect() — évite les "Unhandled error event"
    pubClient.on('error', () => void 0);
    subClient.on('error', () => void 0);

    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('Socket.io Redis adapter connecté');
    } catch (err) {
      this.logger.warn(
        `Redis adapter indisponible — mode mémoire utilisé : ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      // Déconnecter proprement pour éviter tout retry résiduel
      try { pubClient.disconnect(true); } catch { /* */ }
      try { subClient.disconnect(true); } catch { /* */ }
      this.adapterConstructor = null;
    }
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
