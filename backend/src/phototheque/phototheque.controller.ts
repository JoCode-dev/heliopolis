import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PhotothequeService } from './phototheque.service.js';
import { OptionalJwtGuard } from '../common/guards/optional-jwt.guard.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { memoryFileOptions, PREUVE_MIME_TYPES } from '../storage/multer-options.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { UserRole } from '../../generated/prisma/enums.js';

@Controller('phototheque')
export class PhotothequeController {
  constructor(private service: PhotothequeService) {}

  @UseGuards(OptionalJwtGuard)
  @Get('publications')
  listPublications(
    @Query('campId') campId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listPublications(campId, cursor, limit ? Number(limit) : 12);
  }

  @UseGuards(OptionalJwtGuard)
  @Get('camps')
  getCamps() {
    return this.service.getCampsWithPhotos();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.PHOTOGRAPHE)
  @Post('publications')
  @UseInterceptors(
    FilesInterceptor('files', 20, memoryFileOptions(PREUVE_MIME_TYPES, 15 * 1024 * 1024)),
  )
  createPublication(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('campId') campId: string | undefined,
    @Body('caption') caption: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createPublication(files, user.id, campId, caption);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.PHOTOGRAPHE)
  @Delete('publications/:id')
  deletePublication(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.deletePublication(id, user.id, user.role);
  }
}
