import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { extname } from 'path';
import { randomUUID } from 'crypto';

export type StoragePrefix = 'avatars' | 'adhesions' | 'preuves';

const REQUIRED_ENV = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
] as const;

@Injectable()
export class R2StorageService implements OnModuleInit {
  private client!: S3Client;
  private bucket!: string;
  private publicUrl!: string;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const missing = REQUIRED_ENV.filter((key) => !this.config.get(key));
    if (missing.length > 0) {
      throw new Error(
        `Missing R2 environment variables: ${missing.join(', ')}`,
      );
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
        secretAccessKey: this.config.getOrThrow<string>(
          'R2_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  async upload(
    prefix: StoragePrefix,
    file: Express.Multer.File,
  ): Promise<string> {
    const ext = extname(file.originalname).toLowerCase() || '.bin';
    const key = `${prefix}/${randomUUID()}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `${this.publicUrl}/${key}`;
  }
}
