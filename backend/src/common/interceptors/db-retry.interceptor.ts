import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, retry, timer } from 'rxjs';

const MAX_RETRIES = 3;

@Injectable()
export class DbRetryInterceptor implements NestInterceptor {
  private static readonly logger = new Logger('DbRetry');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      retry({
        count: MAX_RETRIES,
        delay: (error: unknown, attempt: number) => {
          const err = error as { code?: string; message?: string };
          if (err?.code === 'P1017') {
            const wait = 800 * attempt;
            DbRetryInterceptor.logger.warn(
              `P1017 ConnectionClosed — tentative ${attempt}/${MAX_RETRIES} dans ${wait}ms`,
            );
            return timer(wait);
          }
          throw error;
        },
      }),
    );
  }
}
