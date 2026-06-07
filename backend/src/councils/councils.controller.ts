import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { OptionalJwtGuard } from '../common/guards/optional-jwt.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { CouncilsService } from './councils.service.js';
import { CreateCouncilDto } from './dto/create-council.dto.js';
import { RegisterCouncilParticipantDto } from './dto/register-council-participant.dto.js';
import { UpdateCouncilFeedbackDto } from './dto/update-council-feedback.dto.js';

@Controller('councils')
export class CouncilsController {
  constructor(private readonly service: CouncilsService) {}

  @Get('public/:token')
  findPublicByToken(@Param('token') token: string) {
    return this.service.findPublicByToken(token);
  }

  @UseGuards(OptionalJwtGuard)
  @Post('public/:token/register')
  registerParticipant(
    @Param('token') token: string,
    @Body() dto: RegisterCouncilParticipantDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.service.registerParticipant(token, dto, user);
  }

  @UseGuards(OptionalJwtGuard)
  @Patch('public/:token/feedback')
  updateFeedback(
    @Param('token') token: string,
    @Body() dto: UpdateCouncilFeedbackDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.service.updateFeedback(token, dto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE, UserRole.GUIDE)
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE, UserRole.GUIDE)
  @Get(':id/participants')
  getParticipants(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.getParticipants(id, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE, UserRole.GUIDE)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Post()
  create(@Body() dto: CreateCouncilDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCouncilDto>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}
