import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChallengesService } from './challenges.service.js';
import { CreateChallengeDto } from './dto/create-challenge.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { OptionalJwtGuard } from '../common/guards/optional-jwt.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import {
  ChallengeCategory,
  ChallengeStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import { R2StorageService } from '../storage/r2-storage.service.js';
import {
  memoryFileOptions,
  PREUVE_MIME_TYPES,
} from '../storage/multer-options.js';

interface ChallengeListQuery {
  categorie?: ChallengeCategory;
  statut?: ChallengeStatus;
  campId?: string;
}

interface SubmitChallengeBody {
  texte?: string;
  preuveUrl?: string;
}

interface ValidateSubmissionBody {
  approved: boolean;
  comment?: string;
}

@Controller('challenges')
export class ChallengesController {
  constructor(
    private challengesService: ChallengesService,
    private storage: R2StorageService,
  ) {}

  @UseGuards(OptionalJwtGuard)
  @Get()
  findAll(@Query() query: ChallengeListQuery) {
    return this.challengesService.findAll(query);
  }

  @UseGuards(OptionalJwtGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.challengesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE, UserRole.GUIDE)
  @Post()
  create(@Body() dto: CreateChallengeDto, @CurrentUser() user: AuthUser) {
    return this.challengesService.create(dto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GARDIEN)
  @Get('my/submissions')
  getMySubmissions(@CurrentUser() user: AuthUser) {
    return this.challengesService.getMySubmissions(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GARDIEN)
  @Post(':id/submit')
  @UseInterceptors(
    FileInterceptor(
      'preuve',
      memoryFileOptions(PREUVE_MIME_TYPES, 10 * 1024 * 1024),
    ),
  )
  async submit(
    @Param('id') id: string,
    @Body() body: SubmitChallengeBody,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    const preuveUrl = file
      ? await this.storage.upload('preuves', file)
      : body.preuveUrl;
    return this.challengesService.submit(id, user.id, { ...body, preuveUrl });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE, UserRole.GUIDE)
  @Post('submissions/:id/validate')
  validate(
    @Param('id') id: string,
    @Body() body: ValidateSubmissionBody,
    @CurrentUser() user: AuthUser,
  ) {
    return this.challengesService.validateSubmission(
      id,
      user,
      body.approved,
      body.comment,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GARDIEN)
  @Delete('submissions/:id')
  retractSubmission(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.challengesService.retractSubmission(id, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE, UserRole.GUIDE)
  @Get('pending/submissions')
  getPending(@CurrentUser() user: AuthUser) {
    return this.challengesService.getPendingSubmissions(user);
  }
}
