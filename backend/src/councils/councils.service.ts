import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCouncilDto } from './dto/create-council.dto.js';
import { CouncilStatus, UserRole } from '../../generated/prisma/enums.js';
import type { AuthUser } from '../common/types/auth-user.js';

@Injectable()
export class CouncilsService {
  constructor(private prisma: PrismaService) {}

  private readonly include = {
    region:    { select: { id: true, nom: true } },
    district:  { select: { id: true, nom: true } },
    parish:    { select: { id: true, nom: true } },
    createdBy: { select: { id: true, nom: true, prenoms: true } },
  } as const;

  private scopeWhere(user: AuthUser) {
    if (user.role === UserRole.ADMIN) return {};
    if (user.role === UserRole.REGION && user.regionId)
      return { regionId: user.regionId };
    if (user.role === UserRole.SENTINELLE && user.districtId)
      return { districtId: user.districtId };
    if (user.role === UserRole.GUIDE && user.parishId)
      return { parishId: user.parishId };
    return {};
  }

  async findAll(user: AuthUser) {
    return this.prisma.council.findMany({
      where: this.scopeWhere(user),
      include: this.include,
      orderBy: { date: 'asc' },
    });
  }

  async findOne(id: string) {
    const council = await this.prisma.council.findUnique({ where: { id }, include: this.include });
    if (!council) throw new NotFoundException('Conseil introuvable');
    return council;
  }

  async create(dto: CreateCouncilDto, actor: AuthUser) {
    // Résoudre le territoire si non fourni
    const regionId   = dto.regionId   ?? actor.regionId   ?? undefined;
    const districtId = dto.districtId ?? actor.districtId ?? undefined;
    const parishId   = dto.parishId   ?? actor.parishId   ?? undefined;

    return this.prisma.council.create({
      data: {
        nom:         dto.nom,
        description: dto.description,
        date:        new Date(dto.date),
        lieu:        dto.lieu,
        statut:      dto.statut ?? CouncilStatus.PLANIFIE,
        targetRoles: dto.targetRoles,
        regionId:    regionId   || null,
        districtId:  districtId || null,
        parishId:    parishId   || null,
        createdById: actor.id,
      },
      include: this.include,
    });
  }

  async update(id: string, dto: Partial<CreateCouncilDto>, actor: AuthUser) {
    await this.findOne(id);
    const data: Record<string, unknown> = {};
    if (dto.nom)         data.nom         = dto.nom;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.date)        data.date        = new Date(dto.date);
    if (dto.lieu !== undefined) data.lieu = dto.lieu;
    if (dto.statut)      data.statut      = dto.statut;
    if (dto.targetRoles) data.targetRoles = dto.targetRoles;

    return this.prisma.council.update({ where: { id }, data, include: this.include });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.council.delete({ where: { id } });
    return { success: true };
  }
}
