import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CodexService } from './codex.service.js';
import { OptionalJwtGuard } from '../common/guards/optional-jwt.guard.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { UserRole } from '../../generated/prisma/enums.js';

@Controller('codex')
export class CodexController {
  constructor(private codexService: CodexService) {}

  @UseGuards(OptionalJwtGuard)
  @Get('wall')
  getWall(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.codexService.getWall(page ? +page : 1, limit ? +limit : 20);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/react')
  react(
    @Param('id') id: string,
    @Body('emoji') emoji: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.codexService.react(id, user.id, emoji);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/react')
  unreact(
    @Param('id') id: string,
    @Body('emoji') emoji: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.codexService.unreact(id, user.id, emoji);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE, UserRole.GUIDE)
  @Get('moderation/pending')
  getPending(@CurrentUser() user: AuthUser) {
    return this.codexService.getPendingModeration({
      role:       user.role,
      parishId:   user.parishId   ?? undefined,
      districtId: user.districtId ?? undefined,
      regionId:   user.regionId   ?? undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE, UserRole.GUIDE)
  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.codexService.approvePublication(id, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE, UserRole.GUIDE)
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.codexService.rejectPublication(id, user.id, reason);
  }
}
