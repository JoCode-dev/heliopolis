import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import 'dotenv/config'; // doit être le 1er import — charge le .env avant tout module
import 'reflect-metadata';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module.js';
import { DbRetryInterceptor } from './common/interceptors/db-retry.interceptor.js';
import { RedisIoAdapter } from './redis/redis-io.adapter.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const avatarsDir = join(process.cwd(), 'uploads', 'avatars');
  if (!existsSync(avatarsDir)) mkdirSync(avatarsDir, { recursive: true });
  const adhesionsDir = join(process.cwd(), 'uploads', 'adhesions');
  if (!existsSync(adhesionsDir)) mkdirSync(adhesionsDir, { recursive: true });
  const preuvesDir = join(process.cwd(), 'uploads', 'preuves');
  if (!existsSync(preuvesDir)) mkdirSync(preuvesDir, { recursive: true });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new DbRetryInterceptor());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(process.env.PORT || 4000);
  console.log(`Codex des Gardiens API — port ${process.env.PORT || 4000}`);
}
void bootstrap();
