import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AnnoncesService } from './annonces.service.js';
import { OptionalJwtGuard } from '../common/guards/optional-jwt.guard.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { memoryFileOptions, PREUVE_MIME_TYPES } from '../storage/multer-options.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { CreateAnnonceDto } from './dto/create-annonce.dto.js';
import { UpdateAnnonceDto } from './dto/update-annonce.dto.js';

@Controller('annonces')
export class AnnoncesController {
  constructor(private service: AnnoncesService) {}

  /** Annonces publiques (publiées / planifiées dont la date est passée) */
  @UseGuards(OptionalJwtGuard)
  @Get()
  list() {
    return this.service.list();
  }

  /** Toutes les annonces — admin/région seulement */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Get('all')
  listAll() {
    return this.service.listAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Post()
  @UseInterceptors(
    FilesInterceptor('photos', 10, memoryFileOptions(PREUVE_MIME_TYPES, 15 * 1024 * 1024)),
  )
  create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateAnnonceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(dto, files, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Patch(':id')
  @UseInterceptors(
    FilesInterceptor('photos', 10, memoryFileOptions(PREUVE_MIME_TYPES, 15 * 1024 * 1024)),
  )
  update(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UpdateAnnonceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, files, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Delete('photos/:photoId')
  deletePhoto(@Param('photoId') photoId: string) {
    return this.service.deletePhoto(photoId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.id, user.role);
  }
}
