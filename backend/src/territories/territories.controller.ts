import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { TerritoriesService } from './territories.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { CreateDistrictDto } from './dto/create-district.dto.js';
import { RenameDistrictDto } from './dto/rename-district.dto.js';
import { MergeDistrictsDto } from './dto/merge-districts.dto.js';
import { CreateParishDto } from './dto/create-parish.dto.js';
import { memoryFileOptions } from '../storage/multer-options.js';
import { requireResponsable } from '../common/utils/region-role.util.js';
import type { AuthUser } from '../common/types/auth-user.js';

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
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Post('districts')
  createDistrict(@Req() req: Request, @Body() dto: CreateDistrictDto) {
    requireResponsable(req.user as AuthUser);
    return this.territoriesService.createDistrict(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Patch('districts/:id/rename')
  renameDistrict(@Req() req: Request, @Param('id') id: string, @Body() dto: RenameDistrictDto) {
    requireResponsable(req.user as AuthUser);
    return this.territoriesService.renameDistrict(id, dto.nom);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Post('districts/:id/merge')
  mergeDistricts(@Req() req: Request, @Param('id') sourceId: string, @Body() dto: MergeDistrictsDto) {
    requireResponsable(req.user as AuthUser);
    return this.territoriesService.mergeDistricts(sourceId, dto.targetId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Delete('districts/:id')
  deleteDistrict(@Req() req: Request, @Param('id') id: string) {
    requireResponsable(req.user as AuthUser);
    return this.territoriesService.deleteDistrict(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Post('parishes')
  createParish(@Req() req: Request, @Body() dto: CreateParishDto) {
    requireResponsable(req.user as AuthUser);
    return this.territoriesService.createParish(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Delete('parishes/:id')
  deleteParish(@Req() req: Request, @Param('id') id: string) {
    requireResponsable(req.user as AuthUser);
    return this.territoriesService.deleteParish(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Post('completer-districts')
  completerDistricts(@Req() req: Request) {
    requireResponsable(req.user as AuthUser);
    return this.territoriesService.completerDistricts();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Post('appliquer-excel')
  @UseInterceptors(
    FileInterceptor(
      'fichier',
      memoryFileOptions(
        ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'text/plain'],
        10 * 1024 * 1024,
      ),
    ),
  )
  appliquerExcel(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
    requireResponsable(req.user as AuthUser);
    if (!file) throw new BadRequestException('Fichier Excel manquant');
    return this.territoriesService.appliquerExcel(file.buffer);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Post('compare-excel')
  @UseInterceptors(
    FileInterceptor(
      'fichier',
      memoryFileOptions(
        ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'text/plain'],
        10 * 1024 * 1024,
      ),
    ),
  )
  compareExcel(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
    requireResponsable(req.user as AuthUser);
    if (!file) throw new BadRequestException('Fichier Excel manquant');
    return this.territoriesService.compareExcel(file.buffer);
  }
}
