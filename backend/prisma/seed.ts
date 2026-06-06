/**
 * Seed — Le Codex des Gardiens
 * Route en Joie 2026 · Région d'Abidjan
 *
 * Exécuter : npx prisma db seed
 * (configure dans package.json → "prisma": { "seed": "tsx prisma/seed.ts" })
 */

import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL']!,
});
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Démarrage du seed — Codex des Gardiens…\n');

  // ── 1. Région ───────────────────────────────────────────────────────────────
  const region = await prisma.region.upsert({
    where: { nom: "Région d'Abidjan" },
    update: {},
    create: {
      nom: "Région d'Abidjan",
      code: 'RGN-ABJ',
    },
  });
  console.log(`✔ Région : ${region.nom}`);

  // ── 2. Districts ────────────────────────────────────────────────────────────
  const districtsInput = [
    { nom: 'Treichville', code: 'DOY-TRE' },
    { nom: 'Cocody', code: 'DOY-COC' },
    { nom: 'Marcory', code: 'DOY-MAR' },
    { nom: 'Plateau', code: 'DOY-PLT' },
    { nom: 'Bingerville', code: 'DOY-BIN' },
    { nom: 'Abobo', code: 'DOY-ABO' },
    { nom: 'Adjame', code: 'DOY-ADJ' },
  ];

  const districts: Record<string, { id: string; nom: string }> = {};
  for (const d of districtsInput) {
    const district = await prisma.district.upsert({
      where: { regionId_nom: { regionId: region.id, nom: d.nom } },
      update: {},
      create: { nom: d.nom, code: d.code, regionId: region.id },
    });
    districts[d.nom] = district;
  }
  console.log(`✔ Districts : ${Object.keys(districts).join(', ')}`);

  // ── 3. Paroisses ────────────────────────────────────────────────────────────
  const parishesInput: Array<{ district: string; parishes: string[] }> = [
    {
      district: 'Treichville',
      parishes: [
        'Saint-Michel de Treichville',
        'Sainte-Marie',
        'Saint-François Xavier',
        'Saint-Augustin',
        'Notre-Dame de Lourdes',
      ],
    },
    {
      district: 'Cocody',
      parishes: [
        'Saint-Joseph de Cocody',
        'Sainte-Famille',
        'Notre-Dame des Grâces',
        'Christ-Roi',
      ],
    },
    {
      district: 'Marcory',
      parishes: [
        'Sainte-Thérèse de Marcory',
        'Saint-Antoine',
        'Notre-Dame de Marcory',
      ],
    },
    {
      district: 'Plateau',
      parishes: [
        'Cathédrale Saint-Paul du Plateau',
        'Saint-Pierre',
        'Sacré-Cœur',
      ],
    },
    {
      district: 'Bingerville',
      parishes: ['Saint-Jean de Bingerville', 'Sainte-Cécile'],
    },
    {
      district: 'Abobo',
      parishes: ["Saint-Luc d'Abobo", 'Saint-Marc', 'Bon Pasteur'],
    },
    {
      district: 'Adjame',
      parishes: ['Notre-Dame de la Mer', "Sainte-Croix d'Adjame"],
    },
  ];

  const parishes: Record<string, { id: string; nom: string }> = {};
  for (const pd of parishesInput) {
    const district = districts[pd.district];
    for (const pnom of pd.parishes) {
      const parish = await prisma.parish.upsert({
        where: { districtId_nom: { districtId: district.id, nom: pnom } },
        update: {},
        create: { nom: pnom, districtId: district.id },
      });
      parishes[pnom] = parish;
    }
  }
  console.log(`✔ Paroisses : ${Object.keys(parishes).length} créées`);

  // ── 4. Communauté Mahatma Gandhi ────────────────────────────────────────────
  const stjoseph = parishes['Saint-Joseph de Cocody'];
  const community = await prisma.community.upsert({
    where: {
      parishId_nom: { parishId: stjoseph.id, nom: 'Communauté Mahatma Gandhi' },
    },
    update: {},
    create: {
      nom: 'Communauté Mahatma Gandhi',
      parishId: stjoseph.id,
    },
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

  // ── 6. Hiérophante — Conseil d'Héliopolis ───────────────────────────────────
  const regionHash = await hash('Region@2026!');
  const hierophante = await prisma.user.upsert({
    where: { matricule: '0000002B' },
    update: {
      passwordHash: regionHash,
      statutProfil: 'ACTIF',
      regionId: region.id,
      districtId: districts['Cocody'].id,
      parishId: stjoseph.id,
    },
    create: {
      nom: 'Gandhi',
      prenoms: 'Hiérophante',
      matricule: '0000002B',
      email: 'hierophante@heliopolis.ci',
      passwordHash: regionHash,
      role: 'REGION',
      statutProfil: 'ACTIF',
      regionId: region.id,
      districtId: districts['Cocody'].id,
      parishId: stjoseph.id,
      communityId: community.id,
    },
  });

  // Lier la Région au Hiérophante (responsable)
  await prisma.region.updateMany({
    where: { responsableId: hierophante.id, NOT: { id: region.id } },
    data: { responsableId: null },
  });
  await prisma.region.update({
    where: { id: region.id },
    data: { responsableId: hierophante.id },
  });
  console.log(
    `✔ REGION      : ${hierophante.prenoms} ${hierophante.nom}  (${hierophante.matricule})`,
  );

  // ── 7. Sentinelles — une par District ───────────────────────────────────────
  const sentinellesInput = [
    {
      nom: 'Kouassi',
      prenoms: 'Pierre',
      matricule: '0526101C',
      district: 'Treichville',
      email: 'sentinelle.tre@heliopolis.ci',
    },
    {
      nom: "N'Dri",
      prenoms: 'Marie',
      matricule: '0526102D',
      district: 'Cocody',
      email: 'sentinelle.coc@heliopolis.ci',
    },
    {
      nom: 'Bamba',
      prenoms: 'Soumaïla',
      matricule: '0526103E',
      district: 'Marcory',
      email: 'sentinelle.mar@heliopolis.ci',
    },
    {
      nom: 'Yao',
      prenoms: 'Jean',
      matricule: '0526104F',
      district: 'Plateau',
      email: 'sentinelle.plt@heliopolis.ci',
    },
    {
      nom: 'Coulibaly',
      prenoms: 'Djibril',
      matricule: '0526105G',
      district: 'Bingerville',
      email: 'sentinelle.bin@heliopolis.ci',
    },
    {
      nom: 'Ouattara',
      prenoms: 'Roland',
      matricule: '0526106H',
      district: 'Abobo',
      email: 'sentinelle.abo@heliopolis.ci',
    },
    {
      nom: 'Diomandé',
      prenoms: 'Fatou',
      matricule: '0526107I',
      district: 'Adjame',
      email: 'sentinelle.adj@heliopolis.ci',
    },
  ];

  const sentinelleHash = await hash('Sentinelle@2026!');
  for (const s of sentinellesInput) {
    const district = districts[s.district];
    if (!district) {
      throw new Error(`District introuvable pour la sentinelle ${s.matricule}`);
    }
    const sentinelle = await prisma.user.upsert({
      where: { matricule: s.matricule },
      update: {
        passwordHash: sentinelleHash,
        statutProfil: 'ACTIF',
        regionId: region.id,
        districtId: district.id,
      },
      create: {
        nom: s.nom,
        prenoms: s.prenoms,
        matricule: s.matricule,
        email: s.email,
        passwordHash: sentinelleHash,
        role: 'SENTINELLE',
        statutProfil: 'ACTIF',
        regionId: region.id,
        districtId: district.id,
      },
    });
    // Lier le District à sa Sentinelle
    await prisma.district.updateMany({
      where: { responsableId: sentinelle.id, NOT: { id: district.id } },
      data: { responsableId: null },
    });
    await prisma.district.update({
      where: { id: district.id },
      data: { responsableId: sentinelle.id },
    });
  }
  console.log(`✔ SENTINELLES : 7 créées (une par district)`);

  // ── Données communes — noms ivoiriens ──────────────────────────────────────
  const NOM_POOL = [
    'Kouamé',
    'Konan',
    'Koffi',
    'Brou',
    'Yao',
    'Traoré',
    'Coulibaly',
    'Koné',
    'Touré',
    'Bamba',
    'Diallo',
    'Ouattara',
    "N'Guessan",
    "N'Dri",
    'Assi',
    'Aka',
    'Yapi',
    'Diabaté',
    'Doumbia',
    'Okou',
    'Ahoussou',
    'Ehui',
    'Bogui',
    'Lago',
    'Loba',
    "N'Da",
    "N'Goran",
    'Aké',
    'Attié',
    'Boa',
  ];
  const PRENOM_POOL = [
    'Emmanuel',
    'Aminata',
    'Kofi',
    'Fatou',
    'Jean-Baptiste',
    'Charlotte',
    'Youssouf',
    'Esther',
    'Franck',
    'Bintou',
    'Thierry',
    'Delphine',
    'Patrick',
    'Grâce',
    'Olivier',
    'Hortense',
    'Serge',
    'Inès',
    'Augustin',
    'Joëlle',
    'Laurent',
    'Mariame',
    'Marcel',
    'Nathalie',
    'Narcisse',
    'Odette',
    'Régis',
    'Sandra',
    'Sylvain',
    'Tatiana',
    'Théodore',
    'Véronique',
  ];
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // ── 8. Guides — 3 par paroisse (plein · adjoint · assistant) ───────────────
  type GuideRole = 'PLEIN' | 'ADJOINT' | 'ASSISTANT';
  const GUIDE_FONCTIONS: Array<{ guideRole: GuideRole; typeIdx: number }> = [
    { guideRole: 'PLEIN', typeIdx: 1 },
    { guideRole: 'ADJOINT', typeIdx: 2 },
    { guideRole: 'ASSISTANT', typeIdx: 3 },
  ];

  const guideHash = await hash('Guide@2026!');
  const guidePleinIds: string[] = [];
  let totalGuides = 0;

  for (let dIdx = 0; dIdx < districtsInput.length; dIdx++) {
    const districtName = districtsInput[dIdx].nom;
    const district = districts[districtName];
    const districtParishes =
      parishesInput.find((pd) => pd.district === districtName)?.parishes ?? [];

    for (let pIdx = 0; pIdx < districtParishes.length; pIdx++) {
      const parishName = districtParishes[pIdx];
      const parish = parishes[parishName];
      const isSaintJoseph = parishName === 'Saint-Joseph de Cocody';

      for (const { guideRole, typeIdx } of GUIDE_FONCTIONS) {
        totalGuides++;
        const letter = ALPHABET[(totalGuides - 1) % 26];
        // Format : 27 + district(2) + paroisse(2) + fonction(1) + lettre → 8 chars
        const matricule = `27${String(dIdx + 1).padStart(2, '0')}${String(pIdx + 1).padStart(2, '0')}${typeIdx}${letter}`;
        const nom = NOM_POOL[(dIdx * 6 + pIdx * 4 + typeIdx) % NOM_POOL.length];
        const prenom =
          PRENOM_POOL[(dIdx * 9 + pIdx * 5 + typeIdx + 1) % PRENOM_POOL.length];

        const guideUser = await prisma.user.upsert({
          where: { matricule },
          update: {
            passwordHash: guideHash,
            statutProfil: 'ACTIF',
            regionId: region.id,
            districtId: district.id,
            parishId: parish.id,
          },
          create: {
            nom,
            prenoms: prenom,
            matricule,
            email: `${matricule.toLowerCase()}@heliopolis.ci`,
            passwordHash: guideHash,
            role: 'GUIDE',
            statutProfil: 'ACTIF',
            regionId: region.id,
            districtId: district.id,
            parishId: parish.id,
            ...(isSaintJoseph && guideRole === 'PLEIN'
              ? { communityId: community.id }
              : {}),
          },
        });

        // guideRole est un enum ajouté par la migration — on le pose via SQL
        await prisma.$executeRaw`
          UPDATE "users"
          SET "guideRole" = ${guideRole}::"GuideRole"
          WHERE id = ${guideUser.id}
        `;

        if (guideRole === 'PLEIN') {
          guidePleinIds.push(guideUser.id);
          await prisma.parish.update({
            where: { id: parish.id },
            data: { guideId: guideUser.id },
          });
        }
      }
    }
  }
  console.log(
    `✔ GUIDES      : ${totalGuides} créés (3 par paroisse · ${Object.keys(parishes).length} paroisses · plein / adjoint / assistant)`,
  );

  // ── 9. Gardiens — 5 actifs par paroisse ────────────────────────────────────

  const gardienHash = await hash('Gardien@2026!');
  const gardienIdsAJour: string[] = [];
  let totalGardiens = 0;

  for (let dIdx = 0; dIdx < districtsInput.length; dIdx++) {
    const districtName = districtsInput[dIdx].nom;
    const district = districts[districtName];
    const districtParishes =
      parishesInput.find((pd) => pd.district === districtName)?.parishes ?? [];

    for (let pIdx = 0; pIdx < districtParishes.length; pIdx++) {
      const parishName = districtParishes[pIdx];
      const parish = parishes[parishName];

      for (let gIdx = 1; gIdx <= 5; gIdx++) {
        totalGardiens++;
        const letter = ALPHABET[(totalGardiens - 1) % 26];
        // Format : 26 + district(2) + paroisse(2) + gardien(1) + lettre → 8 chars
        const matricule = `26${String(dIdx + 1).padStart(2, '0')}${String(pIdx + 1).padStart(2, '0')}${gIdx}${letter}`;
        const nom =
          NOM_POOL[(dIdx * 5 + pIdx * 3 + gIdx - 1) % NOM_POOL.length];
        const prenom =
          PRENOM_POOL[(dIdx * 7 + pIdx * 4 + gIdx) % PRENOM_POOL.length];

        const gardien = await prisma.user.upsert({
          where: { matricule },
          update: {
            passwordHash: gardienHash,
            statutProfil: 'ACTIF',
            regionId: region.id,
            districtId: district.id,
            parishId: parish.id,
          },
          create: {
            nom,
            prenoms: prenom,
            matricule,
            email: `${matricule.toLowerCase()}@heliopolis.ci`,
            passwordHash: gardienHash,
            role: 'GARDIEN',
            statutProfil: 'ACTIF',
            regionId: region.id,
            districtId: district.id,
            parishId: parish.id,
          },
        });

        // Les 3 premiers par paroisse sont à jour (les 2 derniers restent en attente)
        if (gIdx <= 3) gardienIdsAJour.push(gardien.id);
      }
    }
  }
  console.log(
    `✔ GARDIENS    : ${totalGardiens} créés (5 par paroisse · ${Object.keys(parishes).length} paroisses)`,
  );

  // ── 10. Adhésions 2026 ───────────────────────────────────────────────────────
  // Encadrants à jour
  for (const userId of [admin.id, hierophante.id, ...guidePleinIds]) {
    await prisma.adhesion.upsert({
      where: { userId_annee: { userId, annee: 2026 } },
      update: {},
      create: {
        userId,
        annee: 2026,
        statut: 'A_JOUR',
        validateurId: admin.id,
        dateValidation: new Date(),
      },
    });
  }
  // Gardiens — 3 sur 5 à jour par paroisse, les 2 derniers en attente
  for (const userId of gardienIdsAJour) {
    await prisma.adhesion.upsert({
      where: { userId_annee: { userId, annee: 2026 } },
      update: {},
      create: {
        userId,
        annee: 2026,
        statut: 'A_JOUR',
        validateurId: admin.id,
        dateValidation: new Date(),
      },
    });
  }
  console.log(
    `✔ Adhésions   : admin + hiérophante + ${guidePleinIds.length} guides pleins + ${gardienIdsAJour.length} gardiens (3/paroisse) marqués À jour`,
  );

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

  // ── 12. Défis / Challenges ───────────────────────────────────────────────────
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

  // ── 13. Camp régional Abay-Ka 2026 ──────────────────────────────────────────
  const existingCamp = await prisma.camp.findFirst({
    where: { nom: "Camp d'Abay-Ka 2026" },
  });
  if (!existingCamp) {
    await prisma.camp.create({
      data: {
        nom: "Camp d'Abay-Ka 2026",
        theme: 'Les Cinq Règnes de la Création',
        description:
          "Camp régional annuel de la Route en Joie — Communauté Mahatma Gandhi, Région d'Abidjan.",
        type: 'REGIONAL',
        statut: 'OUVERT',
        lieu: "Bingerville, Côte d'Ivoire",
        dateDebut: new Date('2026-07-20'),
        dateFin: new Date('2026-07-27'),
        selectionOuverte: true,
        regionId: region.id,
        createdById: admin.id,
      },
    });
  }
  console.log(`✔ Camp        : Camp d'Abay-Ka 2026 (OUVERT · Bingerville)`);

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
            { userId: hierophante.id, role: 'MODERATEUR' },
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
  console.log('  Comptes créés :');
  console.log('  ┌─────────────────┬──────────────┬──────────────────────┐');
  console.log('  │ Rôle            │ Matricule    │ Mot de passe         │');
  console.log('  ├─────────────────┼──────────────┼──────────────────────┤');
  console.log('  │ ADMIN           │ 0000001A     │ Admin@2026!          │');
  console.log('  │ REGION          │ 0000002B     │ Region@2026!         │');
  console.log('  │ SENTINELLE      │ 0526101C     │ Sentinelle@2026!     │');
  console.log('  │ GUIDE (plein)   │ 2702011P *   │ Guide@2026!          │');
  console.log('  │ GUIDE (adjoint) │ 2702012Q *   │ Guide@2026!          │');
  console.log('  │ GUIDE (asst.)   │ 2702013R *   │ Guide@2026!          │');
  console.log('  │ GARDIEN         │ 2601011A *   │ Gardien@2026!        │');
  console.log('  └─────────────────┴──────────────┴──────────────────────┘');
  console.log('  * exemples — Saint-Joseph de Cocody / Treichville p.1');
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
