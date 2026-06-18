/**
 * Seed — Héliopolis · Route en Joie 2026 · Région d'Abidjan
 *
 * SEED_STRUCTURE=CLASSIQUE     → 21 Districts Scouts officiels · Route en Joie 2026 (défaut)
 * SEED_STRUCTURE=MYTHOLOGIQUE  → 5 Règnes · 21 Districts · 42 Sanctuaires (structure de démo)
 *
 * Exécuter : npx prisma db seed
 *            SEED_STRUCTURE=CLASSIQUE npx prisma db seed
 */

import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL']!,
});
const prisma = new PrismaClient({ adapter });

async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DistrictInput {
  nom: string;
  code: string;
  parishes: string[];
}


interface SeedStructureData {
  label: string;
  communityDistrict: string;
  communityParish: string;
  districts: DistrictInput[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Structure MYTHOLOGIQUE — 5 Règnes · 21 Districts · 42 Sanctuaires
// ─────────────────────────────────────────────────────────────────────────────

const MYTHOLOGIQUE: SeedStructureData = {
  label: '5 Règnes · 21 Districts · 42 Sanctuaires',
  communityDistrict: 'Abay-Nehara',
  communityParish: 'Sanctuaire Alpha',
  districts: [
    // Règne de l'Eau – Domaine de Noun
    {
      nom: 'Abay-Nehara',
      code: 'NOU-ABN',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    {
      nom: 'Tefnut-Ka',
      code: 'NOU-TEF',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    {
      nom: 'Meru-Nil',
      code: 'NOU-MRN',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    {
      nom: 'Sobek-Ra',
      code: 'NOU-SBR',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    {
      nom: 'Sobek-Khara',
      code: 'NOU-SBK',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    // Règne de la Terre – Domaine de Kemet
    {
      nom: 'Kemet-Ur',
      code: 'KEM-KMU',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    {
      nom: 'Napata-Seth',
      code: 'KEM-NAP',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    {
      nom: 'Meroë-Ka',
      code: 'KEM-MRK',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    {
      nom: 'Axoum-Ra',
      code: 'KEM-AXO',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    {
      nom: 'Djenne-Maat',
      code: 'KEM-DJN',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    // Règne du Souffle – Domaine de Shou
    {
      nom: 'Anemos-Ka',
      code: 'SHO-ANK',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    {
      nom: 'Zephyra-Ra',
      code: 'SHO-ZPH',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    {
      nom: 'Kush-Atem',
      code: 'SHO-KSH',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    {
      nom: 'Maât-Shou',
      code: 'SHO-MAT',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    // Règne du Vivant – Domaine de Kheper
    {
      nom: 'Kheper-Ankh',
      code: 'KHP-KAN',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    {
      nom: 'Hathor-Nuru',
      code: 'KHP-HTN',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    {
      nom: 'Anub-Safra',
      code: 'KHP-ANS',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    // Règne du Feu – Domaine de Ra
    {
      nom: 'Ra-Merut',
      code: 'RAF-RMR',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    {
      nom: 'Sekhmet-Ka',
      code: 'RAF-SKH',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    {
      nom: 'Imhot-Khepri',
      code: 'RAF-IMH',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
    {
      nom: 'Aten-Sahra',
      code: 'RAF-ATN',
      parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Structure CLASSIQUE — 21 Districts Scouts · Route en Joie 2026
// ─────────────────────────────────────────────────────────────────────────────

const CLASSIQUE: SeedStructureData = {
  label: "21 Districts Scouts · Région d'Abidjan · Route en Joie 2026",
  communityDistrict: 'Requin Baleine',
  communityParish: 'LES CACHALOTS',
  districts: [
    {
      nom: 'Mango Taika',
      code: 'DIST-MTA',
      parishes: [
        'LES KORES MOANAS',
        'LES TOHORAS',
        'HAPUU RERU',
        'LES MAKIS',
        'LES NARWHALS',
        'LES AMPHIPIRIONS',
        'LES AIHES',
        'Equipe de District Mango Taika',
      ],
    },
    {
      nom: 'Requin Agbakou In Hin Gbre',
      code: 'DIST-AIB',
      parishes: ['Requin Bleu', 'Requin Renard', 'Requin Epineux'],
    },
    {
      nom: 'Requin Baleine',
      code: 'DIST-RBA',
      parishes: [
        'LES JUBARTES',
        'LES WHALES',
        'LES CACHALOTS',
        'LES MYSTICETTES',
        'LES RORQUALS',
        'LES NARVALS',
        'LES BELUGAS',
      ],
    },
    {
      nom: 'Requin Black Tail Shark',
      code: 'DIST-BTS',
      parishes: [
        'BLACK JELLYFISH',
        'Black Hamlet',
        'BLACK MOLLY',
        'Black Moray',
        'BLACK STARFISH',
      ],
    },
    {
      nom: 'Requin Bouledogue',
      code: 'DIST-RBO',
      parishes: [
        'Les Marsouins',
        'Les Raies Mantas',
        'Equipe de district Requin Bouledogue',
        'Les Echinodernes',
        'Les Orques',
        'Les Octopus',
        'Les Espadons Voiliers',
      ],
    },
    {
      nom: 'Requin Caraïbe',
      code: 'DIST-RDC',
      parishes: [
        'Les Nitainos',
        'Les Kalinagos',
        'Les Naborias',
        'Les Lucayens',
        'les Cyboyens',
      ],
    },
    {
      nom: 'Requin Corail',
      code: 'DIST-RCA',
      parishes: [
        'LES DABOUKES DE AHOUE',
        'LES AGUILLARTS DE LAME',
        "LES GEY SHARKS D'ATTIEKOI",
        "LES REQUINS CITRONS D'AHOUTOUE",
        'LES BLACKS SHARKS DE BROFODOUME',
      ],
    },
    {
      nom: 'Requin Féroces',
      code: 'DIST-RFE',
      parishes: ['Les Marsouins', 'Les Vaquitas', 'Les Rorquals'],
    },
    {
      nom: 'Requin Griset',
      code: 'DIST-RGR',
      parishes: ['LES BAJAUX', 'LES MOKENS', 'LES MOWOHS'],
    },
    {
      nom: 'Requin Lancette',
      code: 'DIST-RLA',
      parishes: [
        'LES LANCETTES LUMINEUX',
        'LES REQUINS LANCETTES DOCILE',
        'LES REQUINS LANCETTES ROYAUX',
        'LES REQUINS LANCETTES ELEGANT',
        'LES REQUINS LANCETTES AVIATORS',
        'LES REQUINS LANCETTES EPINEUX',
      ],
    },
    {
      nom: 'Requin Léopard',
      code: 'DIST-RLE',
      parishes: [
        'CHAPELLE SAINTE TRINITE',
        'Saint Antoine de Padoue',
        'CHAPELLE NOTRE DAME DE LA PROVIDENCE',
      ],
    },
    {
      nom: 'Requin Maquo',
      code: 'DIST-RMA',
      parishes: [
        'LES REQUINS SAUMON',
        'LES REQUINS DU GANGE',
        'LES REQUINS MEGALODON',
        'LES REQUINS CUIVRE',
        'LES REQUINS TAUPE',
      ],
    },
    {
      nom: 'Requin Marteau',
      code: 'DIST-RMT',
      parishes: [
        'LES REQUINS MARTEAUX ETOILES',
        'LES REQUINS MARTEAUX TACHETES',
        'LES REQUINS MARTEAUX A AILES BLANCHES',
        'LES REQUIN MARTEAUX HALICORNE',
      ],
    },
    {
      nom: 'Requin Noronhai',
      code: 'DIST-RNO',
      parishes: [
        'LES REQUINS TIGRES',
        'LES EPAULARDS',
        'LES CUBOMEDUSES',
        'LES ORQUES MARINIERS',
      ],
    },
    {
      nom: 'Requin Peau Bleu',
      code: 'DIST-RPE',
      parishes: [
        'SEMOU (TORTUE DE MER)',
        'QUASI PAROISSE SAINT RAPHAEL ADJIN VILLAGE',
        'QUASI PAROISSE SAINT BERNARD DES CITES',
        'AKOMA',
        'GWEVOKO',
        'ANOMA RAIE MARINE',
      ],
    },
    {
      nom: 'Requin Pélerin',
      code: 'DIST-RPL',
      parishes: [
        'BALEINE À BOSSE',
        'LES REQUINS NOURRICES',
        'LES ESPADONS',
        'LES SEALS',
        'LES LAMNAS NASUS',
        'LES DAUPHINS BURRUNANS',
      ],
    },
    {
      nom: 'Requin Pointe blanche',
      code: 'DIST-RPB',
      parishes: [
        'PIEUVRE BLANCHE',
        'TORTUE BLANCHE',
        'STERNE BLANCHE',
        'OTARIE BLANCHE',
        'RAIE BLANCHE',
        'Equipe de District Requin Pointe blanche',
      ],
    },
    {
      nom: 'Requin Pointe noire',
      code: 'DIST-RPN',
      parishes: [
        'LES POISSONS CHATS',
        'Les Etoiles de Mer',
        'LES HYPPOCAMPES',
        'LES RAIES MANTAS',
        'LES PIRANHAS TACHETÉS',
      ],
    },
    {
      nom: 'Requin Scie',
      code: 'DIST-RSC',
      parishes: ['ANGE DE MER', 'LION DE MER', 'LES ELEPHANT DE MER'],
    },
    {
      nom: 'Requin Taureau',
      code: 'DIST-RTA',
      parishes: [
        'LES LONGIMANES',
        'LES SQUALES BOUCLES',
        'LES BABOSSES',
        'LES REQUINS TIGRE',
      ],
    },
    {
      nom: 'Requin des sables',
      code: 'DIST-RSA',
      parishes: ['LES BIDJARAS', 'LES WIRADJURIS', 'LES WURUNDJERIS'],
    },
  ],
};


// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const structureKey = (process.env.SEED_STRUCTURE ?? 'CLASSIQUE') as
    | 'MYTHOLOGIQUE'
    | 'CLASSIQUE';

  if (
    structureKey !== undefined &&
    structureKey !== 'MYTHOLOGIQUE' &&
    structureKey !== 'CLASSIQUE'
  ) {
    throw new Error(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `SEED_STRUCTURE invalide : "${structureKey}". Valeurs acceptées : MYTHOLOGIQUE, CLASSIQUE`,
    );
  }

  const structure = structureKey === 'CLASSIQUE' ? CLASSIQUE : MYTHOLOGIQUE;

  const totalDistricts = structure.districts.length;
  const totalParishes = structure.districts.reduce(
    (acc, d) => acc + d.parishes.length,
    0,
  );

  console.log('🌱 Démarrage du seed — Héliopolis\n');
  console.log(`   Structure  : ${structureKey}`);
  console.log(`   ${structure.label}`);
  console.log(
    `   ${totalDistricts} district(s) · ${totalParishes} paroisse(s)\n`,
  );

  // ── 1. Région ───────────────────────────────────────────────────────────────
  const region = await prisma.region.upsert({
    where: { nom: "Région d'Abidjan" },
    update: {},
    create: { nom: "Région d'Abidjan", code: 'RGN-ABJ' },
  });
  console.log(`✔ Région : ${region.nom}`);

  // ── 2. Districts ────────────────────────────────────────────────────────────
  const districts: Record<string, { id: string; nom: string }> = {};
  for (const d of structure.districts) {
    const district = await prisma.district.upsert({
      where: { regionId_nom: { regionId: region.id, nom: d.nom } },
      update: {},
      create: { nom: d.nom, code: d.code, regionId: region.id },
    });
    districts[d.nom] = district;
  }
  console.log(`✔ Districts : ${Object.keys(districts).length} créés`);

  // ── 3. Paroisses ────────────────────────────────────────────────────────────
  const parishes: Record<string, { id: string; nom: string }> = {};
  for (const d of structure.districts) {
    const district = districts[d.nom];
    for (const pnom of d.parishes) {
      const parish = await prisma.parish.upsert({
        where: { districtId_nom: { districtId: district.id, nom: pnom } },
        update: {},
        create: { nom: pnom, districtId: district.id },
      });
      parishes[`${d.nom}::${pnom}`] = parish;
    }
  }
  console.log(`✔ Paroisses : ${Object.keys(parishes).length} créées`);

  // ── 4. Communauté Mahatma Gandhi ────────────────────────────────────────────
  const communityParishKey = `${structure.communityDistrict}::${structure.communityParish}`;
  const communityParish = parishes[communityParishKey];
  if (!communityParish) {
    throw new Error(
      `Paroisse communautaire introuvable : ${communityParishKey}`,
    );
  }
  const community = await prisma.community.upsert({
    where: {
      parishId_nom: {
        parishId: communityParish.id,
        nom: 'Communauté Mahatma Gandhi',
      },
    },
    update: {},
    create: { nom: 'Communauté Mahatma Gandhi', parishId: communityParish.id },
  });
  console.log(`✔ Communauté : ${community.nom}`);

  // ── 5. Admin — Grand Archiviste ─────────────────────────────────────────────
  const adminHash = await hash('Admin@2026!');
  const admin = await prisma.user.upsert({
    where: { matricule: '0000001A' },
    update: {
      passwordHash: adminHash,
      statutProfil: 'ACTIF',
      regionId: region.id,
    },
    create: {
      nom: 'Archiviste',
      prenoms: 'Grand',
      matricule: '0000001A',
      email: 'admin@heliopolis.ci',
      passwordHash: adminHash,
      role: 'ADMIN',
      statutProfil: 'ACTIF',
      regionId: region.id,
    },
  });
  console.log(
    `✔ ADMIN       : ${admin.prenoms} ${admin.nom}  (${admin.matricule})`,
  );



  // ── 10. Adhésion 2026 — compte admin ─────────────────────────────────────
  await prisma.adhesion.upsert({
    where: { userId_annee: { userId: admin.id, annee: 2026 } },
    update: {},
    create: {
      userId: admin.id,
      annee: 2026,
      statut: 'A_JOUR',
      validateurId: admin.id,
      dateValidation: new Date(),
    },
  });
  console.log(`✔ Adhésion    : admin marqué À jour`);

  // ── 11. Badges ──────────────────────────────────────────────────────────────
  const badgesInput = [
    {
      code: 'EVEIL',
      nom: "Pierre d'Éveil",
      description: 'Premier défi validé — le chemin du Gardien commence.',
      condition: 'Valider son premier défi Codex',
      niveau: 'BRONZE' as const,
      conditionMeta: { type: 'challenges_validated', count: 1 },
    },
    {
      code: 'MARCHEUR',
      nom: 'Corde du Marcheur',
      description: 'Cinq défis validés, la route se trace.',
      condition: 'Valider 5 défis Codex',
      niveau: 'BRONZE' as const,
      conditionMeta: { type: 'challenges_validated', count: 5 },
    },
    {
      code: 'ANCRE',
      nom: 'Ancre de Communauté',
      description: 'Premier défi communautaire relevé avec sa paroisse.',
      condition: 'Valider un défi de catégorie Communautaire',
      niveau: 'ARGENT' as const,
      conditionMeta: { type: 'communautaire_validated', count: 1 },
    },
    {
      code: 'ANKH',
      nom: 'Ankh du Gardien',
      description: 'Dix défis validés — le Gardien prend racine.',
      condition: 'Valider 10 défis Codex',
      niveau: 'ARGENT' as const,
      conditionMeta: { type: 'challenges_validated', count: 10 },
    },
    {
      code: 'LUMIERE',
      nom: "Lumière de l'Esprit",
      description: 'Trois défis spirituels accomplis.',
      condition: 'Valider 3 défis de catégorie Spirituelle',
      niveau: 'ARGENT' as const,
      conditionMeta: { type: 'spirituel_validated', count: 3 },
    },
    {
      code: 'FLAMME',
      nom: 'Flamme du Gardien',
      description:
        "Le défi long des 21 jours accompli — la flamme s'est établie.",
      condition: 'Valider le défi « 21 jours de Gardien »',
      niveau: 'OR' as const,
      conditionMeta: { type: 'long_challenge', challengeCode: '21JOURS' },
    },
    {
      code: 'ABAYKACAMP',
      nom: "Bouclier d'Abay-Ka",
      description: 'Participant sélectionné et présent au Camp Régional.',
      condition: 'Être présent au camp régional',
      niveau: 'OR' as const,
      conditionMeta: { type: 'camp_present', campType: 'REGIONAL' },
    },
    {
      code: 'LEGENDE',
      nom: "Étoile d'Héliopolis",
      description: 'Vingt-cinq défis validés — légende vivante du Codex.',
      condition: 'Valider 25 défis Codex',
      niveau: 'LEGENDE' as const,
      conditionMeta: { type: 'challenges_validated', count: 25 },
    },
  ];

  for (const b of badgesInput) {
    await prisma.badge.upsert({
      where: { code: b.code },
      update: {},
      create: b,
    });
  }
  console.log(`✔ Badges      : ${badgesInput.length} créés`);

  // ── 12. Défis ────────────────────────────────────────────────────────────────
  const challengesInput = [
    {
      titre: '🌱 Planter une graine',
      description:
        'Plante une graine ou un jeune plant dans ton quartier et soigne-le pendant 7 jours. Observe sa croissance chaque jour.',
      categorie: 'PERSONNEL' as const,
      regne: 'TERRE' as const,
      niveau: 'DECOUVERTE' as const,
      preuveDemandee: 'Photo de la graine plantée + photo J+7',
      points: 10,
    },
    {
      titre: '🧹 Nettoyer une paroisse',
      description:
        'Organise ou participe à une action de nettoyage de ton lieu de culte ou de ton quartier avec au moins 3 autres personnes.',
      categorie: 'COMMUNAUTAIRE' as const,
      regne: 'TERRE' as const,
      niveau: 'DECOUVERTE' as const,
      preuveDemandee: 'Photo avant/après + liste des participants',
      points: 15,
    },
    {
      titre: '🙏 Prière du Gardien',
      description:
        'Consacre 10 minutes par jour à une prière ou méditation sur la Création pendant 5 jours consécutifs.',
      categorie: 'SPIRITUEL' as const,
      regne: 'ESPRIT' as const,
      niveau: 'DECOUVERTE' as const,
      preuveDemandee: 'Journal de méditation (texte court de 5 entrées)',
      points: 12,
    },
    {
      titre: "🚰 Réduire l'eau",
      description:
        "Identifie 3 gestes concrets pour réduire ta consommation d'eau et applique-les pendant une semaine entière.",
      categorie: 'PERSONNEL' as const,
      regne: 'EAU' as const,
      niveau: 'ENGAGEMENT' as const,
      preuveDemandee: "Liste des gestes + témoignage écrit d'une semaine",
      points: 20,
    },
    {
      titre: "🌬️ Souffle de l'Air",
      description:
        "Initie ou rejoins un projet de plantation d'arbres ou de préservation de la qualité de l'air dans ton quartier.",
      categorie: 'COMMUNAUTAIRE' as const,
      regne: 'AIR' as const,
      niveau: 'ENGAGEMENT' as const,
      preuveDemandee: "Photo du projet + rapport d'activité (1 page)",
      points: 25,
    },
    {
      titre: '🔥 Veillée du Feu Sacré',
      description:
        "Organise une veillée de partage spirituel autour d'un feu (ou d'une bougie) avec au moins 5 membres de ta communauté.",
      categorie: 'SPIRITUEL' as const,
      regne: 'FEU' as const,
      niveau: 'ENGAGEMENT' as const,
      preuveDemandee: 'Photo de la veillée + liste des participants',
      points: 30,
    },
    {
      titre: "💧 Gardien de l'Eau Vive",
      description:
        "Mène une action de sensibilisation sur la préservation de l'eau dans ta communauté : sensibiliser au moins 10 personnes.",
      categorie: 'COMMUNAUTAIRE' as const,
      regne: 'EAU' as const,
      niveau: 'MAITRISE' as const,
      preuveDemandee: 'Compte-rendu écrit + photos ou signatures',
      points: 40,
    },
    {
      titre: '🌿 21 jours de Gardien',
      description:
        "Le grand défi : 21 jours d'actions quotidiennes pour la Création. Un acte concret par jour, documenté dans un journal de bord.",
      categorie: 'LONG' as const,
      regne: null,
      niveau: 'MAITRISE' as const,
      preuveDemandee: 'Journal de 21 entrées avec photos et/ou textes',
      points: 100,
    },
  ];

  let challengesCreated = 0;
  for (const c of challengesInput) {
    const existing = await prisma.challenge.findFirst({
      where: { titre: c.titre },
    });
    if (!existing) {
      await prisma.challenge.create({
        data: {
          titre: c.titre,
          description: c.description,
          categorie: c.categorie,
          regne: c.regne ?? undefined,
          niveau: c.niveau,
          preuveDemandee: c.preuveDemandee,
          points: c.points,
          statut: 'ACTIF',
          createdById: admin.id,
        },
      });
      challengesCreated++;
    }
  }
  console.log(`✔ Défis       : ${challengesCreated} créés`);

  // ── 13. Camp régional Abay-Ka 2026 — non créé par le seed (à créer via l'UI) ─

  // ── 14. Canal de messagerie régional ────────────────────────────────────────
  const existingConv = await prisma.conversation.findFirst({
    where: { type: 'REGION', regionId: region.id },
  });
  if (!existingConv) {
    await prisma.conversation.create({
      data: {
        type: 'REGION',
        nom: "Conseil d'Héliopolis — Canal Région",
        description: "Canal officiel de la Région d'Abidjan",
        regionId: region.id,
        isPinned: true,
        isModerated: true,
        members: {
          create: [
            { userId: admin.id, role: 'OWNER' },
          ],
        },
      },
    });
  }
  console.log(`✔ Messagerie  : canal régional créé`);

  // ─────────────────────────────────────────────────────────────────────────────
  // Résumé
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ✅  Seed terminé avec succès !');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Structure : ${structureKey} — ${structure.label}`);
  console.log(
    `  Districts : ${totalDistricts}  ·  Paroisses : ${totalParishes}`,
  );
  console.log('');
  console.log('  Comptes fixes :');
  console.log('  ┌─────────────────┬──────────────┬──────────────────────┐');
  console.log('  │ Rôle            │ Matricule    │ Mot de passe         │');
  console.log('  ├─────────────────┼──────────────┼──────────────────────┤');
  console.log('  │ ADMIN           │ 0000001A     │ Admin@2026!          │');
  console.log('  └─────────────────┴──────────────┴──────────────────────┘');
  console.log('');
  console.log('  Pour changer de structure :');
  console.log('  SEED_STRUCTURE=MYTHOLOGIQUE  npx prisma db seed  (structure de démo)');
  console.log('  SEED_STRUCTURE=CLASSIQUE     npx prisma db seed  (défaut — districts officiels)');
  console.log('');
  console.log('  URL API  : http://localhost:4000/api');
  console.log('  URL App  : http://localhost:3000');
  console.log('');
}

main()
  .catch((e: Error) => {
    console.error('\n❌ Erreur seed :', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
