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
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
  @Get()
  list(@Query('campId') campId?: string) {
    return this.service.list(campId);
  }

  @UseGuards(OptionalJwtGuard)
  @Get('camps')
  getCamps() {
    return this.service.getCampsWithPhotos();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.PHOTOGRAPHE)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', memoryFileOptions(PREUVE_MIME_TYPES, 15 * 1024 * 1024)),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('campId') campId: string | undefined,
    @Body('caption') caption: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.upload(file, user.id, campId, caption);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.PHOTOGRAPHE)
  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.delete(id, user.id, user.role);
  }
}
