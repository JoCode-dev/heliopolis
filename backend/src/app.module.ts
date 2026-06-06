import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
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
})
export class AppModule {}
