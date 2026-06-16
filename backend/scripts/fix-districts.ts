import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
import { PrismaClient } from '../generated/prisma/client.js';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as never) as any;

// ── Districts à supprimer (vides — 0 membres, 0 paroisses) ──────────────────
const A_SUPPRIMER = [
  'Abay-Nehara', 'Tefnut-Ka', 'Meru-Nil', 'Sobek-Ra', 'Sobek-Khara',
  'Kemet-Ur', 'Napata-Seth', 'Meroë-Ka', 'Axoum-Ra', 'Djenne-Maat',
  'Anemos-Ka', 'Zephyra-Ra', 'Kush-Atem', 'Maât-Shou', 'Kheper-Ankh',
  'Hathor-Nuru', 'Anub-Safra', 'Ra-Merut', 'Sekhmet-Ka', 'Imhot-Khepri',
  'Aten-Sahra', 'EQUIPE REGIONALE - ABIDJAN',
];

// ── Districts à renommer (nom DB → nom officiel) ────────────────────────────
const A_RENOMMER: { de: string; vers: string }[] = [
  { de: 'REQUIN PELERIN',          vers: 'Requin Pélerin'           },
  { de: 'Requin Des Caraibes',     vers: 'Requin Caraïbe'           },
  { de: 'Requin MAKO',             vers: 'Requin Maquo'             },
  { de: 'Requin Féroce',           vers: 'Requin Féroces'           },
  { de: 'Requin Sable',            vers: 'Requin des sables'        },
  { de: 'Agbakou In Hin Brê AGBAKOU', vers: 'Requin Agbakou In Hin Gbre' },
  { de: 'REQUIN CORAIL Alépé Nord', vers: 'Requin Corail'           },
  { de: 'Requin Taureau Alépé Sud', vers: 'Requin Taureau'          },
  { de: 'Black Tail Shark',        vers: 'Requin Black Tail Shark'  },
  { de: 'Requin Leopard',          vers: 'Requin Léopard'           },
  { de: 'Requin à Pointe Noire',   vers: 'Requin Pointe noire'      },
  { de: 'Requin à Pointe Blanche', vers: 'Requin Pointe blanche'    },
];

async function main() {
  console.log('\n=== NETTOYAGE DES DISTRICTS ===\n');

  // ── 1. Supprimer les districts vides ────────────────────────────────────
  let supprimés = 0;
  for (const nom of A_SUPPRIMER) {
    const d = await prisma.district.findFirst({ where: { nom, deletedAt: null } });
    if (!d) { console.log(`⚠️  Introuvable : "${nom}"`); continue; }

    const nbMembres   = await prisma.user.count({ where: { districtId: d.id, deletedAt: null } });
    const nbParoisses = await prisma.parish.count({ where: { districtId: d.id, deletedAt: null } });

    if (nbMembres > 0 || nbParoisses > 0) {
      console.log(`❌ SKIP "${nom}" — ${nbMembres} membres, ${nbParoisses} paroisses (non vide, vérifier manuellement)`);
      continue;
    }

    await prisma.district.update({ where: { id: d.id }, data: { deletedAt: new Date() } });
    console.log(`🗑  Supprimé : "${nom}"`);
    supprimés++;
  }

  // ── 2. Renommer les districts mal orthographiés ──────────────────────────
  let renommés = 0;
  for (const { de, vers } of A_RENOMMER) {
    const d = await prisma.district.findFirst({ where: { nom: de, deletedAt: null } });
    if (!d) { console.log(`⚠️  Introuvable : "${de}"`); continue; }

    await prisma.district.update({ where: { id: d.id }, data: { nom: vers } });
    console.log(`✏️  Renommé : "${de}" → "${vers}"`);
    renommés++;
  }

  // ── 3. Résumé final ──────────────────────────────────────────────────────
  const total = await prisma.district.count({ where: { deletedAt: null } });
  console.log(`\n✅ Terminé — ${supprimés} supprimés, ${renommés} renommés`);
  console.log(`📊 Districts actifs restants : ${total}\n`);

  const restants = await prisma.district.findMany({
    where: { deletedAt: null },
    orderBy: { nom: 'asc' },
    select: { nom: true, _count: { select: { users: true, parishes: true } } },
  });
  restants.forEach((d: any) => console.log(`  • ${d.nom} (${d._count.users} membres, ${d._count.parishes} paroisses)`));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
