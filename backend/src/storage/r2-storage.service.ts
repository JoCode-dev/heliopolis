import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { writeFileSync, mkdirSync } from 'fs';

export type StoragePrefix = 'avatars' | 'adhesions' | 'preuves' | 'photos' | 'annonces';

const REQUIRED_ENV = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
] as const;

@Injectable()
export class R2StorageService implements OnModuleInit {
  private readonly logger = new Logger(R2StorageService.name);
  private client!: S3Client;
  private bucket!: string;
  private publicUrl!: string;
  private enabled = false;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const missing = REQUIRED_ENV.filter((key) => !this.config.get(key));
    if (missing.length > 0) {
      const isProd = this.config.get('NODE_ENV') === 'production';
      if (isProd) {
        throw new Error(`Missing R2 environment variables: ${missing.join(', ')}`);
      }
      this.logger.warn(
        `Variables manquantes (${missing.join(', ')}) — stockage désactivé en développement`,
      );
      return;
    }

    const accountId = this.config.getOrThrow<string>('R2_ACCOUNT_ID');
    this.bucket = this.config.getOrThrow<string>('R2_BUCKET_NAME');
    this.publicUrl = this.config
      .getOrThrow<string>('R2_PUBLIC_URL')
      .replace(/\/$/, '');

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
    });
    this.enabled = true;
  }

  async upload(prefix: StoragePrefix, file: Express.Multer.File): Promise<string> {
    const ext = extname(file.originalname).toLowerCase() || '.bin';
    const filename = `${randomUUID()}${ext}`;

    if (!this.enabled) {
      const uploadsDir = join(process.cwd(), 'uploads', prefix);
      mkdirSync(uploadsDir, { recursive: true });
      writeFileSync(join(uploadsDir, filename), file.buffer);
      // Chemin relatif : le frontend proxifie /uploads/* vers le backend (next.config rewrites)
      return `/uploads/${prefix}/${filename}`;
    }

    const key = `${prefix}/${filename}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch (error) {
      this.logger.error(`Échec de l'upload pour ${key}`, error instanceof Error ? error.stack : String(error));
      throw new ServiceUnavailableException(
        'Le service de stockage est temporairement indisponible. Veuillez réessayer.',
      );
    }

    return `${this.publicUrl}/${key}`;
  }
}
