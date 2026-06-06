import { Module } from '@nestjs/common';
import { CampsService } from './camps.service.js';
import { CampsController } from './camps.controller.js';
import { SettingsModule } from '../settings/settings.module.js';

@Module({
  imports: [SettingsModule],
  providers: [CampsService],
  controllers: [CampsController],
  exports: [CampsService],
})
export class CampsModule {}
