import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto.js';
import { PreEnregistrerDto } from './dto/pre-enregistrer.dto.js';
import { UpdateAdhesionDto } from './dto/update-adhesion.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { AdhesionStatus, ProfileStatus, UserRole } from '../../generated/prisma/enums.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { R2StorageService } from '../storage/r2-storage.service.js';
import {
  ADHESION_MIME_TYPES,
  AVATAR_MIME_TYPES,
  memoryFileOptions,
} from '../storage/multer-options.js';

interface FindUsersQuery {
  role?: UserRole;
  parishId?: string;
  districtId?: string;
  search?: string;
  statutProfil?: ProfileStatus;
}


@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private storage: R2StorageService,
  ) {}

  @Patch('me')
  updateMe(@Body() dto: UpdateMyProfileDto, @CurrentUser() user: AuthUser) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Patch('me/avatar')
  @UseInterceptors(
    FileInterceptor(
      'avatar',
      memoryFileOptions(AVATAR_MIME_TYPES, 5 * 1024 * 1024),
    ),
  )
  async updateAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Fichier image manquant ou format non supporté (JPEG, PNG, WebP)',
      );
    }
    const avatarUrl = await this.storage.upload('avatars', file);
    return this.usersService.updateAvatar(user.id, avatarUrl);
  }

  /** Pré-enregistrement d'un seul matricule (ADMIN) */
  @Roles(UserRole.ADMIN)
  @Post('pre-enregistrer')
  preEnregistrer(
    @Body() dto: PreEnregistrerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.preEnregistrer(dto, user);
  }

  /** Import en masse depuis un fichier CSV ou Excel (ADMIN) */
  @Roles(UserRole.ADMIN)
  @Post('importer')
  @UseInterceptors(
    FileInterceptor(
      'fichier',
      memoryFileOptions(
        ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'],
        5 * 1024 * 1024,
      ),
    ),
  )
  async importerMatricules(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
    @Body('forceRole') forceRole?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Fichier CSV ou Excel manquant');
    }
    const role = ['GARDIEN', 'GUIDE', 'SENTINELLE', 'REGION'].includes(forceRole ?? '')
      ? (forceRole as UserRole)
      : undefined;
    return this.usersService.importerMatricules(file.buffer, user, role);
  }

  /** Promotion d'un membre : GUIDE → SENTINELLE, ou GUIDE/SENTINELLE → REGION (ADMIN) */
  @Roles(UserRole.ADMIN)
  @Patch(':id/promouvoir')
  promouvoir(
    @Param('id') id: string,
    @Body() body: { role: UserRole },
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.promouvoir(id, body.role, user);
  }

  @Get()
  findAll(@Query() query: FindUsersQuery, @CurrentUser() user: AuthUser) {
    return this.usersService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.findOne(id, user);
  }

  /** Création d'un membre — ADMIN/REGION direct, GUIDE/SENTINELLE → EN_ATTENTE_VALIDATION */
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE, UserRole.GUIDE)
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthUser) {
    return this.usersService.create(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Patch(':id/valider')
  valider(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.valider(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Patch(':id/rejeter')
  rejeter(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.rejeter(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.update(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Patch(':id/reset-password')
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.resetPassword(id, dto.password, user);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/statut')
  updateStatut(
    @Param('id') id: string,
    @Body() body: { statut: ProfileStatus },
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.updateStatut(id, body.statut, user);
  }

  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.remove(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.REGION)
  @Delete(':id/purger')
  purger(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.purger(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE, UserRole.GUIDE)
  @Patch(':id/adhesion')
  @UseInterceptors(
    FileInterceptor(
      'preuve',
      memoryFileOptions(ADHESION_MIME_TYPES, 10 * 1024 * 1024),
    ),
  )
  async updateAdhesion(
    @Param('id') id: string,
    @Body() body: UpdateAdhesionDto,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const annee = body.annee;
    const preuveUrl = file
      ? await this.storage.upload('adhesions', file)
      : undefined;
    return this.usersService.updateAdhesion(
      id,
      annee,
      body.statut,
      user.id,
      preuveUrl,
    );
  }
}
