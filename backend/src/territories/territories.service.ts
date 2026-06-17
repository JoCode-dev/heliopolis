import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import type { AdhesionStatus, CampStatus } from '../../generated/prisma/enums.js';
import * as XLSX from 'xlsx';

export interface DashboardStatsResponse {
  overview: {
    totalGardiens: number;
    campsOuverts: number;
    defisValides: number;
    districts: number;
    sentinelles: number;
    guides: number;
    conseilsAVenir: number;
  };
  activeCamp: { id: string; nom: string } | null;
  districts: Array<{
    id: string;
    nom: string;
    routiers: number;
    selectionnes: number;
    paroisses: number;
  }>;
  adhesions: {
    annee: number;
    aJour: number;
    nonAJour: number;
    enAttente: number;
    total: number;
  };
  challenges: Array<{ id: string; titre: string; submissions: number }>;
  camps: Array<{
    id: string;
    nom: string;
    participants: number;
    statut: CampStatus;
  }>;
}

@Injectable()
export class TerritoriesService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  async getRegions() {
    return this.prisma.region.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { districts: true, users: true } },
      },
      orderBy: { nom: 'asc' },
    });
  }

  async getDistricts(regionId?: string) {
    return this.prisma.district.findMany({
      where: { deletedAt: null, ...(regionId && { regionId }) },
      include: {
        region: { select: { id: true, nom: true } },
        _count: { select: { parishes: true, users: true } },
      },
      orderBy: { nom: 'asc' },
    });
  }

  async getParishes(districtId?: string) {
    return this.prisma.parish.findMany({
      where: { deletedAt: null, ...(districtId && { districtId }) },
      include: {
        district: {
          select: {
            id: true,
            nom: true,
            region: { select: { id: true, nom: true } },
          },
        },
        guide: { select: { id: true, nom: true, prenoms: true } },
        _count: { select: { members: true } },
      },
      orderBy: { nom: 'asc' },
    });
  }

  async createDistrict(dto: { nom: string; code?: string; regionId: string }) {
    const region = await this.prisma.region.findFirst({
      where: { id: dto.regionId, deletedAt: null },
    });
    if (!region) throw new NotFoundException('Région introuvable');

    const existing = await this.prisma.district.findFirst({
      where: { regionId: dto.regionId, nom: dto.nom, deletedAt: null },
    });
    if (existing) throw new ConflictException('Un district avec ce nom existe déjà dans cette région');

    return this.prisma.district.create({
      data: {
        nom: dto.nom,
        ...(dto.code ? { code: dto.code } : {}),
        regionId: dto.regionId,
      },
      include: {
        region: { select: { id: true, nom: true } },
        _count: { select: { parishes: true, users: true } },
      },
    });
  }

  async deleteDistrict(id: string) {
    const district = await this.prisma.district.findFirst({
      where: { id, deletedAt: null },
    });
    if (!district) throw new NotFoundException('District introuvable');

    return this.prisma.district.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createParish(dto: { nom: string; districtId: string }) {
    const district = await this.prisma.district.findFirst({
      where: { id: dto.districtId, deletedAt: null },
    });
    if (!district) throw new NotFoundException('District introuvable');

    const existing = await this.prisma.parish.findFirst({
      where: { districtId: dto.districtId, nom: dto.nom, deletedAt: null },
    });
    if (existing) throw new ConflictException('Une paroisse avec ce nom existe déjà dans ce district');

    return this.prisma.parish.create({
      data: { nom: dto.nom, districtId: dto.districtId },
      include: {
        district: { select: { id: true, nom: true } },
      },
    });
  }

  async renameDistrict(id: string, nom: string) {
    const district = await this.prisma.district.findFirst({ where: { id, deletedAt: null } });
    if (!district) throw new NotFoundException('District introuvable');

    const conflict = await this.prisma.district.findFirst({
      where: { regionId: district.regionId, nom, deletedAt: null, NOT: { id } },
    });
    if (conflict) throw new ConflictException('Un district avec ce nom existe déjà');

    return this.prisma.district.update({
      where: { id },
      data: { nom },
      include: { region: { select: { id: true, nom: true } }, _count: { select: { parishes: true, users: true } } },
    });
  }

  async mergeDistricts(sourceId: string, targetId: string) {
    if (sourceId === targetId) throw new ConflictException('Source et cible identiques');

    const [source, target] = await Promise.all([
      this.prisma.district.findFirst({ where: { id: sourceId, deletedAt: null } }),
      this.prisma.district.findFirst({ where: { id: targetId, deletedAt: null } }),
    ]);
    if (!source) throw new NotFoundException('District source introuvable');
    if (!target) throw new NotFoundException('District cible introuvable');

    await this.prisma.$transaction([
      // Migrer les paroisses
      this.prisma.parish.updateMany({ where: { districtId: sourceId, deletedAt: null }, data: { districtId: targetId } }),
      // Migrer les membres
      this.prisma.user.updateMany({ where: { districtId: sourceId, deletedAt: null }, data: { districtId: targetId } }),
      // Soft-delete le district source
      this.prisma.district.update({ where: { id: sourceId }, data: { deletedAt: new Date() } }),
    ]);

    return { merged: true, targetId, sourceId };
  }

  async deleteParish(id: string) {
    const parish = await this.prisma.parish.findFirst({
      where: { id, deletedAt: null },
    });
    if (!parish) throw new NotFoundException('Paroisse introuvable');

    return this.prisma.parish.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getStats() {
    try {
      // count() peut retourner null avec @prisma/adapter-pg — on utilise une seule
      // requête SQL pour éviter le bug de batching du driver adapter
      type Row = {
        total_gardiens: bigint;
        camps_ouverts:  bigint;
        defis_valides:  bigint;
        districts:      bigint;
      };
      const [row] = await this.prisma.$queryRawUnsafe<Row[]>(`
        SELECT
          (SELECT COUNT(*) FROM users       WHERE "deletedAt" IS NULL AND role = 'GARDIEN') AS total_gardiens,
          (SELECT COUNT(*) FROM camps       WHERE statut = 'OUVERT')                        AS camps_ouverts,
          (SELECT COUNT(*) FROM submissions WHERE statut = 'VALIDE')                        AS defis_valides,
          (SELECT COUNT(*) FROM districts   WHERE "deletedAt" IS NULL)                      AS districts
      `);
      return {
        totalGardiens: Number(row?.total_gardiens ?? 0),
        campsOuverts:  Number(row?.camps_ouverts  ?? 0),
        defisValides:  Number(row?.defis_valides  ?? 0),
        districts:     Number(row?.districts      ?? 0),
      };
    } catch {
      return { totalGardiens: 0, campsOuverts: 0, defisValides: 0, districts: 0 };
    }
  }

  async getDashboardStats(): Promise<DashboardStatsResponse> {
    let annee: number;
    try {
      annee = await this.settings.getAnneePastorale();
    } catch {
      annee = new Date().getFullYear();
    }

    const defaultResponse: DashboardStatsResponse = {
      overview: { totalGardiens: 0, campsOuverts: 0, defisValides: 0, districts: 0, sentinelles: 0, guides: 0, conseilsAVenir: 0 },
      activeCamp: null,
      districts: [],
      adhesions: { annee, aJour: 0, nonAJour: 0, enAttente: 0, total: 0 },
      challenges: [],
      camps: [],
    };

    try {
    const [
      totalGardiens,
      campsOuverts,
      defisValides,
      districtCount,
      sentinelles,
      guides,
      conseilsAVenir,
      activeCamp,
      districtRows,
      gardiensByDistrict,
      campsRows,
      adhesionGroups,
      topChallenges,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { deletedAt: null, role: 'GARDIEN' },
      }),
      this.prisma.camp.count({ where: { statut: 'OUVERT' } }),
      this.prisma.submission.count({ where: { statut: 'VALIDE' } }),
      this.prisma.district.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { deletedAt: null, role: 'SENTINELLE' },
      }),
      this.prisma.user.count({
        where: { deletedAt: null, role: 'GUIDE' },
      }),
      this.prisma.council.count({
        where: { statut: 'PLANIFIE', date: { gt: new Date() } },
      }),
      this.prisma.camp.findFirst({
        where: { statut: { in: ['OUVERT', 'EN_COURS'] } },
        orderBy: { dateDebut: 'desc' },
        select: { id: true, nom: true },
      }),
      this.prisma.district.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          nom: true,
          _count: { select: { parishes: true } },
        },
        orderBy: { nom: 'asc' },
      }),
      this.prisma.$queryRaw<{ districtId: string; count: number }[]>`
        SELECT "districtId", CAST(COUNT(id) AS INT) AS count
        FROM users
        WHERE "deletedAt" IS NULL AND role = 'GARDIEN' AND "districtId" IS NOT NULL
        GROUP BY "districtId"
      `,
      this.prisma.camp.findMany({
        where: { statut: { in: ['OUVERT', 'EN_COURS'] } },
        select: {
          id: true,
          nom: true,
          statut: true,
          _count: { select: { participants: true } },
        },
        orderBy: { dateDebut: 'desc' },
      }),
      this.prisma.$queryRaw<{ statut: string; count: number }[]>`
        SELECT a.statut, CAST(COUNT(a.id) AS INT) AS count
        FROM adhesions a
        JOIN users u ON u.id = a."userId"
        WHERE a.annee = ${annee}
          AND u."deletedAt" IS NULL
          AND u.role = 'GARDIEN'
        GROUP BY a.statut
      `,
      this.prisma.challenge.findMany({
        select: {
          id: true,
          titre: true,
          _count: { select: { submissions: true } },
        },
        orderBy: { submissions: { _count: 'desc' } },
        take: 5,
      }),
    ]);

    const participantsByDistrict: { districtId: string; count: number }[] =
      activeCamp != null
        ? await this.prisma.$queryRaw`
            SELECT "districtId", CAST(COUNT(id) AS INT) AS count
            FROM camp_participants
            WHERE "campId" = ${activeCamp.id}
            GROUP BY "districtId"
          `
        : [];

    const routiersMap = new Map(
      gardiensByDistrict.map((g) => [g.districtId, Number(g.count)]),
    );
    const selectionnesMap = new Map(
      participantsByDistrict.map((p) => [p.districtId, Number(p.count)]),
    );

    const adhesionCounts: Record<AdhesionStatus, number> = {
      A_JOUR: 0,
      NON_A_JOUR: 0,
      EN_ATTENTE: 0,
    };
    for (const group of adhesionGroups) {
      adhesionCounts[group.statut as AdhesionStatus] = Number(group.count);
    }

    return {
      overview: {
        totalGardiens,
        campsOuverts,
        defisValides,
        districts: districtCount,
        sentinelles,
        guides,
        conseilsAVenir,
      },
      activeCamp,
      districts: districtRows.map((d) => ({
        id: d.id,
        nom: d.nom,
        routiers: routiersMap.get(d.id) ?? 0,
        selectionnes: selectionnesMap.get(d.id) ?? 0,
        paroisses: d._count.parishes,
      })),
      adhesions: {
        annee,
        aJour: adhesionCounts.A_JOUR,
        nonAJour: adhesionCounts.NON_A_JOUR,
        enAttente: adhesionCounts.EN_ATTENTE,
        total:
          adhesionCounts.A_JOUR +
          adhesionCounts.NON_A_JOUR +
          adhesionCounts.EN_ATTENTE,
      },
      challenges: topChallenges.map((c) => ({
        id: c.id,
        titre: c.titre,
        submissions: c._count.submissions,
      })),
      camps: campsRows.map((c) => ({
        id: c.id,
        nom: c.nom,
        participants: c._count.participants,
        statut: c.statut,
      })),
    };
    } catch {
      return defaultResponse;
    }
  }

  // ── Helpers matching flou ────────────────────────────────────────────────────

  private levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const prev = Array.from({ length: n + 1 }, (_, j) => j);
    const curr = new Array<number>(n + 1).fill(0);
    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        curr[j] = a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
      }
      prev.splice(0, prev.length, ...curr);
    }
    return prev[n];
  }

  private static readonly MOTS_VIDES = new Set([
    'requin', 'des', 'd', 'du', 'de', 'la', 'le', 'les', 'a', 'en', 'et', 'au', 'aux', 'l',
  ]);

  private normaliserFuzzy(s: string): string {
    return s.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/['''`]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0 && !TerritoriesService.MOTS_VIDES.has(t))
      .join(' ')
      .trim();
  }

  private estSimilaire(nomFichier: string, nomDB: string): boolean {
    const a = this.normaliserFuzzy(nomFichier);
    const b = this.normaliserFuzzy(nomDB);
    if (!a || !b) return false;
    if (a === b) return true;
    // L'un contient l'autre (ex: "Corail" dans "Corail Alepe Nord")
    if (a.includes(b) || b.includes(a)) return true;
    // Levenshtein adaptatif : 15 % de la longueur max, min 2
    const seuil = Math.max(2, Math.floor(Math.max(a.length, b.length) * 0.15));
    if (this.levenshtein(a, b) <= seuil) return true;
    // Chevauchement de tokens : 80 % des tokens courts présents dans les longs (Lev ≤ 1 par token)
    const tokA = a.split(' ').filter(t => t.length > 2);
    const tokB = b.split(' ').filter(t => t.length > 2);
    if (tokA.length > 0 && tokB.length > 0) {
      const [shorter, longer] = tokA.length <= tokB.length ? [tokA, tokB] : [tokB, tokA];
      const matched = shorter.filter(t => longer.some(l => l === t || this.levenshtein(t, l) <= 1));
      if (matched.length / shorter.length >= 0.8) return true;
    }
    return false;
  }

  private estEquipeRegionale(s: string): boolean {
    const n = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return /equipe.{0,10}r[eé]gionale?/i.test(n) || /[eé]quipe.{0,10}r[eé]gionale?/i.test(n);
  }

  // ── Parsing date robuste ─────────────────────────────────────────────────────

  private static readonly ANNEE_MIN = 1900;
  private static readonly ANNEE_MAX = new Date().getFullYear();

  private parserDate(raw: unknown): Date | null {
    if (!raw) return null;
    let d: Date | null = null;
    if (raw instanceof Date) {
      d = raw;
    } else {
      const str = String(raw).trim();
      const parts = str.split('/');
      if (parts.length === 3) {
        // DD/MM/YYYY — si l'année a plus de 4 chiffres c'est corrompu
        const annee = +parts[2];
        if (annee > TerritoriesService.ANNEE_MAX || annee < TerritoriesService.ANNEE_MIN) return null;
        d = new Date(annee, +parts[1] - 1, +parts[0]);
      } else {
        d = new Date(str);
      }
    }
    if (!d || isNaN(d.getTime())) return null;
    const annee = d.getFullYear();
    if (annee < TerritoriesService.ANNEE_MIN || annee > TerritoriesService.ANNEE_MAX) return null;
    return d;
  }

  // ── Méthode principale ───────────────────────────────────────────────────────

  async compareExcel(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    const districtsFichier = new Map<string, string>(); // clé unique → valeur originale
    const paroissesFichier = new Map<string, string>();
    const nomsEquipesRegionales = new Set<string>(); // libellés "équipe régionale" rencontrés

    type ParticipantRow = {
      nom: string;
      prenoms: string;
      matricule: string;
      dateNaissance: Date | null;
      district: string;
      paroisse: string;
      equipeRegionale: boolean;
    };

    const participants: ParticipantRow[] = [];

    const cleNorm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

    for (const row of rows) {
      const district = String(row['District'] ?? row['district'] ?? '').trim();
      const paroisse = String(
        row['Groupe Scoute'] ?? row['Groupe Scout'] ?? row['groupe_scoute'] ?? row['Paroisse'] ?? row['paroisse'] ?? '',
      ).trim();
      const nom = String(row['Nom'] ?? row['nom'] ?? '').trim();
      const prenoms = String(
        row['Prenom'] ?? row['Prénom'] ?? row['prenoms'] ?? row['Prénoms'] ?? '',
      ).trim();
      const matricule = String(row['Matricule'] ?? row['matricule'] ?? '').trim();
      const dateRaw = row['Date de Naissance'] ?? row['dateNaissance'] ?? row['date_naissance'] ?? row['DateNaissance'] ?? row['Date Naissance'] ?? null;

      const districtEstER = district ? this.estEquipeRegionale(district) : false;
      const paroisseEstER = paroisse ? this.estEquipeRegionale(paroisse) : false;
      const estER = districtEstER || paroisseEstER;

      if (estER) {
        if (district) nomsEquipesRegionales.add(district);
        if (paroisse) nomsEquipesRegionales.add(paroisse);
      }

      // N'ajouter aux cartes de territoires que si ce n'est PAS une équipe régionale
      if (district && !districtEstER) {
        if (!districtsFichier.has(cleNorm(district))) districtsFichier.set(cleNorm(district), district);
      }
      if (paroisse && !paroisseEstER) {
        if (!paroissesFichier.has(cleNorm(paroisse))) paroissesFichier.set(cleNorm(paroisse), paroisse);
      }

      if (nom || prenoms || matricule) {
        participants.push({
          nom,
          prenoms,
          matricule,
          dateNaissance: this.parserDate(dateRaw),
          district,
          paroisse,
          equipeRegionale: estER,
        });
      }
    }

    // Charger territoires depuis la BD
    const [districtsDB, paroissesBD] = await Promise.all([
      this.prisma.district.findMany({
        where: { deletedAt: null },
        select: { nom: true },
        orderBy: { nom: 'asc' },
      }),
      this.prisma.parish.findMany({
        where: { deletedAt: null },
        select: { nom: true, district: { select: { nom: true } } },
        orderBy: { nom: 'asc' },
      }),
    ]);

    const nomsDistrictsDB = districtsDB.map(d => d.nom);
    const nomsParoissesBD = paroissesBD.map(p => p.nom);

    // Comparer districts avec matching flou
    const matchsDistricts = new Set<string>();
    const seulementFichierDistricts: string[] = [];

    for (const [, original] of districtsFichier) {
      const dbMatch = nomsDistrictsDB.find(dbNom => this.estSimilaire(original, dbNom));
      if (dbMatch) {
        matchsDistricts.add(dbMatch);
      } else {
        seulementFichierDistricts.push(original);
      }
    }

    const seulementBaseDistricts = districtsDB
      .filter(d => !matchsDistricts.has(d.nom))
      .map(d => d.nom);

    // Comparer paroisses avec matching flou
    const matchsParoisses = new Set<string>();
    const seulementFichierParoisses: string[] = [];

    for (const [, original] of paroissesFichier) {
      const dbMatch = nomsParoissesBD.find(dbNom => this.estSimilaire(original, dbNom));
      if (dbMatch) {
        matchsParoisses.add(dbMatch);
      } else {
        seulementFichierParoisses.push(original);
      }
    }

    const seulementBaseParoisses = paroissesBD
      .filter(p => !matchsParoisses.has(p.nom))
      .map(p => p.nom);

    // Calculer les âges
    const maintenant = new Date();

    const participantsAvecAge = participants.map((p) => {
      if (!p.dateNaissance) {
        return {
          nom: p.nom, prenoms: p.prenoms, matricule: p.matricule,
          district: p.district, paroisse: p.paroisse,
          dateNaissance: null, ageEnAnnees: null, ageEnMois: null, ageFormate: null,
        };
      }
      const dn = p.dateNaissance;
      let annees = maintenant.getFullYear() - dn.getFullYear();
      let mois = maintenant.getMonth() - dn.getMonth();
      const jours = maintenant.getDate() - dn.getDate();
      if (jours < 0) mois--;
      if (mois < 0) { annees--; mois += 12; }
      return {
        nom: p.nom,
        prenoms: p.prenoms,
        matricule: p.matricule,
        district: p.district,
        paroisse: p.paroisse,
        dateNaissance: dn.toISOString().split('T')[0],
        ageEnAnnees: annees,
        ageEnMois: mois,
        ageFormate: `${annees} an${annees > 1 ? 's' : ''} ${mois} mois`,
      };
    });

    const nbEquipeRegionale = participants.filter(p => p.equipeRegionale).length;

    // Arborescence district → paroisses (depuis le fichier, hors équipe régionale)
    const arboMap = new Map<string, Set<string>>();
    const arboParticipants = new Map<string, number>();
    for (const p of participants) {
      if (p.equipeRegionale) continue;
      const d = p.district || '';
      if (!arboMap.has(d)) arboMap.set(d, new Set());
      if (p.paroisse) arboMap.get(d)!.add(p.paroisse);
      arboParticipants.set(d, (arboParticipants.get(d) ?? 0) + 1);
    }
    const arborescence = Array.from(arboMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'fr'))
      .map(([district, paroisses]) => ({
        district,
        paroisses: Array.from(paroisses).sort((a, b) => a.localeCompare(b, 'fr')),
        nbParticipants: arboParticipants.get(district) ?? 0,
      }));

    return {
      districts: {
        enBase: districtsDB.length,
        dansFichier: districtsFichier.size,
        correspondance: matchsDistricts.size,
        seulementEnBase: seulementBaseDistricts,
        seulementDansFichier: seulementFichierDistricts,
      },
      paroisses: {
        enBase: paroissesBD.length,
        dansFichier: paroissesFichier.size,
        correspondance: matchsParoisses.size,
        seulementEnBase: seulementBaseParoisses,
        seulementDansFichier: seulementFichierParoisses,
      },
      equipeRegionale: {
        total: nbEquipeRegionale,
        libelles: Array.from(nomsEquipesRegionales),
      },
      participants: {
        total: participants.length,
        liste: participantsAvecAge,
      },
      arborescence,
    };
  }

  async completerDistricts() {
    const corriges = await this.prisma.$executeRaw`
      UPDATE users u
      SET    "districtId" = p."districtId"
      FROM   parishes p
      WHERE  u."parishId"    = p.id
        AND  u."districtId"  IS NULL
        AND  p."deletedAt"   IS NULL
    `;
    return { corriges };
  }

  async appliquerExcel(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    const [districtsDB, paroissesBD] = await Promise.all([
      this.prisma.district.findMany({ where: { deletedAt: null }, select: { id: true, nom: true } }),
      this.prisma.parish.findMany({ where: { deletedAt: null }, select: { id: true, nom: true, districtId: true } }),
    ]);

    type RowParsed = { matricule: string; districtNom: string; paroisseNom: string; dateNaissance: Date | null };

    const rowsParsed: RowParsed[] = [];
    let sansMatricule = 0;

    for (const row of rows) {
      // Normaliser le matricule : trim + uppercase pour tolérer les différences de casse
      const matricule = String(row['Matricule'] ?? row['matricule'] ?? '').trim().toUpperCase();
      if (!matricule) { sansMatricule++; continue; }
      rowsParsed.push({
        matricule,
        districtNom: String(row['District'] ?? row['district'] ?? '').trim(),
        paroisseNom: String(
          row['Groupe Scoute'] ?? row['Groupe Scout'] ?? row['groupe_scoute'] ?? row['Paroisse'] ?? row['paroisse'] ?? '',
        ).trim(),
        dateNaissance: this.parserDate(
          row['Date de Naissance'] ?? row['dateNaissance'] ?? row['date_naissance'] ?? row['DateNaissance'] ?? null,
        ),
      });
    }

    if (rowsParsed.length === 0) {
      return { sansMatricule, traites: 0, misAJour: 0, introuvables: [], districtsSansMatch: [], parissesSansMatch: [], details: [] };
    }

    // Récupérer les utilisateurs — chercher aussi avec la casse d'origine pour maximiser les correspondances
    const users = await this.prisma.user.findMany({
      where: { matricule: { in: rowsParsed.map(r => r.matricule), mode: 'insensitive' } },
      select: { id: true, matricule: true, dateNaissance: true, districtId: true, parishId: true },
    });
    // Indexer par matricule normalisé
    const usersMap = new Map(users.map(u => [u.matricule!.toUpperCase(), u]));

    const introuvables: string[] = [];
    const districtsSansMatchSet = new Map<string, string>(); // nom Excel → raison
    const parissesSansMatchSet = new Map<string, string>();
    const details: Array<{ matricule: string; champsModifies: string[] }> = [];
    const updatePromises: Promise<unknown>[] = [];

    for (const row of rowsParsed) {
      const user = usersMap.get(row.matricule);
      if (!user) { introuvables.push(row.matricule); continue; }

      const updates: Record<string, unknown> = {};
      const champsModifies: string[] = [];

      // Date de naissance
      if (!user.dateNaissance && row.dateNaissance) {
        updates.dateNaissance = row.dateNaissance;
        champsModifies.push('date de naissance');
      }

      // District
      if (!user.districtId) {
        if (!row.districtNom || this.estEquipeRegionale(row.districtNom)) {
          // rien à faire — équipe régionale ou district vide dans le fichier
        } else {
          const match = districtsDB.find(d => this.estSimilaire(row.districtNom, d.nom));
          if (match) {
            updates.districtId = match.id;
            champsModifies.push(`district → ${match.nom}`);
          } else {
            districtsSansMatchSet.set(row.districtNom, row.districtNom);
          }
        }
      }

      // Paroisse
      if (!user.parishId) {
        if (!row.paroisseNom || this.estEquipeRegionale(row.paroisseNom)) {
          // rien à faire
        } else {
          const districtId = (updates.districtId as string | undefined) ?? user.districtId ?? undefined;
          const candidates = districtId ? paroissesBD.filter(p => p.districtId === districtId) : paroissesBD;
          const match = candidates.find(p => this.estSimilaire(row.paroisseNom, p.nom))
            ?? paroissesBD.find(p => this.estSimilaire(row.paroisseNom, p.nom));
          if (match) {
            updates.parishId = match.id;
            champsModifies.push(`paroisse → ${match.nom}`);
            // Si le district n'a toujours pas été résolu, l'inférer depuis le district de la paroisse en base
            if (!updates.districtId && !user.districtId && match.districtId) {
              const districtParoisse = districtsDB.find(d => d.id === match.districtId);
              if (districtParoisse) {
                updates.districtId = match.districtId;
                champsModifies.push(`district → ${districtParoisse.nom} (via paroisse)`);
              }
            }
          } else {
            parissesSansMatchSet.set(row.paroisseNom, row.paroisseNom);
          }
        }
      }

      if (champsModifies.length > 0) {
        updatePromises.push(this.prisma.user.update({ where: { id: user.id }, data: updates }));
        details.push({ matricule: row.matricule, champsModifies });
      }
    }

    await Promise.all(updatePromises);

    return {
      sansMatricule,
      traites: rowsParsed.length,
      misAJour: details.length,
      introuvables,
      districtsSansMatch: Array.from(districtsSansMatchSet.keys()),
      parissesSansMatch: Array.from(parissesSansMatchSet.keys()),
      details,
    };
  }
}
