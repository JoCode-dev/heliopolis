import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { R2StorageService } from '../storage/r2-storage.service.js';
import { UserRole, AnnouncementStatus, AnnouncementScope } from '../../generated/prisma/enums.js';

@Injectable()
export class AnnoncesService {
  constructor(
    private prisma: PrismaService,
    private storage: R2StorageService,
  ) {}

  /** Liste les annonces visibles publiquement (publiées + planifiées dont la date est passée) */
  async list() {
    const now = new Date();
    return this.prisma.announcement.findMany({
      where: {
        OR: [
          { statut: AnnouncementStatus.PUBLIE },
          { statut: AnnouncementStatus.PLANIFIE, publishedAt: { lte: now } },
        ],
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
      },
      include: {
        author: { select: { id: true, nom: true, prenoms: true, avatarUrl: true } },
        photos: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /** Liste toutes les annonces (admin) */
  async listAll() {
    return this.prisma.announcement.findMany({
      include: {
        author: { select: { id: true, nom: true, prenoms: true, avatarUrl: true } },
        photos: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    body: {
      titre: string;
      contenu?: string;
      portee?: string;
      statut?: string;
      publishedAt?: string;
      expiresAt?: string;
    },
    files: Express.Multer.File[],
    authorId: string,
  ) {
    if (!body.titre?.trim()) throw new BadRequestException('Le titre est requis');

    const VALID_STATUTS = Object.values(AnnouncementStatus);
    const VALID_PORTEES = Object.values(AnnouncementScope);
    const statut = (body.statut && VALID_STATUTS.includes(body.statut as AnnouncementStatus))
      ? (body.statut as AnnouncementStatus)
      : AnnouncementStatus.BROUILLON;
    const portee = (body.portee && VALID_PORTEES.includes(body.portee as AnnouncementScope))
      ? (body.portee as AnnouncementScope)
      : AnnouncementScope.COMMUNAUTE;

    let publishedAt: Date | null = null;
    if (body.publishedAt) publishedAt = new Date(body.publishedAt);
    else if (statut === AnnouncementStatus.PUBLIE) publishedAt = new Date();

    const photoUrls = files?.length
      ? await Promise.all(files.map(f => this.storage.upload('annonces', f)))
      : [];

    return this.prisma.announcement.create({
      data: {
        titre: body.titre.trim(),
        contenu: body.contenu?.trim() ?? '',
        portee,
        statut,
        publishedAt,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        authorId,
        photos: photoUrls.length
          ? { create: photoUrls.map(url => ({ url, uploadedById: authorId })) }
          : undefined,
      },
      include: {
        author: { select: { id: true, nom: true, prenoms: true, avatarUrl: true } },
        photos: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async update(
    id: string,
    body: {
      titre?: string;
      contenu?: string;
      portee?: string;
      statut?: string;
      publishedAt?: string;
      expiresAt?: string;
    },
    files: Express.Multer.File[],
    userId: string,
  ) {
    const annonce = await this.prisma.announcement.findUnique({ where: { id } });
    if (!annonce) throw new NotFoundException('Annonce introuvable');

    const newStatut = body.statut as AnnouncementStatus | undefined;

    let publishedAt: Date | null | undefined = undefined;
    if (body.publishedAt !== undefined) {
      publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
    } else if (newStatut === AnnouncementStatus.PUBLIE && !annonce.publishedAt) {
      publishedAt = new Date();
    }

    const photoUrls = files?.length
      ? await Promise.all(files.map(f => this.storage.upload('annonces', f)))
      : [];

    return this.prisma.announcement.update({
      where: { id },
      data: {
        ...(body.titre !== undefined && { titre: body.titre.trim() }),
        ...(body.contenu !== undefined && { contenu: body.contenu.trim() }),
        ...(body.portee !== undefined && {
          portee: (body.portee && Object.values(AnnouncementScope).includes(body.portee as AnnouncementScope))
            ? (body.portee as AnnouncementScope)
            : AnnouncementScope.COMMUNAUTE,
        }),
        ...(newStatut !== undefined && { statut: newStatut }),
        ...(publishedAt !== undefined && { publishedAt }),
        ...(body.expiresAt !== undefined && {
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        }),
        ...(photoUrls.length && {
          photos: { create: photoUrls.map(url => ({ url, uploadedById: userId })) },
        }),
      },
      include: {
        author: { select: { id: true, nom: true, prenoms: true, avatarUrl: true } },
        photos: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async deletePhoto(photoId: string) {
    const photo = await this.prisma.announcementPhoto.findUnique({ where: { id: photoId } });
    if (!photo) throw new NotFoundException('Photo introuvable');
    await this.prisma.announcementPhoto.delete({ where: { id: photoId } });
    return { success: true };
  }

  async remove(id: string, userId: string, userRole: string) {
    const annonce = await this.prisma.announcement.findUnique({ where: { id } });
    if (!annonce) throw new NotFoundException('Annonce introuvable');
    if (annonce.authorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Non autorisé');
    }
    await this.prisma.announcement.delete({ where: { id } });
    return { success: true };
  }
}
