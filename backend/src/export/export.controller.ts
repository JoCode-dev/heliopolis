import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { AuditAction, UserRole } from '../../generated/prisma/enums.js';
import { ActionLogService } from '../logs/action-log.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE)
@Controller('export')
export class ExportController {
  constructor(
    private exportService: ExportService,
    private actionLog: ActionLogService,
  ) {}

  @Get('camps/:id/participants')
  async exportParticipants(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const buffer = await this.exportService.exportParticipants(id, user);
    this.actionLog.record({
      action: AuditAction.EXPORT,
      category: 'export',
      summary: `Export participants du camp ${id}`,
      actor: user,
      target: { entityType: 'Camp', entityId: id },
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="participants-${id}.xlsx"`);
    res.send(buffer);
  }

  @Get('adhesions')
  async exportAdhesions(
    @CurrentUser() user: AuthUser,
    @Query('campId') campId: string | undefined,
    @Query('annee') anneeStr: string | undefined,
    @Res() res: Response,
  ) {
    const anneeParam = anneeStr ? parseInt(anneeStr, 10) : undefined;
    const { buffer, annee, campNom } = await this.exportService.exportAdhesions(user, campId, anneeParam);
    this.actionLog.record({
      action: AuditAction.EXPORT,
      category: 'export',
      summary: `Export cotisations ${annee}${campNom ? ` — ${campNom}` : ''}`,
      actor: user,
      target: { entityType: 'Export', entityId: `adhesions-${annee}` },
      metadata: { campId, annee },
    });
    const suffix = campNom ? `-${campNom.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="cotisations-${annee}${suffix}.xlsx"`);
    res.send(buffer);
  }
}
