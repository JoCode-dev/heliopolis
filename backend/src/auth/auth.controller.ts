import {
  Body,
  Controller,
  Get,
  UnauthorizedException,
  Post,
  Patch,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { ActivateDto } from './dto/activate.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { InscrireDto } from './dto/inscrire.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { VerifierMatriculeDto } from './dto/verifier-matricule.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { Response } from 'express';
import type {
  AuthUser,
  RequestWithCookies,
} from '../common/types/auth-user.js';

interface RefreshBody {
  refreshToken?: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
  ) {}

  /** Vérifier si un matricule est pré-enregistré et disponible */
  @Post('verifier-matricule')
  verifierMatricule(@Body() dto: VerifierMatriculeDto) {
    return this.authService.verifierMatricule(dto.matricule);
  }

  /** Auto-inscription : le gardien/guide complète son profil */
  @Post('inscrire')
  async inscrire(
    @Body() dto: InscrireDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.inscrire(dto);
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/api/auth/refresh',
    });
    return tokens;
  }

  /** Maintenu pour compatibilité */
  @Post('activate')
  activate(@Body() dto: ActivateDto) {
    return this.authService.activateProfile(dto);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(dto);
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/api/auth/refresh',
    });
    return tokens;
  }

  @Post('refresh')
  async refresh(
    @Req() req: RequestWithCookies<'refresh_token'>,
    @Body() body: RefreshBody,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refresh_token ?? body?.refreshToken;
    if (!token)
      throw new UnauthorizedException('Token de rafraîchissement manquant');
    const tokens = await this.authService.refresh(token);
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
    });
    return tokens;
  }

  @Post('logout')
  async logout(
    @Req() req: RequestWithCookies<'refresh_token'>,
    @Body() body: RefreshBody,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refresh_token ?? body?.refreshToken;
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    if (!token) return { message: 'Déconnecté' };
    return this.authService.logout(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.id);
  }

  // Token court-vécu (5 min) pour authentifier la connexion WebSocket
  // Le cookie httpOnly access_token n'est pas toujours transmis sur le handshake WS
  @UseGuards(JwtAuthGuard)
  @Get('ws-token')
  getWsToken(@CurrentUser() user: AuthUser) {
    const token = this.jwtService.sign(
      { sub: user.id, role: user.role },
      { secret: process.env.JWT_SECRET, expiresIn: '24h' },
    );
    return { token };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: AuthUser) {
    return this.authService.changePassword(user.id, dto.ancienMotDePasse, dto.nouveauMotDePasse);
  }
}
