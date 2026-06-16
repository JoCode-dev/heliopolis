import {
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CampsService } from './camps.service.js';
import { CreateCampDto } from './dto/create-camp.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { OptionalJwtGuard } from '../common/guards/optional-jwt.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import {
  CampStatus,
  CampType,
  UserRole,
} from '../../generated/prisma/enums.js';

interface CampListQuery {
  statut?: CampStatus;
  type?: CampType;
}

@Controller('camps')
export class CampsController {
  constructor(private campsService: CampsService) {}

  @UseGuards(OptionalJwtGuard)
  @Get()
  findAll(@Query() query: CampListQuery, @CurrentUser() user?: AuthUser) {
    return this.campsService.findAll(query, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('requests-pending')
  getPendingRequestsCount(@CurrentUser() user: AuthUser) {
    return this.campsService.getPendingRequestsCount(user);
  }

  @UseGuards(OptionalJwtGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.campsService.findOne(id, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Post()
  create(@Body() dto: CreateCampDto, @CurrentUser() user: AuthUser) {
    return this.campsService.create(dto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('statut') statut: CampStatus,
    @CurrentUser() user: AuthUser,
  ) {
    return this.campsService.updateStatus(id, statut, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/my-participation')
  getMyParticipation(@Param('id') campId: string, @CurrentUser() user: AuthUser) {
    return this.campsService.getMyParticipation(campId, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GARDIEN)
  @Post(':id/express-interest')
  expressInterest(@Param('id') campId: string, @CurrentUser() user: AuthUser) {
    return this.campsService.expressInterest(campId, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GARDIEN)
  @Delete(':id/withdraw')
  withdrawInterest(@Param('id') campId: string, @CurrentUser() user: AuthUser) {
    return this.campsService.withdrawInterest(campId, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE, UserRole.GUIDE)
  @Get(':id/participants')
  getParticipants(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.campsService.getParticipants(id, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE, UserRole.GUIDE)
  @Post(':id/participants')
  selectParticipant(
    @Param('id') campId: string,
    @Body('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.campsService.selectParticipant(campId, userId, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE, UserRole.GUIDE)
  @Delete(':campId/participants/:userId')
  removeParticipant(
    @Param('campId') campId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.campsService.removeParticipant(campId, userId, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE, UserRole.GUIDE)
  @Patch(':campId/participants/:userId/block')
  blockParticipant(
    @Param('campId') campId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.campsService.blockParticipant(campId, userId, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE, UserRole.GUIDE)
  @Patch(':campId/participants/:userId/unblock')
  unblockParticipant(
    @Param('campId') campId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.campsService.unblockParticipant(campId, userId, user.id);
  }
}
