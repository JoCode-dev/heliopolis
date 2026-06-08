import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { TerritoriesModule } from './territories/territories.module.js';
import { CampsModule } from './camps/camps.module.js';
import { ChallengesModule } from './challenges/challenges.module.js';
import { BadgesModule } from './badges/badges.module.js';
import { CodexModule } from './codex/codex.module.js';
import { MessagingModule } from './messaging/messaging.module.js';
import { ExportModule } from './export/export.module.js';
import { ContactsModule } from './contacts/contacts.module.js';
import { CouncilsModule } from './councils/councils.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { LogsModule } from './logs/logs.module.js';
import { RequestContextMiddleware } from './logs/request-context.middleware.js';
import { StorageModule } from './storage/storage.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StorageModule,
    LogsModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    TerritoriesModule,
    CampsModule,
    ChallengesModule,
    BadgesModule,
    CodexModule,
    MessagingModule,
    ExportModule,
    ContactsModule,
    CouncilsModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
