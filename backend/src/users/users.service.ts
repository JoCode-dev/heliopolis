import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PreEnregistrerDto } from './dto/pre-enregistrer.dto.js';
import {
  AdhesionStatus,
  AuditAction,
  ProfileStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { ActionLogService } from '../logs/action-log.service.js';
import * as bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private actionLog: ActionLogService,
  ) {}

  /** Détermine le rôle d'un membre selon son âge (18-20 = GARDIEN, 21+ = GUIDE) */
  static determineRoleFromAge(dateNaissance: Date): UserRole {
    const today = new Date();
    let age = today.getFullYear() - dateNaissance.getFullYear();
    const m = today.getMonth() - dateNaissance.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dateNaissance.getDate())) age--;
    if (age < 18) throw new BadRequestException('Âge minimum requis : 18 ans révolus');
    if (age < 21) return UserRole.GARDIEN;
    return UserRole.GUIDE;
  }

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
    langue: true,
    notifPush: true,
    notifEmail: true,
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
    statutProfil?: ProfileStatus;
  }, actor?: AuthUser) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(actor && { AND: [this.scopeWhere(actor)] }),
      ...(actor && { id: { not: actor.id } }),
    };
    if (filters?.role) where.role = filters.role;
    if (filters?.parishId) where.parishId = filters.parishId;
    if (filters?.districtId) where.districtId = filters.districtId;
    if (filters?.statutProfil) where.statutProfil = filters.statutProfil;
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

  /** Création manuelle réservée à l'ADMIN (cas exceptionnels) */
  async create(dto: CreateUserDto, actor: AuthUser) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('La création directe de membres est réservée à l\'administrateur. Utilisez le pré-enregistrement de matricule.');
    }
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

    const created = await this.prisma.user.create({
      data: {
        nom: dto.nom,
        prenoms: dto.prenoms,
        matricule: dto.matricule,
        email: dto.email,
        telephone: dto.telephone,
        passwordHash,
        role: dto.role ?? UserRole.GARDIEN,
        dateNaissance: dto.dateNaissance
          ? new Date(dto.dateNaissance)
          : undefined,
        regionId: dto.regionId,
        districtId: dto.districtId,
        parishId: dto.parishId,
        statutProfil: ProfileStatus.ACTIF,
      },
      select: this.userSelect,
    });
    this.actionLog.record({
      action: AuditAction.CREATE,
      category: 'user',
      summary: `Création du membre ${created.prenoms ?? ''} ${created.nom ?? ''} (${created.role})`,
      actor: actor,
      target: { entityType: 'User', entityId: created.id },
      metadata: { role: created.role, matricule: created.matricule },
    });
    return created;
  }

  /** Pré-enregistre un matricule — seul l'ADMIN peut le faire */
  async preEnregistrer(dto: PreEnregistrerDto, actor: AuthUser) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Seul l\'administrateur peut pré-enregistrer des matricules');
    }
    const existing = await this.prisma.user.findUnique({
      where: { matricule: dto.matricule },
    });
    if (existing) throw new ConflictException('Ce matricule est déjà enregistré');

    const dateNaissance = new Date(dto.dateNaissance);
    const role = UsersService.determineRoleFromAge(dateNaissance);

    const created = await this.prisma.user.create({
      data: {
        matricule: dto.matricule,
        dateNaissance,
        role,
        nom: dto.nom ?? null,
        prenoms: dto.prenoms ?? null,
        regionId: dto.regionId ?? null,
        districtId: dto.districtId ?? null,
        parishId: dto.parishId ?? null,
        statutProfil: ProfileStatus.EN_ATTENTE_ACTIVATION,
      },
      select: this.userSelect,
    });
    this.actionLog.record({
      action: AuditAction.CREATE,
      category: 'user',
      summary: `Pré-enregistrement du matricule ${dto.matricule} → rôle : ${role}`,
      actor,
      target: { entityType: 'User', entityId: created.id },
      metadata: { matricule: dto.matricule, role, dateNaissance: dto.dateNaissance },
    });
    return created;
  }

  /** Import en masse depuis un fichier CSV ou Excel */
  async importerMatricules(
    buffer: Buffer,
    actor: AuthUser,
  ): Promise<{ importes: number; ignores: number; erreurs: { matricule: string; raison: string }[] }> {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Seul l\'administrateur peut importer des matricules');
    }

    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    // Cache district / paroisse pour éviter N+1
    const districtCache = new Map<string, string | null>();
    const parishCache   = new Map<string, string | null>();

    const resolveDistrict = async (nom: string): Promise<string | null> => {
      const key = nom.toLowerCase().trim();
      if (!key) return null;
      if (districtCache.has(key)) return districtCache.get(key)!;
      const d = await this.prisma.district.findFirst({
        where: { nom: { equals: key, mode: 'insensitive' } },
        select: { id: true },
      });
      const id = d?.id ?? null;
      districtCache.set(key, id);
      return id;
    };

    const resolveParish = async (nom: string, districtId: string | null): Promise<string | null> => {
      const nomKey = nom.toLowerCase().trim();
      if (!nomKey) return null;
      const cacheKey = `${districtId ?? ''}:${nomKey}`;
      if (parishCache.has(cacheKey)) return parishCache.get(cacheKey)!;
      const where: Prisma.ParishWhereInput = { nom: { equals: nomKey, mode: 'insensitive' } };
      if (districtId) where.districtId = districtId;
      const p = await this.prisma.parish.findFirst({ where, select: { id: true } });
      const id = p?.id ?? null;
      parishCache.set(cacheKey, id);
      return id;
    };

    const parseDate = (raw: unknown): Date | null => {
      if (raw instanceof Date && !isNaN(raw.getTime())) return raw;
      const s = String(raw).trim();
      // DD/MM/YYYY (format utilisé dans les fichiers nationaux)
      const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
      if (m) {
        const d = new Date(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}T00:00:00Z`);
        if (!isNaN(d.getTime())) return d;
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    let importes = 0;
    let ignores = 0;
    const erreurs: { matricule: string; raison: string }[] = [];

    for (const row of rows) {
      // Colonnes format national (PDF/Excel) + rétro-compat colonnes techniques
      const matricule = String(
        row['Matricule'] ?? row['matricule'] ?? ''
      ).trim().toUpperCase();

      const rawDate =
        row['Date de Naissance'] ?? row['dateNaissance'] ??
        row['date_naissance']   ?? row['DateNaissance']  ??
        row['Date Naissance']   ?? '';

      const nomVal = String(row['Nom'] ?? row['nom'] ?? '').trim() || null;
      const prenomsVal = String(
        row['Prenom'] ?? row['Prénom'] ?? row['prenoms'] ??
        row['Prenoms'] ?? row['prénoms'] ?? ''
      ).trim() || null;

      const districtName = String(row['District'] ?? row['district'] ?? '').trim();
      const parishName   = String(
        row['Groupe Scoute'] ?? row['Groupe Scout'] ?? row['groupe_scoute'] ?? ''
      ).trim();

      // IDs directs (ancien format) — prioritaires sur la résolution par nom
      const directRegionId   = String(row['regionId']   ?? row['region_id']   ?? '').trim() || null;
      const directDistrictId = String(row['districtId'] ?? row['district_id'] ?? '').trim() || null;
      const directParishId   = String(row['parishId']   ?? row['parish_id']   ?? '').trim() || null;

      if (!matricule || !/^\d{7}[A-Z]$/.test(matricule)) {
        erreurs.push({ matricule: matricule || '(vide)', raison: 'Format de matricule invalide' });
        continue;
      }

      const dateNaissance = parseDate(rawDate);
      if (!dateNaissance) {
        erreurs.push({ matricule, raison: 'Date de naissance invalide' });
        continue;
      }

      let role: UserRole;
      try {
        role = UsersService.determineRoleFromAge(dateNaissance);
      } catch {
        erreurs.push({ matricule, raison: 'Âge non éligible (minimum 18 ans)' });
        continue;
      }

      const existing = await this.prisma.user.findUnique({ where: { matricule } });
      if (existing) {
        ignores++;
        continue;
      }

      const districtId = directDistrictId ?? (districtName ? await resolveDistrict(districtName) : null);
      const parishId   = directParishId   ?? (parishName   ? await resolveParish(parishName, districtId) : null);

      await this.prisma.user.create({
        data: {
          matricule,
          dateNaissance,
          role,
          nom: nomVal,
          prenoms: prenomsVal,
          regionId: directRegionId,
          districtId,
          parishId,
          statutProfil: ProfileStatus.EN_ATTENTE_ACTIVATION,
        },
      });
      importes++;
    }

    this.actionLog.record({
      action: AuditAction.CREATE,
      category: 'user',
      summary: `Import de matricules : ${importes} importés, ${ignores} ignorés, ${erreurs.length} erreurs`,
      actor,
      target: { entityType: 'User', entityId: 'bulk' },
      metadata: { importes, ignores, erreurs: erreurs.length },
    });

    return { importes, ignores, erreurs };
  }

  /** Promotion : GUIDE → SENTINELLE, ou GUIDE/SENTINELLE → REGION */
  async promouvoir(id: string, targetRole: UserRole, actor: AuthUser) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Seul l\'administrateur peut promouvoir un membre');
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, nom: true, prenoms: true, role: true, statutProfil: true },
    });
    if (!user) throw new NotFoundException('Membre introuvable');
    if (user.statutProfil !== ProfileStatus.ACTIF) {
      throw new BadRequestException('Seul un membre actif peut être promu');
    }

    if (targetRole === UserRole.SENTINELLE) {
      if (user.role !== UserRole.GUIDE) {
        throw new BadRequestException('Seul un guide peut être promu sentinelle');
      }
    } else if (targetRole === UserRole.REGION) {
      if (user.role !== UserRole.GUIDE && user.role !== UserRole.SENTINELLE) {
        throw new BadRequestException('Seul un guide ou une sentinelle peut être promu régional');
      }
    } else {
      throw new BadRequestException('Promotion non autorisée vers ce rôle');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: targetRole },
      select: this.userSelect,
    });

    const displayName = [user.prenoms, user.nom].filter(Boolean).join(' ') || id;
    this.actionLog.record({
      action: AuditAction.UPDATE,
      category: 'user',
      summary: `Promotion de ${displayName} : ${user.role} → ${targetRole}`,
      actor,
      target: { entityType: 'User', entityId: id },
      metadata: { avant: user.role, apres: targetRole },
    });
    return updated;
  }

  async updateStatut(id: string, statut: ProfileStatus, actor: AuthUser) {
    const before = await this.findOne(id, actor);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { statutProfil: statut },
      select: this.userSelect,
    });
    this.actionLog.record({
      action: AuditAction.STATUS_CHANGE,
      category: 'user',
      summary: `Statut de ${updated.prenoms ?? ''} ${updated.nom ?? ''} → ${statut}`,
      actor: actor,
      target: { entityType: 'User', entityId: id },
      metadata: { before: before.statutProfil, after: statut },
    });
    return updated;
  }

  async updateMe(userId: string, dto: { nom?: string; prenoms?: string; email?: string; telephone?: string }) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.nom && { nom: dto.nom }),
        ...(dto.prenoms && { prenoms: dto.prenoms }),
        email: dto.email ?? undefined,
        telephone: dto.telephone ?? undefined,
      },
      select: this.userSelect,
    });
    this.actionLog.record({
      action: AuditAction.UPDATE,
      category: 'user',
      summary: `Mise à jour du profil de ${updated.prenoms ?? ''} ${updated.nom ?? ''}`,
      actor: updated,
      target: { entityType: 'User', entityId: userId },
    });
    return updated;
  }

  async updateNotificationPreferences(
    userId: string,
    dto: { notifPush?: boolean; notifEmail?: boolean },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.notifPush !== undefined && { notifPush: dto.notifPush }),
        ...(dto.notifEmail !== undefined && { notifEmail: dto.notifEmail }),
      },
      select: {
        id: true,
        notifPush: true,
        notifEmail: true,
      },
    });
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser) {
    await this.findOne(id, actor);
    if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.REGION) {
      throw new ForbiddenException('Modification réservée à l\'administrateur ou au régional');
    }
    const { password, ...rest } = dto;
    const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
    const updated = await this.prisma.user.update({
      where: { id },
      data: { ...rest, ...(passwordHash && { passwordHash }) },
      select: this.userSelect,
    });
    this.actionLog.record({
      action: AuditAction.UPDATE,
      category: 'user',
      summary: `Modification du membre ${updated.prenoms ?? ''} ${updated.nom ?? ''}`,
      actor: actor,
      target: { entityType: 'User', entityId: id },
      metadata: { role: updated.role },
    });
    return updated;
  }

  async remove(id: string, actor: AuthUser) {
    const target = await this.findOne(id, actor);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.actionLog.record({
      action: AuditAction.DELETE,
      category: 'user',
      summary: `Archivage du membre ${target.prenoms ?? ''} ${target.nom ?? ''}`,
      actor: actor,
      target: { entityType: 'User', entityId: id },
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
    const target = await this.findOne(userId, validateur);
    const adhesion = await this.prisma.adhesion.upsert({
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
    this.actionLog.record({
      action: AuditAction.UPDATE,
      category: 'user',
      summary: `Adhésion ${annee} de ${target.prenoms ?? ''} ${target.nom ?? ''} → ${statut}`,
      actor: validateur,
      target: { entityType: 'Adhesion', entityId: adhesion.id },
      metadata: { annee, statut, userId },
    });
    return adhesion;
  }
}
