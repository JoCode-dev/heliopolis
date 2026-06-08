import { memoryStorage } from 'multer';

export function memoryFileOptions(
  allowedMimeTypes: string[],
  maxSizeBytes: number,
) {
  return {
    storage: memoryStorage(),
    fileFilter: (_req, file, cb) => {
      cb(null, allowedMimeTypes.includes(file.mimetype));
    },
    limits: { fileSize: maxSizeBytes },
  };
}

export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ADHESION_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
export const PREUVE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
