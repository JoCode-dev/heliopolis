import { Module } from '@nestjs/common';
import { CouncilsService } from './councils.service.js';
import { CouncilsController } from './councils.controller.js';

@Module({
  providers: [CouncilsService],
  controllers: [CouncilsController],
})
export class CouncilsModule {}
