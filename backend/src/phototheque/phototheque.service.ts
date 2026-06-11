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

  async list(campId?: string) {
    return this.prisma.campPhoto.findMany({
      where: campId ? { campId } : {},
      include: {
        camp: { select: { id: true, nom: true } },
        uploader: { select: { id: true, nom: true, prenoms: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampsWithPhotos() {
    const camps = await this.prisma.camp.findMany({
      where: { photos: { some: {} } },
      select: { id: true, nom: true, dateDebut: true, _count: { select: { photos: true } } },
      orderBy: { dateDebut: 'desc' },
    });
    return camps;
  }

  async upload(
    file: Express.Multer.File,
    uploaderId: string,
    campId?: string,
    caption?: string,
  ) {
    if (!file) throw new BadRequestException('Fichier manquant');
    const url = await this.storage.upload('photos', file);
    return this.prisma.campPhoto.create({
      data: {
        url,
        caption: caption ?? null,
        campId: campId ?? null,
        uploaderId,
      },
      include: {
        camp: { select: { id: true, nom: true } },
        uploader: { select: { id: true, nom: true, prenoms: true, avatarUrl: true } },
      },
    });
  }

  async delete(id: string, userId: string, userRole: string) {
    const photo = await this.prisma.campPhoto.findUnique({ where: { id } });
    if (!photo) throw new NotFoundException('Photo introuvable');
    const canDelete =
      photo.uploaderId === userId ||
      userRole === UserRole.ADMIN ||
      userRole === UserRole.REGION;
    if (!canDelete) throw new ForbiddenException('Non autorisé');
    await this.prisma.campPhoto.delete({ where: { id } });
    return { success: true };
  }
}
