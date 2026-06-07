import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import 'dotenv/config'; // doit être le 1er import — charge le .env avant tout module
import 'reflect-metadata';
import { AppModule } from './app.module.js';
import { DbRetryInterceptor } from './common/interceptors/db-retry.interceptor.js';
import { RedisIoAdapter } from './redis/redis-io.adapter.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new DbRetryInterceptor());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`Codex des Gardiens API — port ${port}`);
}

bootstrap().catch((err: unknown) => {
  console.error('Échec du démarrage :', err);
  process.exit(1);
});
