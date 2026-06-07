import { Global, Module } from '@nestjs/common';
import { ActionLogService } from './action-log.service.js';
import { LogsController } from './logs.controller.js';

@Global()
@Module({
  providers: [ActionLogService],
  controllers: [LogsController],
  exports: [ActionLogService],
})
export class LogsModule {}
