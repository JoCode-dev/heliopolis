import { Body, Controller, ForbiddenException, Get, Patch, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { AuthUser } from '../common/types/auth-user.js';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get('annee-pastorale')
  async get() {
    return { annee: await this.settings.getAnneePastorale() };
  }

  @Patch('annee-pastorale')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  async set(@Body() body: { annee: number }, @CurrentUser() user: AuthUser) {
    const nouvelleAnnee = Number(body.annee);
    if (user.role === UserRole.REGION) {
      const actuelle = await this.settings.getAnneePastorale();
      if (nouvelleAnnee < actuelle) {
        throw new ForbiddenException(
          'Le régional ne peut pas réduire l\'année pastorale.',
        );
      }
    }
    return this.settings.setAnneePastorale(nouvelleAnnee);
  }
}
