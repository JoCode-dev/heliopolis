import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CouncilsService } from './councils.service.js';
import { CreateCouncilDto } from './dto/create-council.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { UserRole } from '../../generated/prisma/enums.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE, UserRole.GUIDE)
@Controller('councils')
export class CouncilsController {
  constructor(private readonly service: CouncilsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Post()
  create(@Body() dto: CreateCouncilDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCouncilDto>, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
