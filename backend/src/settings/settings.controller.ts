import { Body, Controller, ForbiddenException, Get, Patch, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { AuditAction, UserRole } from '../../generated/prisma/enums.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { ActionLogService } from '../logs/action-log.service.js';
import { SetPastoralYearDto } from './dto/set-pastoral-year.dto.js';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(
    private settings: SettingsService,
    private actionLog: ActionLogService,
  ) {}

  @Get('annee-pastorale')
  async get() {
    return { annee: await this.settings.getAnneePastorale() };
  }

  @Patch('annee-pastorale')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  async set(@Body() dto: SetPastoralYearDto, @CurrentUser() user: AuthUser) {
    const nouvelleAnnee = dto.annee;
    const actuelle = await this.settings.getAnneePastorale();
    if (user.role === UserRole.REGION) {
      if (nouvelleAnnee < actuelle) {
        throw new ForbiddenException(
          'Le régional ne peut pas réduire l\'année pastorale.',
        );
      }
    }
    const result = await this.settings.setAnneePastorale(nouvelleAnnee);
    this.actionLog.record({
      action: AuditAction.UPDATE,
      category: 'settings',
      summary: `Année pastorale modifiée : ${actuelle} → ${nouvelleAnnee}`,
      actor: user,
      target: { entityType: 'SystemConfig', entityId: 'annee-pastorale' },
      metadata: { before: actuelle, after: nouvelleAnnee },
    });
    return result;
  }
}
