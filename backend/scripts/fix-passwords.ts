/**
 * Remet à jour passwordHash + statutProfil pour tous les comptes de démo.
 * Usage : npx tsx scripts/fix-passwords.ts
 */
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
const prisma = new PrismaClient({ adapter } as never);

const ACCOUNTS = [
  { matricule: '0000001A', password: 'Admin@2026!' },
  { matricule: '0000002B', password: 'Region@2026!' },
  { matricule: '0526101C', password: 'Sentinelle@2026!' },
  { matricule: '0526102D', password: 'Sentinelle@2026!' },
  { matricule: '0526103E', password: 'Sentinelle@2026!' },
  { matricule: '0526104F', password: 'Sentinelle@2026!' },
  { matricule: '0526105G', password: 'Sentinelle@2026!' },
  { matricule: '0526106H', password: 'Sentinelle@2026!' },
  { matricule: '0526107I', password: 'Sentinelle@2026!' },
  { matricule: '0526200J', password: 'Guide@2026!' },
  { matricule: '0526301K', password: 'Gardien@2026!' },
  { matricule: '0526302L', password: 'Gardien@2026!' },
  { matricule: '0526303M', password: 'Gardien@2026!' },
  { matricule: '0526304N', password: 'Gardien@2026!' },
  { matricule: '0526305O', password: 'Gardien@2026!' },
];

async function main() {
  for (const acc of ACCOUNTS) {
    const hash = await bcrypt.hash(acc.password, 12);
    const result = await prisma.user.updateMany({
      where: { matricule: acc.matricule },
      data: { passwordHash: hash, statutProfil: 'ACTIF' },
    });
    console.log(`${acc.matricule} — ${result.count > 0 ? '✔ corrigé' : '⚠ introuvable'}`);
  }
  console.log('\nTerminé.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
