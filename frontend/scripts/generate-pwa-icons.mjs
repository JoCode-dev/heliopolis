import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'app/icon.jpeg');
const outDir = path.join(root, 'public/icons');

await mkdir(outDir, { recursive: true });

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'maskable-512.png', size: 512, maskable: true },
];

for (const { name, size, maskable } of sizes) {
  let pipeline = sharp(src).resize(size, size, { fit: 'cover', position: 'centre' });
  if (maskable) {
    pipeline = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 198, g: 40, b: 40, alpha: 1 },
      },
    }).composite([
      {
        input: await sharp(src).resize(Math.round(size * 0.72), Math.round(size * 0.72), {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        }).png().toBuffer(),
        gravity: 'centre',
      },
    ]);
  }
  await pipeline.png().toFile(path.join(outDir, name));
  console.log(`Generated ${name}`);
}
