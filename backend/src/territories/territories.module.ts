import { Module } from '@nestjs/common';
import { TerritoriesService } from './territories.service.js';
import { TerritoriesController } from './territories.controller.js';
import { SettingsModule } from '../settings/settings.module.js';

@Module({
  imports: [SettingsModule],
  providers: [TerritoriesService],
  controllers: [TerritoriesController],
})
export class TerritoriesModule {}
