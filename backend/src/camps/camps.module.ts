import { Module } from '@nestjs/common';
import { CampsService } from './camps.service.js';
import { CampsController } from './camps.controller.js';
import { SettingsModule } from '../settings/settings.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [SettingsModule, NotificationsModule],
  providers: [CampsService],
  controllers: [CampsController],
  exports: [CampsService],
})
export class CampsModule {}
