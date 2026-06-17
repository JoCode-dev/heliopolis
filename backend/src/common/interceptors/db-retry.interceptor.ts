import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, retry, timer } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service.js';

const MAX_RETRIES = 4;

const CONNECTION_ERROR_MESSAGES = [
  'server has closed the connection',
  'connection terminated',
  'connection reset',
  'econnreset',
  'connection refused',
  'socket hang up',
];

function estErreurConnexion(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  if (err?.code === 'P1017') return true;
  if (err?.code === 'P2010' || err?.code === 'P1001') {
    const msg = (err?.message ?? '').toLowerCase();
    return CONNECTION_ERROR_MESSAGES.some(m => msg.includes(m));
  }
  return false;
}

@Injectable()
export class DbRetryInterceptor implements NestInterceptor {
  private static readonly logger = new Logger('DbRetry');

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      retry({
        count: MAX_RETRIES,
        delay: (error: unknown, attempt: number) => {
          if (estErreurConnexion(error)) {
            const err = error as { code?: string };
            const wait = 500 * attempt;
            DbRetryInterceptor.logger.warn(
              `${err?.code} ConnectionError — tentative ${attempt}/${MAX_RETRIES} dans ${wait}ms`,
            );
            void this.prisma.$connect().catch(() => {});
            return timer(wait);
          }
          throw error;
        },
      }),
    );
  }
}
