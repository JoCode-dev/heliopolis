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
  ConversationMemberRole,
  ConversationType,
  ProfileStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { ActionLogService } from '../logs/action-log.service.js';
import * as bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import { determineRoleFromAge } from '../common/utils/role-from-age.util.js';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private actionLog: ActionLogService,
  ) {}


  private async addToTerritoryChannels(user: {
    id: string;
    role: UserRole;
    parishId?: string | null;
    districtId?: string | null;
    regionId?: string | null;
  }) {
    type ConvWhere = { type: string; archivedAt: null; parishId?: string; districtId?: string; regionId?: string };
    const orFilters: ConvWhere[] = [{ type: 'DIFFUSION', archivedAt: null }];
    if (user.parishId && (user.role === UserRole.GUIDE || user.role === UserRole.GARDIEN)) {
      orFilters.push({ type: 'PAROISSE', parishId: user.parishId, archivedAt: null });
    }
    if (user.districtId && (user.role === UserRole.SENTINELLE || user.role === UserRole.GUIDE)) {
      orFilters.push({ type: 'DOYENNE', districtId: user.districtId, archivedAt: null });
    }
    if (user.regionId && (user.role === UserRole.REGION || user.role === UserRole.SENTINELLE)) {
      orFilters.push({ type: 'REGION', regionId: user.regionId, archivedAt: null });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channels = await this.prisma.conversation.findMany({ where: { OR: orFilters as any }, select: { id: true } });
    if (!channels.length) return;
    await Promise.all(
      channels.map((c) =>
        this.prisma.conversationMember.upsert({
          where: { conversationId_userId: { conversationId: c.id, userId: user.id } },
          create: { conversationId: c.id, userId: user.id, role: ConversationMemberRole.MEMBRE },
          update: { leftAt: null },
        }),
      ),
    );
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

  /** Création d'un membre — ADMIN/REGION → direct, GUIDE/SENTINELLE → EN_ATTENTE_VALIDATION */
  async create(dto: CreateUserDto, actor: AuthUser) {
    const isGuide      = actor.role === UserRole.GUIDE;
    const isSentinelle = actor.role === UserRole.SENTINELLE;

    if (
      actor.role !== UserRole.ADMIN &&
      actor.role !== UserRole.REGION &&
      !isGuide &&
      !isSentinelle
    ) {
      throw new ForbiddenException(
        'La création de membres est réservée à l\'administrateur, au régional, aux sentinelles ou aux guides.',
      );
    }

    // Guide : forcé sur le rôle GARDIEN dans sa propre paroisse
    if (isGuide) {
      dto.role      = UserRole.GARDIEN;
      dto.parishId  = actor.parishId  ?? dto.parishId;
      dto.districtId= actor.districtId?? dto.districtId;
      dto.regionId  = actor.regionId  ?? dto.regionId;
    }

    // Sentinelle : GARDIEN ou GUIDE dans son district uniquement
    if (isSentinelle) {
      if (dto.role && dto.role !== UserRole.GARDIEN && dto.role !== UserRole.GUIDE) {
        throw new ForbiddenException('Une sentinelle ne peut créer que des gardiens ou des guides.');
      }
      dto.role      = dto.role ?? UserRole.GARDIEN;
      dto.districtId= actor.districtId ?? dto.districtId;
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

    const awaitingValidation = isGuide || isSentinelle;
    const statutProfil = awaitingValidation
      ? ProfileStatus.EN_ATTENTE_VALIDATION
      : dto.password
        ? ProfileStatus.ACTIF
        : ProfileStatus.EN_ATTENTE_ACTIVATION;

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
        statutProfil,
      },
      select: this.userSelect,
    });

    this.actionLog.record({
      action: AuditAction.CREATE,
      category: 'user',
      summary: `Création du membre ${created.prenoms ?? ''} ${created.nom ?? ''} (${created.role})${awaitingValidation ? ' — en attente de validation' : ''}`,
      actor,
      target: { entityType: 'User', entityId: created.id },
      metadata: { role: created.role, matricule: created.matricule, awaitingValidation },
    });
    return created;
  }

  /** Valide l'ajout d'un membre créé par un guide/sentinelle */
  async valider(id: string, actor: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, nom: true, prenoms: true, statutProfil: true },
    });
    if (!user) throw new NotFoundException('Membre introuvable');
    if (user.statutProfil !== ProfileStatus.EN_ATTENTE_VALIDATION) {
      throw new BadRequestException('Ce membre n\'est pas en attente de validation');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { statutProfil: ProfileStatus.EN_ATTENTE_ACTIVATION },
      select: this.userSelect,
    });
    this.actionLog.record({
      action: AuditAction.VALIDATE,
      category: 'user',
      summary: `Validation de l'ajout de ${updated.prenoms ?? ''} ${updated.nom ?? ''}`,
      actor,
      target: { entityType: 'User', entityId: id },
      metadata: { before: ProfileStatus.EN_ATTENTE_VALIDATION, after: ProfileStatus.EN_ATTENTE_ACTIVATION },
    });
    return updated;
  }

  /** Rejette et supprime un membre en attente de validation */
  async rejeter(id: string, actor: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, nom: true, prenoms: true, statutProfil: true },
    });
    if (!user) throw new NotFoundException('Membre introuvable');
    if (user.statutProfil !== ProfileStatus.EN_ATTENTE_VALIDATION) {
      throw new BadRequestException('Ce membre n\'est pas en attente de validation');
    }
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.actionLog.record({
      action: AuditAction.REJECT,
      category: 'user',
      summary: `Rejet de l'ajout de ${user.prenoms ?? ''} ${user.nom ?? ''}`,
      actor,
      target: { entityType: 'User', entityId: id },
    });
    return { message: 'Ajout rejeté et membre supprimé' };
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
    const role = determineRoleFromAge(dateNaissance);

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
    forceRole?: UserRole,
  ): Promise<{ importes: number; fusionnes: number; ignores: number; erreurs: { matricule: string; raison: string }[]; districtsCrees: number; paroissesCrees: number }> {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Seul l\'administrateur peut importer des matricules');
    }

    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    // Cache district / paroisse pour éviter N+1
    const districtCache = new Map<string, string | null>();
    const parishCache   = new Map<string, string | null>();
    let districtsCrees  = 0;
    let paroissesCrees  = 0;

    // Normalisation pour correspondance floue : minuscules, sans accents, sans "requin " en tête
    const normalize = (s: string) =>
      s.toLowerCase().trim()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/^requin\s+/, '');

    // Chargement unique de tous les districts actifs pour le matching flou
    const allDistricts = await this.prisma.district.findMany({
      where: { deletedAt: null },
      select: { id: true, nom: true },
    });

    const resolveDistrict = async (nom: string): Promise<string | null> => {
      const key = nom.toLowerCase().trim();
      if (!key) return null;
      if (districtCache.has(key)) return districtCache.get(key)!;

      // 1. Correspondance exacte (insensible à la casse)
      let d = await this.prisma.district.findFirst({
        where: { nom: { equals: nom.trim(), mode: 'insensitive' }, deletedAt: null },
        select: { id: true },
      });

      // 2. Correspondance floue : normaliser accents + préfixe "Requin"
      if (!d) {
        const normInput = normalize(nom);
        const match = allDistricts.find(existing => normalize(existing.nom) === normInput);
        if (match) d = { id: match.id };
      }

      // Plus de création automatique de district
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
      let p = await this.prisma.parish.findFirst({ where, select: { id: true } });
      if (!p && districtId) {
        p = await this.prisma.parish.create({ data: { nom, districtId }, select: { id: true } });
        paroissesCrees++;
      }
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

    let importes  = 0;
    let fusionnes = 0;
    let ignores   = 0;
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

      // Détection équipe régionale (colonne District ou Groupe Scoute contient "équipe régionale")
      const estEquipeReg = (s: string) =>
        /equipe.{0,10}r[eé]gionale?/i.test(s.normalize('NFD').replace(/[̀-ͯ]/g, ''));
      const isRegional = estEquipeReg(districtName) || estEquipeReg(parishName);

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
      if (isRegional) {
        role = UserRole.REGION;
      } else if (forceRole) {
        // Vérifier l'âge minimum même en mode forceRole
        const age = new Date().getFullYear() - dateNaissance.getFullYear();
        if (age < 18) {
          erreurs.push({ matricule, raison: 'Âge non éligible (minimum 18 ans)' });
          continue;
        }
        role = forceRole;
      } else {
        try {
          role = determineRoleFromAge(dateNaissance);
        } catch {
          erreurs.push({ matricule, raison: 'Âge non éligible (minimum 18 ans)' });
          continue;
        }
      }

      const existing = await this.prisma.user.findUnique({
        where: { matricule },
        select: { id: true, nom: true, prenoms: true, districtId: true, parishId: true, regionId: true, role: true },
      });

      if (existing) {
        // Fusion : compléter uniquement les champs manquants
        const updates: Record<string, unknown> = {};

        if (!existing.nom      && nomVal)     updates.nom     = nomVal;
        if (!existing.prenoms  && prenomsVal) updates.prenoms = prenomsVal;
        if (!existing.regionId && directRegionId) updates.regionId = directRegionId;

        // Mise à jour du rôle : équipe régionale prioritaire, puis forceRole
        if (isRegional && existing.role !== UserRole.REGION) {
          updates.role = UserRole.REGION;
        } else if (forceRole && !isRegional && existing.role !== forceRole) {
          updates.role = forceRole;
        }

        // District : résoudre uniquement si manquant et pas équipe régionale
        let mergeDistrictId = existing.districtId;
        if (!existing.districtId && !isRegional) {
          const resolvedDistrict = directDistrictId ?? (districtName ? await resolveDistrict(districtName) : null);
          if (resolvedDistrict) {
            updates.districtId = resolvedDistrict;
            mergeDistrictId    = resolvedDistrict;
          }
        }

        // Paroisse : résoudre uniquement si manquante et pas équipe régionale
        if (!existing.parishId && !isRegional && mergeDistrictId) {
          const resolvedParish = directParishId ?? (parishName ? await resolveParish(parishName, mergeDistrictId) : null);
          if (resolvedParish) updates.parishId = resolvedParish;
        }

        // Mise à jour + adhésion dans une transaction atomique
        await this.prisma.$transaction([
          ...(Object.keys(updates).length > 0
            ? [this.prisma.user.update({ where: { id: existing.id }, data: updates })]
            : []),
          this.prisma.adhesion.upsert({
            where: { userId_annee: { userId: existing.id, annee: 2026 } },
            create: { userId: existing.id, annee: 2026, statut: AdhesionStatus.A_JOUR, dateValidation: new Date() },
            update: { statut: AdhesionStatus.A_JOUR, dateValidation: new Date() },
          }),
        ]);

        if (Object.keys(updates).length > 0) { fusionnes++; } else { ignores++; }
        continue;
      }

      const districtId = isRegional
        ? null
        : (directDistrictId ?? (districtName ? await resolveDistrict(districtName) : null));

      // Avertir si le district du fichier ne correspond à aucun district existant (hors équipe régionale)
      if (!isRegional && districtName && !districtId) {
        erreurs.push({ matricule, raison: `District introuvable : "${districtName}"` });
      }

      const parishId = isRegional
        ? null
        : (directParishId ?? (parishName ? await resolveParish(parishName, districtId) : null));

      // Création utilisateur + adhésion dans une transaction atomique
      const created = await this.prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
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
          select: { id: true },
        });
        await tx.adhesion.upsert({
          where: { userId_annee: { userId: u.id, annee: 2026 } },
          create: { userId: u.id, annee: 2026, statut: AdhesionStatus.A_JOUR, dateValidation: new Date() },
          update: { statut: AdhesionStatus.A_JOUR, dateValidation: new Date() },
        });
        return u;
      });
      void created;
      importes++;
    }

    this.actionLog.record({
      action: AuditAction.CREATE,
      category: 'user',
      summary: `Import : ${importes} créés, ${fusionnes} fusionnés, ${ignores} ignorés, ${paroissesCrees} paroisses créées, ${erreurs.length} erreurs`,
      actor,
      target: { entityType: 'User', entityId: 'bulk' },
      metadata: { importes, fusionnes, ignores, erreurs: erreurs.length, districtsCrees, paroissesCrees },
    });

    return { importes, fusionnes, ignores, erreurs, districtsCrees, paroissesCrees };
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
    if (user.statutProfil === ProfileStatus.SUSPENDU || user.statutProfil === ProfileStatus.ARCHIVE) {
      throw new BadRequestException('Un membre suspendu ou archivé ne peut pas être promu');
    }

    const transitions: Partial<Record<UserRole, UserRole[]>> = {
      [UserRole.GUIDE]:      [UserRole.SENTINELLE, UserRole.REGION],
      [UserRole.SENTINELLE]: [UserRole.GUIDE,      UserRole.REGION],
      [UserRole.REGION]:     [UserRole.GUIDE,      UserRole.SENTINELLE],
    };
    if (!transitions[user.role]?.includes(targetRole)) {
      throw new BadRequestException(`Transition ${user.role} → ${targetRole} non autorisée`);
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

  async resetPassword(id: string, newPassword: string, actor: AuthUser) {
    const user = await this.findOne(id, actor);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { passwordHash, statutProfil: ProfileStatus.ACTIF },
      select: this.userSelect,
    });
    this.actionLog.record({
      action: AuditAction.UPDATE,
      category: 'user',
      summary: `Réinitialisation du mot de passe de ${updated.prenoms ?? ''} ${updated.nom ?? ''}`,
      actor,
      target: { entityType: 'User', entityId: id },
      metadata: { before: user.statutProfil, after: ProfileStatus.ACTIF },
    });
    void this.addToTerritoryChannels(updated);
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
    if (statut === ProfileStatus.ACTIF) {
      void this.addToTerritoryChannels(updated);
    }
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
    const { password, dateNaissance: dateNaissanceStr, ...rest } = dto;
    const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
    const dateNaissance = dateNaissanceStr ? new Date(dateNaissanceStr) : undefined;
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...rest,
        ...(passwordHash   && { passwordHash }),
        ...(dateNaissance  && { dateNaissance }),
      },
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

  /** Suppression définitive et irréversible — ADMIN ou REGION seulement */
  async purger(id: string, actor: AuthUser) {
    if (actor.id === id) {
      throw new BadRequestException('Vous ne pouvez pas vous supprimer vous-même.');
    }
    const target = await this.findOne(id, actor);

    if (actor.role === UserRole.REGION) {
      if (target.role === UserRole.ADMIN || target.role === UserRole.REGION) {
        throw new ForbiddenException('Le régional ne peut pas supprimer un administrateur ou un autre membre régional.');
      }
    }

    const displayName = `${target.prenoms ?? ''} ${target.nom ?? ''}`.trim();
    // Les relations Cascade (Adhesion, CampParticipant, ConversationMember, etc.)
    // sont gérées automatiquement par Postgres via les contraintes onDelete: Cascade.
    await this.prisma.user.delete({ where: { id } });

    this.actionLog.record({
      action: AuditAction.DELETE,
      category: 'user',
      summary: `Suppression définitive de ${displayName} (${target.role})`,
      actor,
      target: { entityType: 'User', entityId: id },
      metadata: { role: target.role, permanent: true },
    });
    return { message: 'Membre supprimé définitivement' };
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
