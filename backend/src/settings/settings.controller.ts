import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';

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
  async set(@Body() body: { annee: number }) {
    return this.settings.setAnneePastorale(Number(body.annee));
  }
}
