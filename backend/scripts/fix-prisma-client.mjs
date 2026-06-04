/**
 * fix-prisma-client.mjs
 *
 * Filet de sécurité pour le client Prisma généré en ESM.
 * Node.js exige ".js" sur les imports relatifs au runtime.
 *
 * Usage : node scripts/fix-prisma-client.mjs
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GENERATED_DIR = join(__dirname, '..', 'generated', 'prisma');
const SOURCE_EXTENSIONS = new Set(['.ts', '.mts', '.cts']);

function hasExtension(specifier) {
  const lastSegment = specifier.split('/').pop() ?? '';
  return /\.[^/.]+$/.test(lastSegment);
}

function withJsExtension(specifier) {
  return hasExtension(specifier) ? specifier : `${specifier}.js`;
}

async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(path)));
      continue;
    }

    if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) {
      files.push(path);
    }
  }

  return files;
}

/** Ajoute .js aux imports/exports relatifs qui n'en ont pas encore. */
function addExtensions(source) {
  return source
    .replace(/\b(from\s+)(['"])(\.\.?\/[^'"]+)(\2)/g, (_, prefix, quote, specifier, suffix) => {
      return `${prefix}${quote}${withJsExtension(specifier)}${suffix}`;
    })
    .replace(/\b(import\s+)(['"])(\.\.?\/[^'"]+)(\2)/g, (_, prefix, quote, specifier, suffix) => {
      return `${prefix}${quote}${withJsExtension(specifier)}${suffix}`;
    })
    .replace(/\b(import\s*\(\s*)(['"])(\.\.?\/[^'"]+)(\2\s*\))/g, (_, prefix, quote, specifier, suffix) => {
      return `${prefix}${quote}${withJsExtension(specifier)}${suffix}`;
    });
}

const sourceFiles = await listSourceFiles(GENERATED_DIR);
let changedFiles = 0;

for (const file of sourceFiles) {
  const original = await readFile(file, 'utf8');
  const fixed = addExtensions(original);

  if (fixed === original) continue;

  await writeFile(file, fixed, 'utf8');
  changedFiles += 1;
}

if (changedFiles === 0) {
  console.log('✅ generated/prisma — extensions déjà présentes, rien à faire.');
} else {
  console.log(`✅ generated/prisma — extensions .js ajoutées dans ${changedFiles} fichier(s).`);
}
