import { Injectable, NotFoundException } from '@nestjs/common';
import { Council } from '../../generated/prisma/client.js';
import { CouncilStatus, UserRole } from '../../generated/prisma/enums.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCouncilDto } from './dto/create-council.dto.js';

@Injectable()
export class CouncilsService {
  constructor(private prisma: PrismaService) {}

  private readonly include = {
    region: { select: { id: true, nom: true } },
    district: { select: { id: true, nom: true } },
    parish: { select: { id: true, nom: true } },
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

  private toDayKey(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private computeStatus(date: Date, storedStatus: CouncilStatus) {
    if (storedStatus === CouncilStatus.ANNULE) return CouncilStatus.ANNULE;

    const now = new Date();
    const councilDay = this.toDayKey(date);
    const today = this.toDayKey(now);

    if (today < councilDay) return CouncilStatus.PLANIFIE;
    if (today > councilDay) return CouncilStatus.TERMINE;
    if (now < date) return CouncilStatus.PLANIFIE;
    return CouncilStatus.EN_COURS;
  }

  private enrichCouncil<T extends Council>(council: T) {
    return {
      ...council,
      statut: this.computeStatus(council.date, council.statut),
    };
  }

  async findAll(user: AuthUser) {
    const councils = await this.prisma.council.findMany({
      where: this.scopeWhere(user),
      include: this.include,
      orderBy: { date: 'asc' },
    });

    return councils.map((c) => this.enrichCouncil(c));
  }

  async findOne(id: string) {
    const council = await this.prisma.council.findUnique({
      where: { id },
      include: this.include,
    });
    if (!council) throw new NotFoundException('Conseil introuvable');
    return this.enrichCouncil(council);
  }

  async create(dto: CreateCouncilDto, actor: AuthUser) {
    // Résoudre le territoire si non fourni
    const regionId = dto.regionId ?? actor.regionId ?? undefined;
    const districtId = dto.districtId ?? actor.districtId ?? undefined;
    const parishId = dto.parishId ?? actor.parishId ?? undefined;

    const council = await this.prisma.council.create({
      data: {
        nom: dto.nom,
        description: dto.description,
        date: new Date(dto.date),
        lieu: dto.lieu,
        statut: dto.statut ?? CouncilStatus.PLANIFIE,
        targetRoles: dto.targetRoles,
        regionId: regionId || null,
        districtId: districtId || null,
        parishId: parishId || null,
        createdById: actor.id,
      },
      include: this.include,
    });
    return this.enrichCouncil(council);
  }

  async update(id: string, dto: Partial<CreateCouncilDto>) {
    await this.findOne(id);
    const data: Record<string, unknown> = {};
    if (dto.nom) data.nom = dto.nom;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.date) data.date = new Date(dto.date);
    if (dto.lieu !== undefined) data.lieu = dto.lieu;
    if (dto.statut) data.statut = dto.statut;
    if (dto.targetRoles) data.targetRoles = dto.targetRoles;

    const council = await this.prisma.council.update({
      where: { id },
      data,
      include: this.include,
    });
    return this.enrichCouncil(council);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.council.delete({ where: { id } });
    return { success: true };
  }
}
