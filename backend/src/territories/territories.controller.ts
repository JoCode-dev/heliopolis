import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
  createDistrict(@Body() dto: CreateDistrictDto) {
    return this.territoriesService.createDistrict(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('districts/:id/rename')
  renameDistrict(@Param('id') id: string, @Body() dto: RenameDistrictDto) {
    return this.territoriesService.renameDistrict(id, dto.nom);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('districts/:id/merge')
  mergeDistricts(@Param('id') sourceId: string, @Body() dto: MergeDistrictsDto) {
    return this.territoriesService.mergeDistricts(sourceId, dto.targetId);
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
  createParish(@Body() dto: CreateParishDto) {
    return this.territoriesService.createParish(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('parishes/:id')
  deleteParish(@Param('id') id: string) {
    return this.territoriesService.deleteParish(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('completer-districts')
  completerDistricts() {
    return this.territoriesService.completerDistricts();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
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
  appliquerExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier Excel manquant');
    return this.territoriesService.appliquerExcel(file.buffer);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
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
  compareExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier Excel manquant');
    return this.territoriesService.compareExcel(file.buffer);
  }
}
