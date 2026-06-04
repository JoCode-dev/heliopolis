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
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
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
  constructor(private challengesService: ChallengesService) {}

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
    return this.challengesService.create(dto, user.id);
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
  @UseInterceptors(FileInterceptor('preuve', {
    storage: diskStorage({
      destination: join(process.cwd(), 'uploads', 'preuves'),
      filename: (req, file, cb) => {
        cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase() || '.jpg'}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      cb(null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype));
    },
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  submit(
    @Param('id') id: string,
    @Body() body: SubmitChallengeBody,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    const preuveUrl = file ? `/uploads/preuves/${file.filename}` : body.preuveUrl;
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
  retractSubmission(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.challengesService.retractSubmission(id, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REGION, UserRole.SENTINELLE, UserRole.GUIDE)
  @Get('pending/submissions')
  getPending(@CurrentUser() user: AuthUser) {
    return this.challengesService.getPendingSubmissions(user);
  }
}
