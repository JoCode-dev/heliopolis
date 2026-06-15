import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { ActionLogService } from './action-log.service.js';
import { QueryLogsDto } from './dto/query-logs.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('logs')
export class LogsController {
  constructor(private readonly actionLogService: ActionLogService) {}

  @Get('dates')
  listDates() {
    return this.actionLogService.listDates();
  }

  @Get()
  query(@Query() dto: QueryLogsDto) {
    return this.actionLogService.query(dto);
  }

  @Delete('all')
  deleteAll() {
    return this.actionLogService.deleteAll();
  }

  @Delete(':date')
  deleteByDate(@Param('date') date: string) {
    return this.actionLogService.deleteByDate(date);
  }
}
