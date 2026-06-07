import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivateDto } from './dto/activate.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ProfileStatus, AuditAction } from '../../generated/prisma/enums.js';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { ActionLogService } from '../logs/action-log.service.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private actionLog: ActionLogService,
  ) {}

  async activateProfile(dto: ActivateDto) {
    const user = await this.prisma.user.findUnique({
      where: { matricule: dto.matricule },
    });
    if (!user)
      throw new NotFoundException(
        'Matricule non trouvé dans la base nationale',
      );
    if (user.statutProfil === ProfileStatus.ACTIF) {
      throw new BadRequestException('Ce profil est déjà activé');
    }
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { statutProfil: ProfileStatus.EN_ATTENTE_ACTIVATION },
    });
    this.actionLog.record({
      action: AuditAction.STATUS_CHANGE,
      category: 'auth',
      summary: `Activation du matricule ${dto.matricule}`,
      target: { entityType: 'User', entityId: updated.id },
      metadata: { matricule: dto.matricule },
    });
    return {
      message: 'Profil trouvé — veuillez définir un mot de passe',
      userId: updated.id,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ matricule: dto.identifier }, { email: dto.identifier }],
        deletedAt: null,
      },
    });
    if (!user || !user.passwordHash)
      throw new UnauthorizedException('Identifiants invalides');
    if (user.statutProfil !== ProfileStatus.ACTIF) {
      throw new UnauthorizedException('Profil inactif ou en attente');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Identifiants invalides');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    this.actionLog.record({
      action: AuditAction.LOGIN,
      category: 'auth',
      summary: `Connexion de ${user.prenoms} ${user.nom}`,
      actor: {
        id: user.id,
        role: user.role,
        nom: user.nom,
        prenoms: user.prenoms,
      },
      target: { entityType: 'User', entityId: user.id },
    });
    return this.generateTokens(user.id, user.role);
  }

  async refresh(refreshToken: string) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Token de rafraîchissement invalide ou expiré',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
    });
    if (!user || user.deletedAt) throw new UnauthorizedException();
    if (user.statutProfil !== ProfileStatus.ACTIF) {
      throw new UnauthorizedException('Profil inactif ou en attente');
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.generateTokens(user.id, user.role);
  }

  async logout(refreshToken: string) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, nom: true, prenoms: true, role: true } } },
    });
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
    if (stored?.user) {
      this.actionLog.record({
        action: AuditAction.LOGOUT,
        category: 'auth',
        summary: `Déconnexion de ${stored.user.prenoms} ${stored.user.nom}`,
        actor: {
          id: stored.user.id,
          role: stored.user.role,
          nom: stored.user.nom,
          prenoms: stored.user.prenoms,
        },
        target: { entityType: 'User', entityId: stored.user.id },
      });
    }
    return { message: 'Déconnecté' };
  }

  private async generateTokens(userId: string, role: string) {
    const payload = { sub: userId, role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshTokenValue = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshTokenValue)
      .digest('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken: refreshTokenValue };
  }

  async changePassword(userId: string, ancienMotDePasse: string, nouveauMotDePasse: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    const valid = await bcrypt.compare(ancienMotDePasse, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Mot de passe actuel incorrect');
    const passwordHash = await bcrypt.hash(nouveauMotDePasse, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    this.actionLog.record({
      action: AuditAction.UPDATE,
      category: 'auth',
      summary: `Mot de passe modifié par ${user.prenoms} ${user.nom}`,
      actor: {
        id: user.id,
        role: user.role,
        nom: user.nom,
        prenoms: user.prenoms,
      },
      target: { entityType: 'User', entityId: userId },
    });
    return { message: 'Mot de passe modifié avec succès' };
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nom: true,
        prenoms: true,
        matricule: true,
        email: true,
        role: true,
        statutProfil: true,
        avatarUrl: true,
        region: { select: { id: true, nom: true } },
        district: { select: { id: true, nom: true } },
        parish: { select: { id: true, nom: true } },
        adhesions: { orderBy: { annee: 'desc' }, take: 1 },
        _count: { select: { badges: true, submissions: true } },
      },
    });
  }
}
