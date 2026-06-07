import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TerritoriesService } from './territories.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';

@Controller('territories')
export class TerritoriesController {
  constructor(private territoriesService: TerritoriesService) {}

  @Get('stats')
  getStats() {
    return this.territoriesService.getStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Get('dashboard-stats')
  getDashboardStats() {
    return this.territoriesService.getDashboardStats();
  }

  @Get('regions')
  getRegions() {
    return this.territoriesService.getRegions();
  }

  @Get('districts')
  getDistricts(@Query('regionId') regionId?: string) {
    return this.territoriesService.getDistricts(regionId);
  }

  @Get('parishes')
  getParishes(@Query('districtId') districtId?: string) {
    return this.territoriesService.getParishes(districtId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('districts')
  createDistrict(@Body() body: { nom: string; code?: string; regionId: string }) {
    return this.territoriesService.createDistrict(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('districts/:id')
  deleteDistrict(@Param('id') id: string) {
    return this.territoriesService.deleteDistrict(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('parishes')
  createParish(@Body() body: { nom: string; districtId: string }) {
    return this.territoriesService.createParish(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('parishes/:id')
  deleteParish(@Param('id') id: string) {
    return this.territoriesService.deleteParish(id);
  }
}
