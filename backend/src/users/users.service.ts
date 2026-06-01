import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import {
  AdhesionStatus,
  ProfileStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../common/types/auth-user.js';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private noScope(): Prisma.UserWhereInput {
    return { id: '__no_scope__' };
  }

  private scopeWhere(actor: AuthUser): Prisma.UserWhereInput {
    if (actor.role === UserRole.ADMIN) return {};
    if (actor.role === UserRole.REGION) {
      return actor.regionId ? { regionId: actor.regionId } : this.noScope();
    }
    if (actor.role === UserRole.SENTINELLE) {
      return actor.districtId ? { districtId: actor.districtId } : this.noScope();
    }
    if (actor.role === UserRole.GUIDE) {
      return actor.parishId ? { parishId: actor.parishId } : this.noScope();
    }
    return { id: actor.id };
  }

  private canAccessUser(
    actor: AuthUser,
    target: {
      id: string;
      regionId?: string | null;
      districtId?: string | null;
      parishId?: string | null;
    },
  ) {
    if (actor.role === UserRole.ADMIN) return true;
    if (actor.role === UserRole.REGION) {
      return Boolean(actor.regionId && actor.regionId === target.regionId);
    }
    if (actor.role === UserRole.SENTINELLE) {
      return Boolean(actor.districtId && actor.districtId === target.districtId);
    }
    if (actor.role === UserRole.GUIDE) {
      return Boolean(actor.parishId && actor.parishId === target.parishId);
    }
    return actor.id === target.id;
  }

  private async assertCreateScope(
    dto: Pick<CreateUserDto, 'role' | 'regionId' | 'districtId' | 'parishId'>,
    actor: AuthUser,
  ) {
    if (actor.role === UserRole.ADMIN) return;
    if (dto.role === UserRole.ADMIN) {
      throw new ForbiddenException('Création administrateur réservée');
    }

    // SENTINELLE ne peut créer que des guides dans son doyenné
    if (actor.role === UserRole.SENTINELLE) {
      if (dto.role && dto.role !== UserRole.GUIDE) {
        throw new ForbiddenException('Une sentinelle ne peut créer que des guides');
      }
      if (!actor.districtId) {
        throw new ForbiddenException('Aucun doyenné rattaché à ce compte');
      }
      if (dto.parishId) {
        const parish = await this.prisma.parish.findUnique({
          where: { id: dto.parishId },
          select: { districtId: true },
        });
        if (!parish || parish.districtId !== actor.districtId) {
          throw new ForbiddenException('Paroisse hors périmètre du doyenné');
        }
      }
      return;
    }

    // GUIDE ne peut créer que des gardiens dans sa paroisse
    if (actor.role === UserRole.GUIDE) {
      if (dto.role && dto.role !== UserRole.GARDIEN) {
        throw new ForbiddenException('Un guide ne peut créer que des gardiens');
      }
      if (!actor.parishId) {
        throw new ForbiddenException('Aucune paroisse rattachée à ce compte');
      }
      return;
    }

    // REGION : vérification du périmètre régional
    if (!actor.regionId) {
      throw new ForbiddenException('Aucune région rattachée à ce compte');
    }
    if (dto.regionId && dto.regionId !== actor.regionId) {
      throw new ForbiddenException('Utilisateur hors périmètre régional');
    }
    if ('districtId' in dto && dto.districtId) {
      const district = await this.prisma.district.findUnique({
        where: { id: dto.districtId },
        select: { regionId: true },
      });
      if (!district || district.regionId !== actor.regionId) {
        throw new ForbiddenException('District hors périmètre régional');
      }
    }
    if ('parishId' in dto && dto.parishId) {
      const parish = await this.prisma.parish.findUnique({
        where: { id: dto.parishId },
        select: { district: { select: { regionId: true } } },
      });
      if (!parish || parish.district.regionId !== actor.regionId) {
        throw new ForbiddenException('Paroisse hors périmètre régional');
      }
    }
  }

  private userSelect = {
    id: true,
    nom: true,
    prenoms: true,
    matricule: true,
    email: true,
    telephone: true,
    role: true,
    statutProfil: true,
    avatarUrl: true,
    dateNaissance: true,
    sexe: true,
    lastLoginAt: true,
    createdAt: true,
    regionId: true,
    districtId: true,
    parishId: true,
    region: { select: { id: true, nom: true } },
    district: { select: { id: true, nom: true } },
    parish: { select: { id: true, nom: true } },
    adhesions: { orderBy: { annee: 'desc' as const }, take: 1 },
  } as const;

  async findAll(filters?: {
    role?: UserRole;
    parishId?: string;
    districtId?: string;
    search?: string;
  }, actor?: AuthUser) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(actor && { AND: [this.scopeWhere(actor)] }),
      ...(actor && { id: { not: actor.id } }),
    };
    if (filters?.role) where.role = filters.role;
    if (filters?.parishId) where.parishId = filters.parishId;
    if (filters?.districtId) where.districtId = filters.districtId;
    if (filters?.search) {
      where.OR = [
        { nom: { contains: filters.search, mode: 'insensitive' } },
        { prenoms: { contains: filters.search, mode: 'insensitive' } },
        { matricule: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.user.findMany({
      where,
      select: this.userSelect,
      orderBy: { nom: 'asc' },
    });
  }

  async findOne(id: string, actor: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });
    if (!user) throw new NotFoundException('Gardien introuvable');
    if (!this.canAccessUser(actor, user)) {
      throw new ForbiddenException('Accès refusé à ce profil');
    }
    return user;
  }

  async create(dto: CreateUserDto, actor: AuthUser) {
    await this.assertCreateScope(dto, actor);
    if (dto.matricule) {
      const existing = await this.prisma.user.findUnique({
        where: { matricule: dto.matricule },
      });
      if (existing)
        throw new ConflictException('Ce matricule est déjà enregistré');
    }
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 12)
      : undefined;

    // Rôle par défaut selon le créateur si non spécifié
    const resolvedRole = dto.role ?? (
      actor.role === UserRole.GUIDE ? UserRole.GARDIEN :
      actor.role === UserRole.SENTINELLE ? UserRole.GUIDE :
      UserRole.GARDIEN
    );

    return this.prisma.user.create({
      data: {
        nom: dto.nom,
        prenoms: dto.prenoms,
        matricule: dto.matricule,
        email: dto.email,
        telephone: dto.telephone,
        passwordHash,
        role: resolvedRole,
        dateNaissance: dto.dateNaissance
          ? new Date(dto.dateNaissance)
          : undefined,
        regionId: dto.regionId ?? actor.regionId,
        districtId: dto.districtId ?? actor.districtId,
        parishId: dto.parishId ?? actor.parishId,
        statutProfil: ProfileStatus.ACTIF,
      },
      select: this.userSelect,
    });
  }

  async updateStatut(id: string, statut: ProfileStatus, actor: AuthUser) {
    await this.findOne(id, actor);
    return this.prisma.user.update({
      where: { id },
      data: { statutProfil: statut },
      select: this.userSelect,
    });
  }

  async updateMe(userId: string, dto: { nom?: string; prenoms?: string; email?: string; telephone?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.nom && { nom: dto.nom }),
        ...(dto.prenoms && { prenoms: dto.prenoms }),
        email: dto.email ?? undefined,
        telephone: dto.telephone ?? undefined,
      },
      select: this.userSelect,
    });
  }

  async updateAvatar(userId: string, filename: string) {
    const avatarUrl = `/uploads/avatars/${filename}`;
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser) {
    await this.findOne(id, actor);
    await this.assertCreateScope(dto, actor);
    const { password, ...rest } = dto;
    const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
    return this.prisma.user.update({
      where: { id },
      data: { ...rest, ...(passwordHash && { passwordHash }) },
      select: this.userSelect,
    });
  }

  async remove(id: string, actor: AuthUser) {
    await this.findOne(id, actor);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Gardien archivé' };
  }

  async updateAdhesion(
    userId: string,
    annee: number,
    statut: AdhesionStatus,
    validateurId: string,
    preuveUrl?: string,
  ) {
    const validateur = await this.prisma.user.findUnique({
      where: { id: validateurId },
    });
    if (!validateur) throw new ForbiddenException('Validateur introuvable');
    await this.findOne(userId, validateur);
    return this.prisma.adhesion.upsert({
      where: { userId_annee: { userId, annee } },
      create: {
        userId,
        annee,
        statut,
        validateurId,
        dateValidation: new Date(),
        ...(preuveUrl !== undefined && { preuveUrl }),
      },
      update: {
        statut,
        validateurId,
        dateValidation: new Date(),
        ...(preuveUrl !== undefined && { preuveUrl }),
      },
    });
  }
}
