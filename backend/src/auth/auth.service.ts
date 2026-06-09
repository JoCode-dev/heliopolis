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
import { InscrireDto } from './dto/inscrire.dto.js';
import { ProfileStatus, AuditAction, UserRole } from '../../generated/prisma/enums.js';
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

  private computeAge(dateNaissance: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateNaissance.getFullYear();
    const m = today.getMonth() - dateNaissance.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dateNaissance.getDate())) age--;
    return age;
  }

  static determineRoleFromAge(dateNaissance: Date): UserRole {
    const today = new Date();
    let age = today.getFullYear() - dateNaissance.getFullYear();
    const m = today.getMonth() - dateNaissance.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dateNaissance.getDate())) age--;
    if (age < 18) throw new BadRequestException('Âge minimum requis : 18 ans révolus');
    if (age < 21) return UserRole.GARDIEN;
    return UserRole.GUIDE;
  }

  /** Vérifie qu'un matricule est pré-enregistré et disponible pour l'auto-inscription */
  async verifierMatricule(matricule: string) {
    const user = await this.prisma.user.findUnique({
      where: { matricule },
      select: { id: true, role: true, nom: true, prenoms: true, statutProfil: true },
    });
    if (!user) {
      throw new NotFoundException('Matricule non trouvé dans la base nationale');
    }
    if (user.statutProfil === ProfileStatus.ACTIF) {
      throw new BadRequestException('Ce profil est déjà activé. Utilisez la connexion.');
    }
    return {
      userId: user.id,
      role: user.role,
      hasProfile: Boolean(user.nom && user.prenoms),
    };
  }

  /** Inscription : vérifie matricule + date de naissance, crée le compte avec nom/prénoms fournis */
  async inscrire(dto: InscrireDto) {
    const user = await this.prisma.user.findUnique({
      where: { matricule: dto.matricule },
    });
    if (!user) {
      throw new NotFoundException('Matricule non trouvé dans la base nationale');
    }
    if (user.statutProfil === ProfileStatus.ACTIF) {
      throw new BadRequestException('Ce profil est déjà activé. Utilisez la connexion.');
    }
    if (!user.dateNaissance) {
      throw new BadRequestException(
        'Date de naissance non enregistrée pour ce matricule. Contactez votre responsable.',
      );
    }

    // Comparaison stricte en UTC (le champ @db.Date est stocké minuit UTC)
    const provided = new Date(dto.dateNaissance);
    if (
      user.dateNaissance.getUTCFullYear() !== provided.getUTCFullYear() ||
      user.dateNaissance.getUTCMonth()    !== provided.getUTCMonth()    ||
      user.dateNaissance.getUTCDate()     !== provided.getUTCDate()
    ) {
      throw new BadRequestException('Date de naissance incorrecte. Vérifiez vos informations.');
    }

    // Rôle calculé depuis l'âge réel
    const role = AuthService.determineRoleFromAge(provided);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        nom: dto.nom,
        prenoms: dto.prenoms,
        passwordHash,
        role,
        statutProfil: ProfileStatus.ACTIF,
      },
    });
    this.actionLog.record({
      action: AuditAction.CREATE,
      category: 'auth',
      summary: `Inscription de ${dto.prenoms} ${dto.nom} (${role})`,
      target: { entityType: 'User', entityId: updated.id },
      metadata: { matricule: dto.matricule, role },
    });
    return this.generateTokens(updated.id, updated.role);
  }

  /** Maintenu pour compatibilité — vérifie juste que le matricule existe */
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
    return {
      message: 'Profil trouvé — veuillez compléter votre inscription',
      userId: user.id,
      hasProfile: Boolean(user.nom && user.prenoms),
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
    const displayName = [user.prenoms, user.nom].filter(Boolean).join(' ') || user.matricule || user.id;
    this.actionLog.record({
      action: AuditAction.LOGIN,
      category: 'auth',
      summary: `Connexion de ${displayName}`,
      actor: {
        id: user.id,
        role: user.role,
        nom: user.nom ?? '',
        prenoms: user.prenoms ?? '',
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
      const displayName = [stored.user.prenoms, stored.user.nom].filter(Boolean).join(' ') || stored.user.id;
      this.actionLog.record({
        action: AuditAction.LOGOUT,
        category: 'auth',
        summary: `Déconnexion de ${displayName}`,
        actor: {
          id: stored.user.id,
          role: stored.user.role,
          nom: stored.user.nom ?? '',
          prenoms: stored.user.prenoms ?? '',
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
    const displayName = [user.prenoms, user.nom].filter(Boolean).join(' ') || user.matricule || userId;
    this.actionLog.record({
      action: AuditAction.UPDATE,
      category: 'auth',
      summary: `Mot de passe modifié par ${displayName}`,
      actor: {
        id: user.id,
        role: user.role,
        nom: user.nom ?? '',
        prenoms: user.prenoms ?? '',
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
        telephone: true,
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
