import { Module } from '@nestjs/common';
import { ExportService } from './export.service.js';
import { ExportController } from './export.controller.js';
import { SettingsModule } from '../settings/settings.module.js';

@Module({
  imports: [SettingsModule],
  providers: [ExportService],
  controllers: [ExportController],
})
export class ExportModule {}
