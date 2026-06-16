import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AuthRateLimitMiddleware } from './common/middleware/auth-rate-limit.middleware.js';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AnnoncesModule } from './annonces/annonces.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BadgesModule } from './badges/badges.module.js';
import { CampsModule } from './camps/camps.module.js';
import { ChallengesModule } from './challenges/challenges.module.js';
import { CodexModule } from './codex/codex.module.js';
import { PhotothequeModule } from './phototheque/phototheque.module.js';
import { ContactsModule } from './contacts/contacts.module.js';
import { CouncilsModule } from './councils/councils.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { ExportModule } from './export/export.module.js';
import { LogsModule } from './logs/logs.module.js';
import { RequestContextMiddleware } from './logs/request-context.middleware.js';
import { MessagingModule } from './messaging/messaging.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { SchedulerModule } from './scheduler/scheduler.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { StorageModule } from './storage/storage.module.js';
import { TerritoriesModule } from './territories/territories.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    StorageModule,
    LogsModule,
    PrismaModule,
    RedisModule,
    AnnoncesModule,
    AuthModule,
    UsersModule,
    TerritoriesModule,
    CampsModule,
    ChallengesModule,
    BadgesModule,
    CodexModule,
    PhotothequeModule,
    MessagingModule,
    ExportModule,
    ContactsModule,
    CouncilsModule,
    NotificationsModule,
    SettingsModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
    consumer
      .apply(AuthRateLimitMiddleware)
      .forRoutes(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/inscrire', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
        { path: 'auth/verifier-matricule', method: RequestMethod.POST },
      );
  }
}
