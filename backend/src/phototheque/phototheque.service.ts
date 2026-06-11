import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { R2StorageService } from '../storage/r2-storage.service.js';
import { UserRole } from '../../generated/prisma/enums.js';

@Injectable()
export class PhotothequeService {
  constructor(
    private prisma: PrismaService,
    private storage: R2StorageService,
  ) {}

  async listPublications(campId?: string) {
    return this.prisma.campPublication.findMany({
      where: campId ? { campId } : {},
      include: {
        camp: { select: { id: true, nom: true } },
        uploader: { select: { id: true, nom: true, prenoms: true, avatarUrl: true } },
        photos: { select: { id: true, url: true }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampsWithPhotos() {
    return this.prisma.camp.findMany({
      where: { publications: { some: {} } },
      select: { id: true, nom: true, dateDebut: true, _count: { select: { publications: true } } },
      orderBy: { dateDebut: 'desc' },
    });
  }

  async createPublication(
    files: Express.Multer.File[],
    uploaderId: string,
    campId?: string,
    caption?: string,
  ) {
    if (!files || files.length === 0) throw new BadRequestException('Aucun fichier fourni');

    const urls = await Promise.all(
      files.map(f => this.storage.upload('photos', f)),
    );

    return this.prisma.campPublication.create({
      data: {
        caption: caption ?? null,
        campId: campId ?? null,
        uploaderId,
        photos: {
          create: urls.map(url => ({ url, uploaderId })),
        },
      },
      include: {
        camp: { select: { id: true, nom: true } },
        uploader: { select: { id: true, nom: true, prenoms: true, avatarUrl: true } },
        photos: { select: { id: true, url: true }, orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async deletePublication(id: string, userId: string, userRole: string) {
    const pub = await this.prisma.campPublication.findUnique({
      where: { id },
      select: { uploaderId: true },
    });
    if (!pub) throw new NotFoundException('Publication introuvable');
    const canDelete =
      pub.uploaderId === userId ||
      userRole === UserRole.ADMIN ||
      userRole === UserRole.REGION;
    if (!canDelete) throw new ForbiddenException('Non autorisé');
    await this.prisma.campPublication.delete({ where: { id } });
    return { success: true };
  }
}
