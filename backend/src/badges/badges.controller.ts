import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { BadgesService } from './badges.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { AuthUser } from '../common/types/auth-user.js';

@Controller('badges')
export class BadgesController {
  constructor(private badgesService: BadgesService) {}

  @Get()
  findAll() {
    return this.badgesService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  getMyBadges(@CurrentUser() user: AuthUser) {
    return this.badgesService.getMyBadges(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Post()
  create(
    @Body() body: { nom: string; code: string; description: string; condition: string; niveau: string; conditionMeta: unknown },
    @CurrentUser() user: AuthUser,
  ) {
    return this.badgesService.create(body, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Partial<{ nom: string; code: string; description: string; condition: string; niveau: string; conditionMeta: unknown }>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.badgesService.update(id, body, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.badgesService.remove(id, user);
  }
}
