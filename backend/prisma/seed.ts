/**
 * Seed — Héliopolis · Route en Joie 2026 · Région d'Abidjan
 *
 * SEED_STRUCTURE=MYTHOLOGIQUE  → 5 Règnes · 21 Districts · 42 Sanctuaires (défaut)
 * SEED_STRUCTURE=CLASSIQUE     → 21 Districts Scouts · 784 Routiers (GARDIEN) · Route en Joie 2026
 *
 * Exécuter : npx prisma db seed
 *            SEED_STRUCTURE=CLASSIQUE npx prisma db seed
 */

import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
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

interface SentinelleInput {
  nom: string;
  prenoms: string;
  matricule: string;
  district: string;
  email: string;
}

interface GardienInput {
  nom: string;
  prenoms: string;
  matricule: string;
  district: string;
  parish: string;
}

interface SeedStructureData {
  label: string;
  communityDistrict: string;
  communityParish: string;
  districts: DistrictInput[];
  sentinelles: SentinelleInput[];
  gardiens?: GardienInput[];
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
    { nom: 'Abay-Nehara',  code: 'NOU-ABN', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    { nom: 'Tefnut-Ka',    code: 'NOU-TEF', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    { nom: 'Meru-Nil',     code: 'NOU-MRN', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    { nom: 'Sobek-Ra',     code: 'NOU-SBR', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    { nom: 'Sobek-Khara',  code: 'NOU-SBK', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    // Règne de la Terre – Domaine de Kemet
    { nom: 'Kemet-Ur',     code: 'KEM-KMU', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    { nom: 'Napata-Seth',  code: 'KEM-NAP', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    { nom: 'Meroë-Ka',     code: 'KEM-MRK', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    { nom: 'Axoum-Ra',     code: 'KEM-AXO', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    { nom: 'Djenne-Maat',  code: 'KEM-DJN', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    // Règne du Souffle – Domaine de Shou
    { nom: 'Anemos-Ka',    code: 'SHO-ANK', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    { nom: 'Zephyra-Ra',   code: 'SHO-ZPH', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    { nom: 'Kush-Atem',    code: 'SHO-KSH', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    { nom: 'Maât-Shou',    code: 'SHO-MAT', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    // Règne du Vivant – Domaine de Kheper
    { nom: 'Kheper-Ankh',  code: 'KHP-KAN', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    { nom: 'Hathor-Nuru',  code: 'KHP-HTN', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    { nom: 'Anub-Safra',   code: 'KHP-ANS', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    // Règne du Feu – Domaine de Ra
    { nom: 'Ra-Merut',     code: 'RAF-RMR', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    { nom: 'Sekhmet-Ka',   code: 'RAF-SKH', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    { nom: 'Imhot-Khepri', code: 'RAF-IMH', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
    { nom: 'Aten-Sahra',   code: 'RAF-ATN', parishes: ['Sanctuaire Alpha', 'Sanctuaire Bêta'] },
  ],
  sentinelles: [
    { nom: 'Kouamé',    prenoms: 'Jean-Baptiste', matricule: '0526101C', district: 'Abay-Nehara',  email: 'sentinelle.abn@heliopolis.ci' },
    { nom: 'Traoré',    prenoms: 'Aminata',       matricule: '0526102D', district: 'Tefnut-Ka',    email: 'sentinelle.tef@heliopolis.ci' },
    { nom: 'Konan',     prenoms: 'Emmanuel',      matricule: '0526103E', district: 'Meru-Nil',     email: 'sentinelle.mrn@heliopolis.ci' },
    { nom: 'Bamba',     prenoms: 'Fatou',         matricule: '0526104F', district: 'Sobek-Ra',     email: 'sentinelle.sbr@heliopolis.ci' },
    { nom: 'Yao',       prenoms: 'Thierry',       matricule: '0526105G', district: 'Sobek-Khara',  email: 'sentinelle.sbk@heliopolis.ci' },
    { nom: "N'Guessan", prenoms: 'Charlotte',     matricule: '0526106H', district: 'Kemet-Ur',     email: 'sentinelle.kmu@heliopolis.ci' },
    { nom: 'Coulibaly', prenoms: 'Serge',         matricule: '0526107I', district: 'Napata-Seth',  email: 'sentinelle.nap@heliopolis.ci' },
    { nom: 'Diabaté',   prenoms: 'Delphine',      matricule: '0526108J', district: 'Meroë-Ka',     email: 'sentinelle.mrk@heliopolis.ci' },
    { nom: 'Koffi',     prenoms: 'Augustin',      matricule: '0526109K', district: 'Axoum-Ra',     email: 'sentinelle.axo@heliopolis.ci' },
    { nom: 'Ahoussou',  prenoms: 'Grâce',         matricule: '0526110L', district: 'Djenne-Maat',  email: 'sentinelle.djn@heliopolis.ci' },
    { nom: 'Koné',      prenoms: 'Patrick',       matricule: '0526111M', district: 'Anemos-Ka',    email: 'sentinelle.ank@heliopolis.ci' },
    { nom: 'Ouattara',  prenoms: 'Joëlle',        matricule: '0526112N', district: 'Zephyra-Ra',   email: 'sentinelle.zph@heliopolis.ci' },
    { nom: 'Aka',       prenoms: 'Franck',        matricule: '0526113O', district: 'Kush-Atem',    email: 'sentinelle.ksh@heliopolis.ci' },
    { nom: "N'Dri",     prenoms: 'Inès',          matricule: '0526114P', district: 'Maât-Shou',    email: 'sentinelle.mat@heliopolis.ci' },
    { nom: 'Brou',      prenoms: 'Laurent',       matricule: '0526115Q', district: 'Kheper-Ankh',  email: 'sentinelle.kan@heliopolis.ci' },
    { nom: 'Boa',       prenoms: 'Mariame',       matricule: '0526116R', district: 'Hathor-Nuru',  email: 'sentinelle.htn@heliopolis.ci' },
    { nom: 'Doumbia',   prenoms: 'Marcel',        matricule: '0526117S', district: 'Anub-Safra',   email: 'sentinelle.ans@heliopolis.ci' },
    { nom: 'Ehui',      prenoms: 'Véronique',     matricule: '0526118T', district: 'Ra-Merut',     email: 'sentinelle.rmr@heliopolis.ci' },
    { nom: 'Lago',      prenoms: 'Narcisse',      matricule: '0526119U', district: 'Sekhmet-Ka',   email: 'sentinelle.skh@heliopolis.ci' },
    { nom: 'Assi',      prenoms: 'Odette',        matricule: '0526120V', district: 'Imhot-Khepri', email: 'sentinelle.imh@heliopolis.ci' },
    { nom: 'Loba',      prenoms: 'Régis',         matricule: '0526121W', district: 'Aten-Sahra',   email: 'sentinelle.atn@heliopolis.ci' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Structure CLASSIQUE — 21 Districts Scouts · Route en Joie 2026
// ─────────────────────────────────────────────────────────────────────────────

const CLASSIQUE: SeedStructureData = {
  label: '21 Districts Scouts · Région d\'Abidjan · Route en Joie 2026',
  communityDistrict: 'Requin Baleine',
  communityParish: 'LES CACHALOTS',
  districts: [
    { nom: 'Agbakou In Hin Brê', code: 'DIST-AIB', parishes: ['Requin Bleu', 'Requin Renard', 'Requin Epineux'] },
    { nom: 'Black Tail Shark', code: 'DIST-BTS', parishes: ['BLACK JELLYFISH', 'Black Hamlet', 'BLACK MOLLY', 'Black Moray', 'BLACK STARFISH'] },
    { nom: 'Mango Taika', code: 'DIST-MTA', parishes: ['LES KORES MOANAS', 'LES TOHORAS', 'HAPUU RERU', 'LES MAKIS', 'LES NARWHALS', 'LES AMPHIPIRIONS', 'LES AIHES', 'Equipe de District Mango Taika'] },
    { nom: 'Requin à Pointe Blanche', code: 'DIST-RPB', parishes: ['PIEUVRE BLANCHE', 'TORTUE BLANCHE', 'STERNE BLANCHE', 'OTARIE BLANCHE', 'RAIE BLANCHE', 'Equipe de District Requin à Pointe Blanche'] },
    { nom: 'Requin à Pointe Noire', code: 'DIST-RPN', parishes: ['LES POISSONS CHATS', 'Les Etoiles de Mer', 'LES HYPPOCAMPES', 'LES RAIES MANTAS', 'LES PIRANHAS TACHETÉS'] },
    { nom: 'Requin Baleine', code: 'DIST-RBA', parishes: ['LES JUBARTES', 'LES WHALES', 'LES CACHALOTS', 'LES MYSTICETTES', 'LES RORQUALS', 'LES NARVALS', 'LES BELUGAS'] },
    { nom: 'Requin Bouledogue', code: 'DIST-RBO', parishes: ['Les Marsouins', 'Les Raies Mantas', 'Equipe de district Requin Bouledogue', 'Les Echinodernes', 'Les Orques', 'Les Octopus', 'Les Espadons Voiliers'] },
    { nom: 'REQUIN CORAIL Alépé Nord', code: 'DIST-RCA', parishes: ['LES DABOUKES DE AHOUE', 'LES AGUILLARTS DE LAME', 'LES GEY SHARKS  D\'ATTIEKOI', 'LES REQUINS CITRONS D\'AHOUTOUE', 'LES BLACKS SHARKS DE BROFODOUME'] },
    { nom: 'Requin Des Caraibes', code: 'DIST-RDC', parishes: ['Les Nitainos', 'Les Kalinagos', 'Les Naborias', 'Les Lucayens', 'les Cyboyens'] },
    { nom: 'Requin Féroce', code: 'DIST-RFE', parishes: ['Les Marsouins', 'Les Vaquitas', 'Les Rorquals'] },
    { nom: 'Requin Griset', code: 'DIST-RGR', parishes: ['LES BAJAUX', 'LES MOKENS', 'LES MOWOHS'] },
    { nom: 'Requin Lancette', code: 'DIST-RLA', parishes: ['LES LANCETTES LUMINEUX', 'LES REQUINS LANCETTES DOCILE', 'LES REQUINS LANCETTES ROYAUX /REQUIN LANCETTE  AIGUILLARD ROYAL', 'LES REQUINS LANCETTES ELEGANT', 'LES REQUINS LANCETTES AVIATORS', 'LES REQUINS LANCETTES EPINEUX'] },
    { nom: 'Requin Leopard', code: 'DIST-RLE', parishes: ['CHAPELLE SAINTE TRINITE', 'Saint Antoine de Padoue', 'CHAPELLE NOTRE DAME DE LA PROVIDENCE'] },
    { nom: 'Requin MAKO', code: 'DIST-RMA', parishes: ['LES REQUINS SAUMON', 'LES REQUINS DU GANGE', 'LES REQUINS MEGALODON', 'LES REQUINS CUIVRE', 'LES REQUINS TAUPE'] },
    { nom: 'Requin Marteau', code: 'DIST-RMT', parishes: ['LES REQUINS MARTEAUX ETOILES', 'LES REQUINS MARTEAUX TACHETES', 'LES REQUINS MARTEAUX A AILES BLANCHES', 'LES REQUIN MARTEAUX HALICORNE'] },
    { nom: 'Requin Noronhai', code: 'DIST-RNO', parishes: ['LES REQUINS TIGRES', 'LES EPAULARDS', 'LES CUBOMEDUSES', 'LES ORQUES MARINIERS'] },
    { nom: 'Requin Peau Bleu', code: 'DIST-RPE', parishes: ['SEMOU (TORTUE DE MER)', 'QUASI PAROISSE SAINT RAPHAEL ADJIN VILLAGE', 'QUASI PAROISSE SAINT BERNARD DES CITES', 'AKOMA', 'GWEVOKO', 'ANOMA RAIE MARINE'] },
    { nom: 'REQUIN PELERIN', code: 'DIST-RPL', parishes: ['BALEINE À BOSSE', 'LES REQUINS NOURRICES', 'LES ESPADONS', 'LES SEALS', 'LES LAMNAS NASUS', 'LES DAUPHINS BURRUNANS'] },
    { nom: 'Requin Sable', code: 'DIST-RSA', parishes: ['LES BIDJARAS', 'LES WIRADJURIS', 'LES WURUNDJERIS'] },
    { nom: 'Requin Scie', code: 'DIST-RSC', parishes: ['ANGE DE MER', 'LION DE MER', 'LES ELEPHANT DE MER'] },
    { nom: 'Requin Taureau Alépé Sud', code: 'DIST-RTA', parishes: ['LES LONGIMANES', 'LES SQUALES BOUCLES', 'LES BABOSSES', 'LES REQUINS TIGRE'] },
  ],
  sentinelles: [
    { nom: 'KONAN', prenoms: 'BEDIE STEPHANE', matricule: '0526201A', district: 'Agbakou In Hin Brê', email: 'sentinelle.aib@heliopolis.ci' },
    { nom: 'OUATTARA', prenoms: 'IBRAHIM MAMADOU', matricule: '0526202B', district: 'Black Tail Shark', email: 'sentinelle.bts@heliopolis.ci' },
    { nom: 'KOFFI', prenoms: 'JOEL ARNAUD', matricule: '0526203C', district: 'Mango Taika', email: 'sentinelle.mta@heliopolis.ci' },
    { nom: 'TRAORE', prenoms: 'ADJA GRACE', matricule: '0526204D', district: 'Requin à Pointe Blanche', email: 'sentinelle.rpb@heliopolis.ci' },
    { nom: 'DIALLO', prenoms: 'MAMADOU ABDOULAYE', matricule: '0526205E', district: 'Requin à Pointe Noire', email: 'sentinelle.rpn@heliopolis.ci' },
    { nom: 'TOURE', prenoms: 'SEYDOU KARIDJATOU', matricule: '0526206F', district: 'Requin Baleine', email: 'sentinelle.rba@heliopolis.ci' },
    { nom: 'BAMBA', prenoms: 'ABOU PAUL', matricule: '0526207G', district: 'Requin Bouledogue', email: 'sentinelle.rbo@heliopolis.ci' },
    { nom: 'COULIBALY', prenoms: 'SOULEYMANE JEAN', matricule: '0526208H', district: 'REQUIN CORAIL Alépé Nord', email: 'sentinelle.rca@heliopolis.ci' },
    { nom: 'KOUYATE', prenoms: 'ADAMA CELESTIN', matricule: '0526209I', district: 'Requin Des Caraibes', email: 'sentinelle.rdc@heliopolis.ci' },
    { nom: 'KONATE', prenoms: 'BRAHIMA EVELYNE', matricule: '0526210J', district: 'Requin Féroce', email: 'sentinelle.rfe@heliopolis.ci' },
    { nom: 'GBANE', prenoms: 'SOULEYMANE CHRISTOPHE', matricule: '0526211K', district: 'Requin Griset', email: 'sentinelle.rgr@heliopolis.ci' },
    { nom: 'SORO', prenoms: 'TIEKOURA INES', matricule: '0526212L', district: 'Requin Lancette', email: 'sentinelle.rla@heliopolis.ci' },
    { nom: 'DOUMBIA', prenoms: 'ABDOULAYE RACHEL', matricule: '0526213M', district: 'Requin Leopard', email: 'sentinelle.rle@heliopolis.ci' },
    { nom: 'FOFANA', prenoms: 'MAMADOU REGIS', matricule: '0526214N', district: 'Requin MAKO', email: 'sentinelle.rma@heliopolis.ci' },
    { nom: 'SANGARE', prenoms: 'IBRAHIM NADEGE', matricule: '0526215O', district: 'Requin Marteau', email: 'sentinelle.rmt@heliopolis.ci' },
    { nom: 'SYLLA', prenoms: 'OUMAR MATHIEU', matricule: '0526216P', district: 'Requin Noronhai', email: 'sentinelle.rno@heliopolis.ci' },
    { nom: 'CAMARA', prenoms: 'SEKOU EMELINE', matricule: '0526217Q', district: 'Requin Peau Bleu', email: 'sentinelle.rpe@heliopolis.ci' },
    { nom: 'DEMBELE', prenoms: 'LAMINE PARFAIT', matricule: '0526218R', district: 'REQUIN PELERIN', email: 'sentinelle.rpl@heliopolis.ci' },
    { nom: 'KEITA', prenoms: 'MOUSSA VIRGINIE', matricule: '0526219S', district: 'Requin Sable', email: 'sentinelle.rsa@heliopolis.ci' },
    { nom: 'CISSE', prenoms: 'ALHASSANE THEO', matricule: '0526220T', district: 'Requin Scie', email: 'sentinelle.rsc@heliopolis.ci' },
    { nom: 'BAGAYOKO', prenoms: 'DRAMANE JOSETTE', matricule: '0526221U', district: 'Requin Taureau Alépé Sud', email: 'sentinelle.rta@heliopolis.ci' },
  ],
  gardiens: [
    { nom: 'N\'GUESSAN', prenoms: 'KOUAME JEAN JOSIAS PATERNE', matricule: '0573794S', district: 'Agbakou In Hin Brê', parish: 'Requin Bleu' },
    { nom: 'GNAMIEN', prenoms: 'DAMPAH CHRIST SAMUEL', matricule: '0567724L', district: 'Agbakou In Hin Brê', parish: 'Requin Bleu' },
    { nom: 'ALIDJE', prenoms: 'YAGOUA ROSALIE', matricule: '0544779C', district: 'Agbakou In Hin Brê', parish: 'Requin Renard' },
    { nom: 'KRAHIBOUE', prenoms: 'VEYGNAI ANNE  BENEDICTE MAELLE', matricule: '0578337O', district: 'Agbakou In Hin Brê', parish: 'Requin Bleu' },
    { nom: 'KONAN', prenoms: 'MARIE SAMUEL', matricule: '0561450O', district: 'Agbakou In Hin Brê', parish: 'Requin Epineux' },
    { nom: 'KOBY', prenoms: 'ROXANE', matricule: '0596061E', district: 'Agbakou In Hin Brê', parish: 'Requin Epineux' },
    { nom: 'KOUDJE', prenoms: 'ARIEL', matricule: '0535957D', district: 'Agbakou In Hin Brê', parish: 'Requin Epineux' },
    { nom: 'KOUAME', prenoms: 'FRANCK ALAIN', matricule: '0514554K', district: 'Agbakou In Hin Brê', parish: 'Requin Epineux' },
    { nom: 'DAN', prenoms: 'ANGE', matricule: '0510449B', district: 'Agbakou In Hin Brê', parish: 'Requin Epineux' },
    { nom: 'DAN', prenoms: 'ROXANE', matricule: '0568709L', district: 'Agbakou In Hin Brê', parish: 'Requin Epineux' },
    { nom: 'YAO ADINGRA', prenoms: 'TANIA KENZA ORLANE', matricule: '0527014F', district: 'Agbakou In Hin Brê', parish: 'Requin Bleu' },
    { nom: 'ABY', prenoms: 'ZEPHIRIN', matricule: '0514940K', district: 'Agbakou In Hin Brê', parish: 'Requin Epineux' },
    { nom: 'DANHO', prenoms: 'MARIE', matricule: '0529586N', district: 'Agbakou In Hin Brê', parish: 'Requin Epineux' },
    { nom: 'ALLOUE', prenoms: 'ADRIEN', matricule: '0530089G', district: 'Agbakou In Hin Brê', parish: 'Requin Epineux' },
    { nom: 'KOUTOUAN', prenoms: 'DJOMAN JEAN YVES', matricule: '0581904N', district: 'Agbakou In Hin Brê', parish: 'Requin Epineux' },
    { nom: 'SOMIAN', prenoms: 'ALEXANDRA', matricule: '0562363E', district: 'Agbakou In Hin Brê', parish: 'Requin Epineux' },
    { nom: 'KONE', prenoms: 'CHERIF MOUSSA', matricule: '0581836A', district: 'Agbakou In Hin Brê', parish: 'Requin Epineux' },
    { nom: 'IROPLO', prenoms: 'MARIE PAULE', matricule: '0536858I', district: 'Agbakou In Hin Brê', parish: 'Requin Bleu' },
    { nom: 'IROPLO', prenoms: 'MARIE LOUISE', matricule: '0577101A', district: 'Agbakou In Hin Brê', parish: 'Requin Bleu' },
    { nom: 'KONGOZA', prenoms: 'GRACE', matricule: '0531256Z', district: 'Agbakou In Hin Brê', parish: 'Requin Epineux' },
    { nom: 'HIEN', prenoms: 'SIE ELIE FRANCK', matricule: '0530104Q', district: 'Agbakou In Hin Brê', parish: 'Requin Epineux' },
    { nom: 'COULIBALY', prenoms: 'YANN', matricule: '0563085H', district: 'Agbakou In Hin Brê', parish: 'Requin Epineux' },
    { nom: 'KRA', prenoms: 'MONIQUE', matricule: '0546265O', district: 'Agbakou In Hin Brê', parish: 'Requin Epineux' },
    { nom: 'SANGARE', prenoms: 'MOUSSA DESIRE TRESOR', matricule: '0512528I', district: 'Black Tail Shark', parish: 'BLACK JELLYFISH' },
    { nom: 'LEHO', prenoms: 'YOANE', matricule: '0542732K', district: 'Black Tail Shark', parish: 'BLACK JELLYFISH' },
    { nom: 'IRO', prenoms: 'YOHANN EMMANUEL MARIE GNONDE', matricule: '0533550B', district: 'Black Tail Shark', parish: 'Black Hamlet' },
    { nom: 'N\'GBOCHO', prenoms: 'AHOUNDJO CHRISTIAN YANNICK', matricule: '0516510X', district: 'Black Tail Shark', parish: 'BLACK JELLYFISH' },
    { nom: 'DJÉDJÉ', prenoms: 'ALAIN YANN LAUREL', matricule: '0585726D', district: 'Black Tail Shark', parish: 'BLACK MOLLY' },
    { nom: 'DALI', prenoms: 'ZIKE GENEVIEVE', matricule: '0565018X', district: 'Black Tail Shark', parish: 'BLACK MOLLY' },
    { nom: 'GADOU', prenoms: 'ADIATA AXELLE OLIVE SUZANNE', matricule: '0570067Z', district: 'Black Tail Shark', parish: 'Black Hamlet' },
    { nom: 'ANZARA', prenoms: 'MARIE ARMANDE', matricule: '0587761A', district: 'Black Tail Shark', parish: 'Black Hamlet' },
    { nom: 'KACOU-BOISSO', prenoms: 'DAVID JOËL N\'DJA', matricule: '0594761E', district: 'Black Tail Shark', parish: 'Black Moray' },
    { nom: 'MELES', prenoms: 'MARCEL', matricule: '0560679Y', district: 'Black Tail Shark', parish: 'Black Moray' },
    { nom: 'ADEGUE', prenoms: 'CARINE', matricule: '0555830H', district: 'Black Tail Shark', parish: 'Black Moray' },
    { nom: 'MOROH', prenoms: 'YHERE CLAIRE EMILE', matricule: '0562560S', district: 'Black Tail Shark', parish: 'Black Moray' },
    { nom: 'KACOU-BOISSO', prenoms: 'DAVID JOEL N\'DJA', matricule: '0570786A', district: 'Black Tail Shark', parish: 'Black Moray' },
    { nom: 'KOUASSI', prenoms: 'AMENAN EVE', matricule: '0581156A', district: 'Black Tail Shark', parish: 'BLACK STARFISH' },
    { nom: 'SAY', prenoms: 'NANOU', matricule: '0550543T', district: 'Black Tail Shark', parish: 'Black Hamlet' },
    { nom: 'KOUAKOU', prenoms: 'HAROLD', matricule: '0560830S', district: 'Black Tail Shark', parish: 'Black Hamlet' },
    { nom: 'GOUET', prenoms: 'MARIE DIVINE', matricule: '0554743K', district: 'Black Tail Shark', parish: 'Black Hamlet' },
    { nom: 'BINDE', prenoms: 'FLORE', matricule: '0599386L', district: 'Black Tail Shark', parish: 'BLACK STARFISH' },
    { nom: 'GBO', prenoms: 'KETSIA', matricule: '0517890E', district: 'Black Tail Shark', parish: 'BLACK STARFISH' },
    { nom: 'DIBO', prenoms: 'ERICA', matricule: '0512552K', district: 'Black Tail Shark', parish: 'BLACK STARFISH' },
    { nom: 'NGUESSAN', prenoms: 'KOUAME BRICE', matricule: '0534974U', district: 'Black Tail Shark', parish: 'BLACK STARFISH' },
    { nom: 'KOHIO', prenoms: 'ANNE', matricule: '0510761Z', district: 'Black Tail Shark', parish: 'BLACK STARFISH' },
    { nom: 'GOUEDAN', prenoms: 'CHRIS YVANN', matricule: '0563844I', district: 'Black Tail Shark', parish: 'BLACK STARFISH' },
    { nom: 'AMESSAN', prenoms: 'GRACE DIVANA ORLANDE', matricule: '0568700J', district: 'Black Tail Shark', parish: 'BLACK STARFISH' },
    { nom: 'BRIKA', prenoms: 'ALANE CHRIST EMMANUEL', matricule: '0558497U', district: 'Black Tail Shark', parish: 'BLACK MOLLY' },
    { nom: 'BLEOUE', prenoms: 'AHOSSAN YOHANN BRICE NATHANAEL', matricule: '0565438F', district: 'Black Tail Shark', parish: 'BLACK MOLLY' },
    { nom: 'COULIBALY', prenoms: 'CHLOE', matricule: '0592819N', district: 'Black Tail Shark', parish: 'Black Hamlet' },
    { nom: 'AMOUSSOU', prenoms: 'LIFI PAUL YVAN', matricule: '0584801N', district: 'Black Tail Shark', parish: 'Black Hamlet' },
    { nom: 'LEBRI', prenoms: 'MARIE BERTHY', matricule: '0528388O', district: 'Black Tail Shark', parish: 'Black Moray' },
    { nom: 'TCHIMOU', prenoms: 'GUEPIE ABEL MARIE', matricule: '0529414F', district: 'Black Tail Shark', parish: 'BLACK STARFISH' },
    { nom: 'NIOBLE', prenoms: 'NAHOUNOU JEAN-EMMANUEL', matricule: '0532493E', district: 'Black Tail Shark', parish: 'BLACK STARFISH' },
    { nom: 'DADJI', prenoms: 'DANIEL', matricule: '0552958C', district: 'Black Tail Shark', parish: 'BLACK STARFISH' },
    { nom: 'DIALLO', prenoms: 'AMILKA MARIE IMMACULEE', matricule: '0511318C', district: 'Black Tail Shark', parish: 'Black Moray' },
    { nom: 'ANOUMAN', prenoms: 'DANIELLE', matricule: '0511457M', district: 'Black Tail Shark', parish: 'Black Moray' },
    { nom: 'ANOUMAN', prenoms: 'JOELLE', matricule: '0559258U', district: 'Black Tail Shark', parish: 'Black Moray' },
    { nom: 'OPELY', prenoms: 'ELOI JEAN MARIE', matricule: '0515681N', district: 'Black Tail Shark', parish: 'BLACK MOLLY' },
    { nom: 'GBADESSI', prenoms: 'FINAGNON JEAN CLAU', matricule: '0584010N', district: 'Mango Taika', parish: 'LES KORES MOANAS' },
    { nom: 'DJOGBENOU', prenoms: 'HANGUI CHRIST', matricule: '0564683N', district: 'Mango Taika', parish: 'LES KORES MOANAS' },
    { nom: 'KOUASSI', prenoms: 'EMMANUELLA', matricule: '0580982B', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'ASSIDA', prenoms: 'GRACE ELVIRA', matricule: '0556720U', district: 'Mango Taika', parish: 'HAPUU RERU' },
    { nom: 'TIMITE', prenoms: 'GNONSIEKAN PRISCA', matricule: '0599998A', district: 'Mango Taika', parish: 'LES MAKIS' },
    { nom: 'ADJORLOLO', prenoms: 'LY GRACE-CHRISTIANE', matricule: '0517870U', district: 'Mango Taika', parish: 'LES MAKIS' },
    { nom: 'BATY', prenoms: 'ABIGAÏL EVE URIEL', matricule: '0510223Z', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'KOUAKOU', prenoms: 'YVAN JUNIOR', matricule: '0537315W', district: 'Mango Taika', parish: 'LES KORES MOANAS' },
    { nom: 'BRUNO', prenoms: 'MENEHOUAN', matricule: '0561275T', district: 'Mango Taika', parish: 'LES NARWHALS' },
    { nom: 'AMOUDJI', prenoms: 'ASSE BARCHEBA MARIA', matricule: '0563438T', district: 'Mango Taika', parish: 'LES NARWHALS' },
    { nom: 'BAHOU', prenoms: 'NOURA CALVINE', matricule: '0589711O', district: 'Mango Taika', parish: 'LES MAKIS' },
    { nom: 'GBEHI', prenoms: 'LAURA', matricule: '0519400K', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'AHOUA', prenoms: 'ABOUYA WILFRIED', matricule: '0587713R', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'VOLI', prenoms: 'BI IRIE PAUL ELIE YANNICK', matricule: '0518127N', district: 'Mango Taika', parish: 'LES KORES MOANAS' },
    { nom: 'ETTIEN', prenoms: 'PAUL EMMANUEL', matricule: '0587124G', district: 'Mango Taika', parish: 'LES KORES MOANAS' },
    { nom: 'KPOLO', prenoms: 'MARC', matricule: '0566966I', district: 'Mango Taika', parish: 'LES KORES MOANAS' },
    { nom: 'GALA LOU', prenoms: 'HELENA', matricule: '0576872C', district: 'Mango Taika', parish: 'LES KORES MOANAS' },
    { nom: 'BOUADOU', prenoms: 'JOSEPH-MARIE', matricule: '0539077N', district: 'Mango Taika', parish: 'LES KORES MOANAS' },
    { nom: 'KOUAKOU', prenoms: 'CHRIS ARYEL', matricule: '0524646U', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'KOFFI', prenoms: 'NIAMIEN BETTINA', matricule: '0524759H', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'KOUASSI', prenoms: 'ORNELLA GRACE', matricule: '0511866G', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'KOFFI', prenoms: 'HILLARY MARIE AURIANNE DIANE', matricule: '0565537K', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'KACOU', prenoms: 'KOUTOUA ARSÈNE BOSCO', matricule: '0566998V', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'KOUAME', prenoms: 'TYLER', matricule: '0556230J', district: 'Mango Taika', parish: 'LES AMPHIPIRIONS' },
    { nom: 'KOFFI', prenoms: 'ODILE', matricule: '0517020I', district: 'Mango Taika', parish: 'LES KORES MOANAS' },
    { nom: 'BIA', prenoms: 'ZOMANDRE MARIE ANDREA', matricule: '0579810D', district: 'Mango Taika', parish: 'LES KORES MOANAS' },
    { nom: 'KOUADIO', prenoms: 'CHTIS EMMANUEL FIENY', matricule: '0555431G', district: 'Mango Taika', parish: 'LES AIHES' },
    { nom: 'N’ZO', prenoms: 'AMENAN MARIE PRUDENCE', matricule: '0555442R', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'KOUADIO', prenoms: 'CARENE', matricule: '0547937Q', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'BEGNANKY', prenoms: 'HANS', matricule: '0540532R', district: 'Mango Taika', parish: 'HAPUU RERU' },
    { nom: 'TCHECOU', prenoms: 'LYNN MARIE ESLIE', matricule: '0526063E', district: 'Mango Taika', parish: 'HAPUU RERU' },
    { nom: 'SOME', prenoms: 'HELENE', matricule: '0583621I', district: 'Mango Taika', parish: 'HAPUU RERU' },
    { nom: 'ORO', prenoms: 'LYSIE', matricule: '0571144R', district: 'Mango Taika', parish: 'HAPUU RERU' },
    { nom: 'LIADY', prenoms: 'OBA AKISSI ANAIS', matricule: '0527724R', district: 'Mango Taika', parish: 'LES AIHES' },
    { nom: 'OUATTARA', prenoms: 'ANDY', matricule: '0569160V', district: 'Mango Taika', parish: 'LES KORES MOANAS' },
    { nom: 'NIGNAN', prenoms: 'CHEICK YVAN LEANDRE', matricule: '0587650M', district: 'Mango Taika', parish: 'LES KORES MOANAS' },
    { nom: 'SIA', prenoms: 'AMÉTCHI  EDÉLÉ BRICE PATRICE', matricule: '0538262A', district: 'Mango Taika', parish: 'LES MAKIS' },
    { nom: 'KONÉ', prenoms: 'GRÂCE', matricule: '0564109O', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'ABOUSSOU', prenoms: 'DOGBO JEAN ERIC EMMANUEL', matricule: '0541771O', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'BANGA', prenoms: 'YANN-EMMANUEL', matricule: '0596401A', district: 'Mango Taika', parish: 'LES NARWHALS' },
    { nom: 'BLEOUE', prenoms: 'MAGNI ANGE OCEANNE', matricule: '0524333X', district: 'Mango Taika', parish: 'LES NARWHALS' },
    { nom: 'KOBO', prenoms: 'ORIANE GLORIA HERVÉE', matricule: '0572382M', district: 'Mango Taika', parish: 'LES NARWHALS' },
    { nom: 'DJEGBA', prenoms: 'EUNICE', matricule: '0518692X', district: 'Mango Taika', parish: 'LES AIHES' },
    { nom: 'BAKAYOKO', prenoms: 'EVE MALIKA NOUR', matricule: '0575380Z', district: 'Mango Taika', parish: 'Equipe de District Mango Taika' },
    { nom: 'TOURE', prenoms: 'HENRI JOEL', matricule: '0566990W', district: 'Mango Taika', parish: 'LES KORES MOANAS' },
    { nom: 'TIA', prenoms: 'MARIE TRYPHENE', matricule: '0555522R', district: 'Mango Taika', parish: 'LES KORES MOANAS' },
    { nom: 'CHAUDRON', prenoms: 'NICHOLAS', matricule: '0586271Y', district: 'Mango Taika', parish: 'LES MAKIS' },
    { nom: 'YAO', prenoms: 'MARIE PAULE OCEANE', matricule: '0523852K', district: 'Mango Taika', parish: 'LES MAKIS' },
    { nom: 'GUIGUI', prenoms: 'LUCE ROXANN JENIFER', matricule: '0529753X', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'AGA', prenoms: 'MARIE STELLA OCEANE', matricule: '0539899D', district: 'Mango Taika', parish: 'LES MAKIS' },
    { nom: 'GUIGUI', prenoms: 'TRESOR', matricule: '0526507Y', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'KOFFI', prenoms: 'KOHOUA MARIE-DANIELLE', matricule: '0583753X', district: 'Mango Taika', parish: 'LES AIHES' },
    { nom: 'DE SOUZA OVIDIO', prenoms: 'GÉNEVIÈVE MERVEILLE', matricule: '0563358W', district: 'Mango Taika', parish: 'LES KORES MOANAS' },
    { nom: 'KOUAME', prenoms: 'JOYCE MARIE ADORATION', matricule: '0524122N', district: 'Mango Taika', parish: 'LES KORES MOANAS' },
    { nom: 'AKPOUE', prenoms: 'ANGE THANO JUNIOR', matricule: '0545558O', district: 'Mango Taika', parish: 'LES MAKIS' },
    { nom: 'KACOU', prenoms: 'KOHOU BORIS ERIC', matricule: '0579671M', district: 'Mango Taika', parish: 'LES MAKIS' },
    { nom: 'GAHIE', prenoms: 'MAELISS NABILA', matricule: '0539975V', district: 'Mango Taika', parish: 'LES MAKIS' },
    { nom: 'FIERROU', prenoms: 'BIGNON', matricule: '0517272I', district: 'Mango Taika', parish: 'LES AIHES' },
    { nom: 'ABISSA', prenoms: 'TAMIA CLAUDE MORELL', matricule: '0586552V', district: 'Mango Taika', parish: 'LES AIHES' },
    { nom: 'KOUAME', prenoms: 'JEAN-EPHRAIM', matricule: '0553538O', district: 'Mango Taika', parish: 'LES AIHES' },
    { nom: 'KOFFI', prenoms: 'ADJO OCEANE FLORENCE', matricule: '0558313M', district: 'Mango Taika', parish: 'LES AIHES' },
    { nom: 'KONAN', prenoms: 'AKISSI OLGA', matricule: '0542755S', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'KOFFI', prenoms: 'JACQUES', matricule: '0519712L', district: 'Mango Taika', parish: 'LES AIHES' },
    { nom: 'N’GUETTA', prenoms: 'HAYDEN', matricule: '0587596G', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'N\'DRI', prenoms: 'ELYSEE-AUREL', matricule: '0587697J', district: 'Mango Taika', parish: 'LES AIHES' },
    { nom: 'DJISSOU', prenoms: 'CLAUDIA-GRACE MARIE-EMMANUELLA', matricule: '0557002Y', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'BOUOH', prenoms: 'KOUAME DARIUS', matricule: '0585221I', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'TRAORE', prenoms: 'MARIE CELINE EMMANUELLA', matricule: '0581750P', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'KOFFI', prenoms: 'ADJINA GRACE ELOI', matricule: '0549171Q', district: 'Mango Taika', parish: 'LES KORES MOANAS' },
    { nom: 'KOUASSI', prenoms: 'ARON ESLY', matricule: '0570030O', district: 'Mango Taika', parish: 'LES NARWHALS' },
    { nom: 'KOUAMÉ', prenoms: 'MARYSE SOPHIA', matricule: '0576881D', district: 'Mango Taika', parish: 'LES NARWHALS' },
    { nom: 'EBROTTIE', prenoms: 'GEORGES AMA NORALYNE KYRIELLE', matricule: '0580265O', district: 'Mango Taika', parish: 'LES NARWHALS' },
    { nom: 'SORO', prenoms: 'DORIS', matricule: '0526758M', district: 'Mango Taika', parish: 'LES NARWHALS' },
    { nom: 'ZOGROU', prenoms: 'ROLO JESSICA ROSALYNE', matricule: '0590656A', district: 'Mango Taika', parish: 'LES NARWHALS' },
    { nom: 'MENSAH', prenoms: 'LASSEY PIERRE IVAN', matricule: '0568536M', district: 'Mango Taika', parish: 'LES NARWHALS' },
    { nom: 'KONAN', prenoms: 'AKISSI GRACE ELODIE', matricule: '0519779Z', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'GABO', prenoms: 'MICHEL', matricule: '0566252U', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'MENEY', prenoms: 'ANNABELLE', matricule: '0597752X', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'BOYA', prenoms: 'MARIE VICTOIRE', matricule: '0568705R', district: 'Mango Taika', parish: 'LES TOHORAS' },
    { nom: 'KOUASSI', prenoms: 'KOUAMÉ PHILIPPE', matricule: '0532991R', district: 'Requin à Pointe Blanche', parish: 'PIEUVRE BLANCHE' },
    { nom: 'OURA', prenoms: 'CHRIST', matricule: '0529328S', district: 'Requin à Pointe Blanche', parish: 'PIEUVRE BLANCHE' },
    { nom: 'KOUA', prenoms: 'KOFFI AUGUST', matricule: '0566052G', district: 'Requin à Pointe Blanche', parish: 'PIEUVRE BLANCHE' },
    { nom: 'LASSISSI', prenoms: 'KOUASSI SHAB', matricule: '0550123T', district: 'Requin à Pointe Blanche', parish: 'PIEUVRE BLANCHE' },
    { nom: 'GAHO', prenoms: 'AUBELLE', matricule: '0545092H', district: 'Requin à Pointe Blanche', parish: 'TORTUE BLANCHE' },
    { nom: 'N GUESSAN', prenoms: 'KONAN FREDERIC', matricule: '0591486G', district: 'Requin à Pointe Blanche', parish: 'TORTUE BLANCHE' },
    { nom: 'KOUADIO', prenoms: 'KOUASSI DAVID', matricule: '0599204P', district: 'Requin à Pointe Blanche', parish: 'STERNE BLANCHE' },
    { nom: 'KONE', prenoms: 'KATY SAMIRA OCTAVIE', matricule: '0588556D', district: 'Requin à Pointe Blanche', parish: 'OTARIE BLANCHE' },
    { nom: 'KOUAME', prenoms: 'DESNOS CARINA', matricule: '0525355W', district: 'Requin à Pointe Blanche', parish: 'OTARIE BLANCHE' },
    { nom: 'BOTINISSOGO', prenoms: 'ADJA TENIN BIENVENUE', matricule: '0570411C', district: 'Requin à Pointe Blanche', parish: 'STERNE BLANCHE' },
    { nom: 'KABORE', prenoms: 'MARGUERITE', matricule: '0528111J', district: 'Requin à Pointe Blanche', parish: 'TORTUE BLANCHE' },
    { nom: 'YAPO', prenoms: 'DIANE WILFRIED', matricule: '0510302O', district: 'Requin à Pointe Blanche', parish: 'TORTUE BLANCHE' },
    { nom: 'COULIBALY', prenoms: 'ZANA', matricule: '0521064A', district: 'Requin à Pointe Blanche', parish: 'TORTUE BLANCHE' },
    { nom: 'KOKO', prenoms: 'GRÂCE CHRISTELLE', matricule: '0592082D', district: 'Requin à Pointe Blanche', parish: 'PIEUVRE BLANCHE' },
    { nom: 'YAPO', prenoms: 'YAPO ANGE MONDESIR', matricule: '0525222Z', district: 'Requin à Pointe Blanche', parish: 'STERNE BLANCHE' },
    { nom: 'KOBENAN', prenoms: 'MARIE VICTOIRE DANIELLE', matricule: '0515397G', district: 'Requin à Pointe Blanche', parish: 'PIEUVRE BLANCHE' },
    { nom: 'N\'GUESSAN', prenoms: 'OLIVIER', matricule: '0547753K', district: 'Requin à Pointe Blanche', parish: 'PIEUVRE BLANCHE' },
    { nom: 'ZAMBIE', prenoms: 'LARISSA SANDRINE', matricule: '0574032G', district: 'Requin à Pointe Blanche', parish: 'PIEUVRE BLANCHE' },
    { nom: 'KREME', prenoms: 'KOUAMÉ THIERRY', matricule: '0541381L', district: 'Requin à Pointe Blanche', parish: 'OTARIE BLANCHE' },
    { nom: 'YAPI', prenoms: 'CHIASSY MARYSE EMMANUELLA', matricule: '0555097T', district: 'Requin à Pointe Blanche', parish: 'OTARIE BLANCHE' },
    { nom: 'KOFFI', prenoms: 'ATTA SÉBASTIEN', matricule: '0582112P', district: 'Requin à Pointe Blanche', parish: 'OTARIE BLANCHE' },
    { nom: 'DIÉ', prenoms: 'BERASSOU KARL WILLIAMS', matricule: '0512192Z', district: 'Requin à Pointe Blanche', parish: 'OTARIE BLANCHE' },
    { nom: 'YAO', prenoms: 'N\'GUESSAN AKISSI AUDE', matricule: '0581505G', district: 'Requin à Pointe Blanche', parish: 'OTARIE BLANCHE' },
    { nom: 'GANIYU', prenoms: 'LATIFA', matricule: '0596375P', district: 'Requin à Pointe Blanche', parish: 'OTARIE BLANCHE' },
    { nom: 'ANGBOMAN', prenoms: 'PAUL ALAIN', matricule: '0594355P', district: 'Requin à Pointe Blanche', parish: 'OTARIE BLANCHE' },
    { nom: 'ADINGRA', prenoms: 'AFFOUE BEATRICE', matricule: '0567975W', district: 'Requin à Pointe Blanche', parish: 'STERNE BLANCHE' },
    { nom: 'ADOUKONOU', prenoms: 'ALAIN JEAN-EUDES', matricule: '0514065H', district: 'Requin à Pointe Blanche', parish: 'STERNE BLANCHE' },
    { nom: 'SESSOU', prenoms: 'ANGE', matricule: '0573080X', district: 'Requin à Pointe Blanche', parish: 'OTARIE BLANCHE' },
    { nom: 'YAPI', prenoms: 'EUDES', matricule: '0576907E', district: 'Requin à Pointe Blanche', parish: 'STERNE BLANCHE' },
    { nom: 'LOUA', prenoms: 'FROMO DANIEL', matricule: '0526190N', district: 'Requin à Pointe Blanche', parish: 'RAIE BLANCHE' },
    { nom: 'ATSE', prenoms: 'JANEL', matricule: '0539926C', district: 'Requin à Pointe Blanche', parish: 'TORTUE BLANCHE' },
    { nom: 'DAO', prenoms: 'ANGE NELLY ORNELLA', matricule: '0570470P', district: 'Requin à Pointe Blanche', parish: 'TORTUE BLANCHE' },
    { nom: 'N\'ZEBO', prenoms: 'BAFFA MARIE ORNELA', matricule: '0555225N', district: 'Requin à Pointe Blanche', parish: 'STERNE BLANCHE' },
    { nom: 'KOUAME', prenoms: 'AFFOUA SANDRINE', matricule: '0531812E', district: 'Requin à Pointe Blanche', parish: 'OTARIE BLANCHE' },
    { nom: 'N\'DIY', prenoms: 'KONAN PASCAL', matricule: '0564284Y', district: 'Requin à Pointe Blanche', parish: 'OTARIE BLANCHE' },
    { nom: 'KOUA', prenoms: 'N\'GUESSAN EPIPHANIE', matricule: '0526194K', district: 'Requin à Pointe Blanche', parish: 'STERNE BLANCHE' },
    { nom: 'N\'ZI', prenoms: 'YAO MARC', matricule: '0564527B', district: 'Requin à Pointe Blanche', parish: 'STERNE BLANCHE' },
    { nom: 'ASSI', prenoms: 'HERMANCE', matricule: '0553381Y', district: 'Requin à Pointe Blanche', parish: 'STERNE BLANCHE' },
    { nom: 'YAO', prenoms: 'N\'GUESSAN AMANDINE', matricule: '0582185P', district: 'Requin à Pointe Blanche', parish: 'STERNE BLANCHE' },
    { nom: 'FIOKLOU', prenoms: 'HUBERT', matricule: '0582822A', district: 'Requin à Pointe Blanche', parish: 'STERNE BLANCHE' },
    { nom: 'SIKA', prenoms: 'KAKOU STEEVE MIGUEL', matricule: '0549136S', district: 'Requin à Pointe Blanche', parish: 'TORTUE BLANCHE' },
    { nom: 'KPANGNI', prenoms: 'ANDOUA ANDREA', matricule: '0576486W', district: 'Requin à Pointe Blanche', parish: 'TORTUE BLANCHE' },
    { nom: 'EKOUMAN', prenoms: 'KACOU FRED', matricule: '0513428J', district: 'Requin à Pointe Blanche', parish: 'TORTUE BLANCHE' },
    { nom: 'ACHI', prenoms: 'CHADON', matricule: '0589821R', district: 'Requin à Pointe Blanche', parish: 'TORTUE BLANCHE' },
    { nom: 'FLAN', prenoms: 'SIMON ELISE', matricule: '0538964K', district: 'Requin à Pointe Blanche', parish: 'TORTUE BLANCHE' },
    { nom: 'YAPI', prenoms: 'EMMANUEL', matricule: '0546011Z', district: 'Requin à Pointe Blanche', parish: 'TORTUE BLANCHE' },
    { nom: 'GOBA', prenoms: 'EMMANUEL', matricule: '0573650V', district: 'Requin à Pointe Blanche', parish: 'RAIE BLANCHE' },
    { nom: 'SEREY', prenoms: 'AWADE DENISE', matricule: '0565211P', district: 'Requin à Pointe Blanche', parish: 'RAIE BLANCHE' },
    { nom: 'EKIAN', prenoms: 'KABLAN RICHARD EVRARD', matricule: '0598559H', district: 'Requin à Pointe Blanche', parish: 'STERNE BLANCHE' },
    { nom: 'SIALLOU', prenoms: 'MAUREL', matricule: '0534942P', district: 'Requin à Pointe Blanche', parish: 'OTARIE BLANCHE' },
    { nom: 'OYOU', prenoms: 'EVELYNE', matricule: '0510829P', district: 'Requin à Pointe Blanche', parish: 'OTARIE BLANCHE' },
    { nom: 'YEO', prenoms: 'CHIGATA', matricule: '0569129Q', district: 'Requin à Pointe Blanche', parish: 'OTARIE BLANCHE' },
    { nom: 'KONAN', prenoms: 'KOUADIO FRANCK', matricule: '0555057X', district: 'Requin à Pointe Blanche', parish: 'TORTUE BLANCHE' },
    { nom: 'OGOUA', prenoms: 'JEANNICE DAVILLA', matricule: '0547239U', district: 'Requin à Pointe Blanche', parish: 'TORTUE BLANCHE' },
    { nom: 'HIE', prenoms: 'HINO EMERY', matricule: '0577674E', district: 'Requin à Pointe Blanche', parish: 'Equipe de District Requin à Pointe Blanche' },
    { nom: 'KOUMAN', prenoms: 'KOUASSI JEAN DE DIEU', matricule: '0533180D', district: 'Requin à Pointe Blanche', parish: 'STERNE BLANCHE' },
    { nom: 'ARRA', prenoms: 'N\'GBESSO ANGE MICHEL', matricule: '0574255K', district: 'Requin à Pointe Blanche', parish: 'PIEUVRE BLANCHE' },
    { nom: 'KOFFI', prenoms: 'KONAN JEAN EMMANUEL', matricule: '0594141M', district: 'Requin à Pointe Noire', parish: 'LES POISSONS CHATS' },
    { nom: 'N\'DRON', prenoms: 'KOFFI JULES HUBERTSON', matricule: '0574163K', district: 'Requin à Pointe Noire', parish: 'Les Etoiles de Mer' },
    { nom: 'ATTENLEY', prenoms: 'KOUAME BIENVENUE', matricule: '0543234J', district: 'Requin à Pointe Noire', parish: 'LES HYPPOCAMPES' },
    { nom: 'YAO', prenoms: 'MONOGBA ERICA MURIELLE', matricule: '0550350W', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'ETTIEN', prenoms: 'AHOU FLORA YASMINE ASHLEY', matricule: '0570015H', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'KOFFI', prenoms: 'KONAN JEAN EMMANUEL', matricule: '0546167Z', district: 'Requin à Pointe Noire', parish: 'LES POISSONS CHATS' },
    { nom: 'GNAMIEN', prenoms: 'BECANTY AYA OREAL', matricule: '0541180L', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'DIDI', prenoms: 'ORLANE HENRY JOËLLE', matricule: '0521997X', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'GUI', prenoms: 'EMMANUELLA EXCELLE JOSEPH', matricule: '0548527O', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'YAO', prenoms: 'ANGE EMMANUEL', matricule: '0517440U', district: 'Requin à Pointe Noire', parish: 'Les Etoiles de Mer' },
    { nom: 'N’GUESSAN', prenoms: 'NOELLIE', matricule: '0540208F', district: 'Requin à Pointe Noire', parish: 'Les Etoiles de Mer' },
    { nom: 'BOKA', prenoms: 'NARCISSE', matricule: '0595023E', district: 'Requin à Pointe Noire', parish: 'Les Etoiles de Mer' },
    { nom: 'ADJI', prenoms: 'AHOLIA WILFRIED CHEREL', matricule: '0594404Q', district: 'Requin à Pointe Noire', parish: 'LES POISSONS CHATS' },
    { nom: 'KAMBIRE', prenoms: 'ANGE MARIE', matricule: '0558348P', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'YEBOUE', prenoms: 'FAMISSO ANGE MICHEL', matricule: '0586108C', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'YAO', prenoms: 'ELISEE MARIE ANGE', matricule: '0577989Y', district: 'Requin à Pointe Noire', parish: 'Les Etoiles de Mer' },
    { nom: 'DATTE', prenoms: 'YASMIN', matricule: '0526951C', district: 'Requin à Pointe Noire', parish: 'Les Etoiles de Mer' },
    { nom: 'ASSI', prenoms: 'MAEVA', matricule: '0539785R', district: 'Requin à Pointe Noire', parish: 'LES HYPPOCAMPES' },
    { nom: 'KOUAME', prenoms: 'KOUADIO JEAN YANNICK', matricule: '0591082D', district: 'Requin à Pointe Noire', parish: 'Les Etoiles de Mer' },
    { nom: 'KOFFI', prenoms: 'YAO MARIUS', matricule: '0576708A', district: 'Requin à Pointe Noire', parish: 'Les Etoiles de Mer' },
    { nom: 'KOUASSI', prenoms: 'N\'GOUAN CYRILLE', matricule: '0573037H', district: 'Requin à Pointe Noire', parish: 'Les Etoiles de Mer' },
    { nom: 'NOGBOU', prenoms: 'GUY ELOGE', matricule: '0517230S', district: 'Requin à Pointe Noire', parish: 'Les Etoiles de Mer' },
    { nom: 'AGNESS', prenoms: 'ESSAIS MECHACK', matricule: '0592119F', district: 'Requin à Pointe Noire', parish: 'Les Etoiles de Mer' },
    { nom: 'KOUADIO', prenoms: 'WILFRIED', matricule: '0544633E', district: 'Requin à Pointe Noire', parish: 'Les Etoiles de Mer' },
    { nom: 'ANGOH', prenoms: 'BASILE', matricule: '0599847Y', district: 'Requin à Pointe Noire', parish: 'Les Etoiles de Mer' },
    { nom: 'KOUAME', prenoms: 'MOAE ANGE CHRISTALINE', matricule: '0568497L', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'BEDIA', prenoms: 'KASSI ANGE', matricule: '0599624H', district: 'Requin à Pointe Noire', parish: 'LES PIRANHAS TACHETÉS' },
    { nom: 'ABBÉ', prenoms: 'FABRICE ELISEE', matricule: '0552932A', district: 'Requin à Pointe Noire', parish: 'LES PIRANHAS TACHETÉS' },
    { nom: 'YAO', prenoms: 'GRACE EUNICE JESICA', matricule: '0539869Y', district: 'Requin à Pointe Noire', parish: 'LES POISSONS CHATS' },
    { nom: 'YAPO', prenoms: 'DAHO CHRISTIAN', matricule: '0514136S', district: 'Requin à Pointe Noire', parish: 'LES POISSONS CHATS' },
    { nom: 'KOUAKOU', prenoms: 'CHRYS MOREL', matricule: '0526220H', district: 'Requin à Pointe Noire', parish: 'LES POISSONS CHATS' },
    { nom: 'DJAKEY', prenoms: 'KOFFI CHRISTIAN TRÉSOR', matricule: '0556856D', district: 'Requin à Pointe Noire', parish: 'Les Etoiles de Mer' },
    { nom: 'YAO', prenoms: 'AKISSI CHRISTIANE', matricule: '0533825H', district: 'Requin à Pointe Noire', parish: 'LES POISSONS CHATS' },
    { nom: 'KANTE', prenoms: 'N\'DOU GRÂCEDIANE CHARLOTTE', matricule: '0587565J', district: 'Requin à Pointe Noire', parish: 'Les Etoiles de Mer' },
    { nom: 'ASSAMOI', prenoms: 'TANOI CHRISTIANA', matricule: '0536747T', district: 'Requin à Pointe Noire', parish: 'LES PIRANHAS TACHETÉS' },
    { nom: 'N\'GPOTY', prenoms: 'CHRYS EMMANUEL', matricule: '0558961J', district: 'Requin à Pointe Noire', parish: 'LES POISSONS CHATS' },
    { nom: 'AKOU', prenoms: 'NANDJUI JEAN CHRIST', matricule: '0547949F', district: 'Requin à Pointe Noire', parish: 'LES POISSONS CHATS' },
    { nom: 'GBA', prenoms: 'MARIE EMMANUELA', matricule: '0526701G', district: 'Requin à Pointe Noire', parish: 'LES HYPPOCAMPES' },
    { nom: 'YAO', prenoms: 'ELVIRE FABIOLA', matricule: '0514189R', district: 'Requin à Pointe Noire', parish: 'LES HYPPOCAMPES' },
    { nom: 'KOMENAN', prenoms: 'BORIS DELORS', matricule: '0556318T', district: 'Requin à Pointe Noire', parish: 'LES POISSONS CHATS' },
    { nom: 'BAMA', prenoms: 'CREPIN BIENVENUE', matricule: '0563039Q', district: 'Requin à Pointe Noire', parish: 'LES HYPPOCAMPES' },
    { nom: 'DJI', prenoms: 'ANGE KEVINE', matricule: '0583999T', district: 'Requin à Pointe Noire', parish: 'LES HYPPOCAMPES' },
    { nom: 'N\'GBESSO', prenoms: 'JEAN MARIE HERVE', matricule: '0585481E', district: 'Requin à Pointe Noire', parish: 'LES HYPPOCAMPES' },
    { nom: 'KAMENAN', prenoms: 'SANHOU RODRIGUE', matricule: '0547632Q', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'ABLO', prenoms: 'SOSTHENE', matricule: '0580581L', district: 'Requin à Pointe Noire', parish: 'LES PIRANHAS TACHETÉS' },
    { nom: 'KOMELAND', prenoms: 'KAENEE RAPHAELINE', matricule: '0514402I', district: 'Requin à Pointe Noire', parish: 'LES PIRANHAS TACHETÉS' },
    { nom: 'TIEMELE', prenoms: 'BONI JEAN', matricule: '0523027B', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'OUATTARA', prenoms: 'PETAWAGNAN ELIE', matricule: '0569167F', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'KOUASSI', prenoms: 'DORIANE EMMANUELLA', matricule: '0570386Z', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'YAO', prenoms: 'AMOIN ANGE EMMANUELLA', matricule: '0593771Y', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'LOUKOU', prenoms: 'YAO TYCHIQUE FABRICE', matricule: '0533024I', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'BROU', prenoms: 'JEAN JAURES', matricule: '0513795I', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'EKISSI', prenoms: 'ORIA FABIEN', matricule: '0523404X', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'KOUAKOU', prenoms: 'AURELIE', matricule: '0580344J', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'YAO', prenoms: 'AYA MARIE PAUL', matricule: '0518833W', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'MOKLY', prenoms: 'DAVID', matricule: '0543213X', district: 'Requin à Pointe Noire', parish: 'LES POISSONS CHATS' },
    { nom: 'KOUASSI', prenoms: 'AFOFIE MAIMOUNA ROSE', matricule: '0538036U', district: 'Requin à Pointe Noire', parish: 'LES POISSONS CHATS' },
    { nom: 'SANA', prenoms: 'RAMATA', matricule: '0515041L', district: 'Requin à Pointe Noire', parish: 'LES POISSONS CHATS' },
    { nom: 'AGRE', prenoms: 'ANOUMON DORIANE OLIVIA', matricule: '0576933X', district: 'Requin à Pointe Noire', parish: 'LES POISSONS CHATS' },
    { nom: 'AKOSSI', prenoms: 'CYTHIA', matricule: '0531643S', district: 'Requin à Pointe Noire', parish: 'LES POISSONS CHATS' },
    { nom: 'YAO', prenoms: 'ABBÉ SYLVAIN DÉSIRÉE', matricule: '0541404D', district: 'Requin à Pointe Noire', parish: 'LES POISSONS CHATS' },
    { nom: 'NIANGORAN', prenoms: 'KOUASSI RODEL', matricule: '0634723T', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'KOFFII', prenoms: 'JEAN CHRIST', matricule: '0544049E', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'MAMBA', prenoms: 'CYRILLE', matricule: '0571776V', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'KOUAME', prenoms: 'LOKA ROBERSPIERRE', matricule: '0526272X', district: 'Requin à Pointe Noire', parish: 'LES RAIES MANTAS' },
    { nom: 'KRA', prenoms: 'KOUADIO', matricule: '0560990A', district: 'Requin à Pointe Noire', parish: 'Les Etoiles de Mer' },
    { nom: 'KOUTOUAN', prenoms: 'NANTCHO FELIX JUNIOR GEDEON', matricule: '0559386K', district: 'Requin Baleine', parish: 'LES JUBARTES' },
    { nom: 'EHI', prenoms: 'AHOLI PAUL WILFRIED', matricule: '0551416I', district: 'Requin Baleine', parish: 'LES WHALES' },
    { nom: 'KLENAN', prenoms: 'JEAN ÉPIPHANE', matricule: '0541300C', district: 'Requin Baleine', parish: 'LES CACHALOTS' },
    { nom: 'ASSAMOI', prenoms: 'JAURÈS', matricule: '0599434I', district: 'Requin Baleine', parish: 'LES CACHALOTS' },
    { nom: 'SEHOUNHOUEDO', prenoms: 'HILAIRE JEAN EUDES', matricule: '0566854R', district: 'Requin Baleine', parish: 'LES MYSTICETTES' },
    { nom: 'KRAMO', prenoms: 'ISRAEL EMMANUEL', matricule: '0521394G', district: 'Requin Baleine', parish: 'LES CACHALOTS' },
    { nom: 'ADOU', prenoms: 'GRÂCE EMMANUELA', matricule: '0587843C', district: 'Requin Baleine', parish: 'LES RORQUALS' },
    { nom: 'AGNISSAN', prenoms: 'LOIS PAUL DAVID', matricule: '0559283D', district: 'Requin Baleine', parish: 'LES CACHALOTS' },
    { nom: 'GUEHI', prenoms: 'INAGBE ULRICH IVAN', matricule: '0551206T', district: 'Requin Baleine', parish: 'LES CACHALOTS' },
    { nom: 'LATHRO', prenoms: 'YOWELLE MARIE GAELLE', matricule: '0527366Z', district: 'Requin Baleine', parish: 'LES NARVALS' },
    { nom: 'GORAN', prenoms: 'TIGORI URIEL', matricule: '0551549N', district: 'Requin Baleine', parish: 'LES NARVALS' },
    { nom: 'N\'GOUMISSA', prenoms: 'KOFFI AYA MARIE ANGE STELLA', matricule: '0556596G', district: 'Requin Baleine', parish: 'LES NARVALS' },
    { nom: 'APKI', prenoms: 'DAVID YOAN', matricule: '0561235I', district: 'Requin Baleine', parish: 'LES CACHALOTS' },
    { nom: 'YAPI', prenoms: 'DESIRE YVES', matricule: '0546004A', district: 'Requin Baleine', parish: 'LES CACHALOTS' },
    { nom: 'DJEDJI', prenoms: 'JEAN MERCKUS', matricule: '0530690J', district: 'Requin Baleine', parish: 'LES RORQUALS' },
    { nom: 'SEKONGO', prenoms: 'JEAN CEDRIC', matricule: '0567549T', district: 'Requin Baleine', parish: 'LES RORQUALS' },
    { nom: 'YAPO', prenoms: 'YOHANN AXEL', matricule: '0589013Y', district: 'Requin Baleine', parish: 'LES RORQUALS' },
    { nom: 'TIEBY', prenoms: 'CEDRIC DANIEL', matricule: '0534279J', district: 'Requin Baleine', parish: 'LES RORQUALS' },
    { nom: 'ADOU', prenoms: 'KOUAKOU STEVE ULRICH', matricule: '0566765Y', district: 'Requin Baleine', parish: 'LES JUBARTES' },
    { nom: 'KOUAME', prenoms: 'CELIA YASMINE MARIE PRUNELLE', matricule: '0566213C', district: 'Requin Baleine', parish: 'LES NARVALS' },
    { nom: 'YAO', prenoms: 'CHRIST ADEM', matricule: '0527578V', district: 'Requin Baleine', parish: 'LES RORQUALS' },
    { nom: 'DJE', prenoms: 'GUY DOMINIQUE ROGER JUNIOR', matricule: '0576865R', district: 'Requin Baleine', parish: 'LES BELUGAS' },
    { nom: 'SEKA', prenoms: 'YAPO ROMUALD', matricule: '0598357Z', district: 'Requin Baleine', parish: 'LES MYSTICETTES' },
    { nom: 'BINI', prenoms: 'FIENI GRÂCE EMMANUELLA', matricule: '0539440H', district: 'Requin Baleine', parish: 'LES NARVALS' },
    { nom: 'GODEHI', prenoms: 'OLIVIA', matricule: '0531253G', district: 'Requin Baleine', parish: 'LES JUBARTES' },
    { nom: 'DJEBY', prenoms: 'CLAUDE PETUEL', matricule: '0555845S', district: 'Requin Baleine', parish: 'LES BELUGAS' },
    { nom: 'KAMBIRE', prenoms: 'TILARE MOHAMED', matricule: '0575175T', district: 'Requin Baleine', parish: 'LES BELUGAS' },
    { nom: 'SEROU', prenoms: 'LESLIE VICTOIRE', matricule: '0565999C', district: 'Requin Baleine', parish: 'LES BELUGAS' },
    { nom: 'N’GUESSAN', prenoms: 'AMA ANNE OLIVE', matricule: '0555357B', district: 'Requin Baleine', parish: 'LES BELUGAS' },
    { nom: 'ACQUET', prenoms: 'FLEURE NADINE', matricule: '0520842T', district: 'Requin Baleine', parish: 'LES NARVALS' },
    { nom: 'TUO', prenoms: 'YVETTE', matricule: '0530748I', district: 'Requin Baleine', parish: 'LES CACHALOTS' },
    { nom: 'ZAHUI', prenoms: 'MARC-AURELE EMMANUEL', matricule: '0588784N', district: 'Requin Baleine', parish: 'LES CACHALOTS' },
    { nom: 'YABRÉ', prenoms: 'KARINE', matricule: '0567013W', district: 'Requin Baleine', parish: 'LES CACHALOTS' },
    { nom: 'KOULA', prenoms: 'LOUISETTE MARIE-ROSAIRE', matricule: '0511534O', district: 'Requin Baleine', parish: 'LES NARVALS' },
    { nom: 'N\'KODIA', prenoms: 'IZA', matricule: '0564903P', district: 'Requin Baleine', parish: 'LES CACHALOTS' },
    { nom: 'YAPO', prenoms: 'ROXANE EMMANUELLE', matricule: '0538467Y', district: 'Requin Baleine', parish: 'LES NARVALS' },
    { nom: 'DOUÉ', prenoms: 'ADJOUA MARIE PRÉCIEUSE', matricule: '0556575O', district: 'Requin Baleine', parish: 'LES NARVALS' },
    { nom: 'KOUASSI', prenoms: 'MARIE-LUMÉNA', matricule: '0589364F', district: 'Requin Baleine', parish: 'LES CACHALOTS' },
    { nom: 'KOIZAN', prenoms: 'GRÂCE MARIE', matricule: '0549476B', district: 'Requin Baleine', parish: 'LES CACHALOTS' },
    { nom: 'GUIPIÉ', prenoms: 'GNONLEBA GUY EMMANUEL', matricule: '0555220B', district: 'Requin Baleine', parish: 'LES CACHALOTS' },
    { nom: 'ZANZE', prenoms: 'BORIS', matricule: '0529265Y', district: 'Requin Baleine', parish: 'LES JUBARTES' },
    { nom: 'KONAN', prenoms: 'AMIHA DESIRE', matricule: '0593310Q', district: 'Requin Baleine', parish: 'LES BELUGAS' },
    { nom: 'KUYO', prenoms: 'TEA MARIE DJOLO', matricule: '0599072G', district: 'Requin Baleine', parish: 'LES NARVALS' },
    { nom: 'ANGOH', prenoms: 'JOAN ALEXIA', matricule: '0579662B', district: 'Requin Baleine', parish: 'LES WHALES' },
    { nom: 'FIENDI', prenoms: 'MORREL EMMANUEL', matricule: '0564243L', district: 'Requin Baleine', parish: 'LES CACHALOTS' },
    { nom: 'ASSI', prenoms: 'MARYLINE', matricule: '0561651P', district: 'Requin Baleine', parish: 'LES CACHALOTS' },
    { nom: 'GNAORE', prenoms: 'LIONEL ELIE JOËL', matricule: '0597482S', district: 'Requin Baleine', parish: 'LES BELUGAS' },
    { nom: 'KOUAKOU', prenoms: 'LUC REGIS', matricule: '0523008O', district: 'Requin Baleine', parish: 'LES NARVALS' },
    { nom: 'OUATTARA', prenoms: 'YOUNOUSS ABRAHAM', matricule: '0543058O', district: 'Requin Baleine', parish: 'LES CACHALOTS' },
    { nom: 'YE', prenoms: 'ARMEL CHRIS EMMANUEL', matricule: '0543600N', district: 'Requin Baleine', parish: 'LES MYSTICETTES' },
    { nom: 'KOUADIO', prenoms: 'YEBOUA YVAN', matricule: '0521150D', district: 'Requin Baleine', parish: 'LES MYSTICETTES' },
    { nom: 'YAO', prenoms: 'KOFFI JEAN MORELL', matricule: '0522269J', district: 'Requin Baleine', parish: 'LES MYSTICETTES' },
    { nom: 'TRAORE', prenoms: 'GERMAINE', matricule: '0598178M', district: 'Requin Baleine', parish: 'LES JUBARTES' },
    { nom: 'N’DRI', prenoms: 'AHOU HERLINE AUDREY', matricule: '0588284Q', district: 'Requin Baleine', parish: 'LES RORQUALS' },
    { nom: 'KOUADIO', prenoms: 'BENEDICTE LEONIE', matricule: '0590771Q', district: 'Requin Baleine', parish: 'LES RORQUALS' },
    { nom: 'TANO', prenoms: 'KOUAKOU PAUL EMMAN', matricule: '0517910O', district: 'Requin Baleine', parish: 'LES RORQUALS' },
    { nom: 'KANGA', prenoms: 'AKOUASSI REINE OLGA', matricule: '0522242H', district: 'Requin Baleine', parish: 'LES RORQUALS' },
    { nom: 'TIENÉ', prenoms: 'FATOU PHALLONE', matricule: '0589353O', district: 'Requin Baleine', parish: 'LES RORQUALS' },
    { nom: 'BOGUIFO', prenoms: 'JOSEPH MARCEL', matricule: '0525819Z', district: 'Requin Baleine', parish: 'LES MYSTICETTES' },
    { nom: 'KOUTOU', prenoms: 'EBA MARIE ANGE-ELLA', matricule: '0512398X', district: 'Requin Baleine', parish: 'LES MYSTICETTES' },
    { nom: 'GBOKO', prenoms: 'AFFIA HOUNTO MARIE PASCALE', matricule: '0583354M', district: 'Requin Baleine', parish: 'LES MYSTICETTES' },
    { nom: 'LIALI', prenoms: 'ZAOULI MARIE-PASCALE MORELLE', matricule: '0563328D', district: 'Requin Baleine', parish: 'LES WHALES' },
    { nom: 'BOHUI', prenoms: 'MARDOCHÉE', matricule: '0528053U', district: 'Requin Baleine', parish: 'LES WHALES' },
    { nom: 'EBLIN', prenoms: 'CLARENCE', matricule: '0510280G', district: 'Requin Baleine', parish: 'LES BELUGAS' },
    { nom: 'SYLLA', prenoms: 'CHRIST', matricule: '0592665N', district: 'Requin Baleine', parish: 'LES BELUGAS' },
    { nom: 'KOFFI', prenoms: 'N’GUESSAN CHRIS MARIE PAULE', matricule: '0518492C', district: 'Requin Baleine', parish: 'LES NARVALS' },
    { nom: 'KOUADIO', prenoms: 'YASMINE', matricule: '0543781Y', district: 'Requin Baleine', parish: 'LES CACHALOTS' },
    { nom: 'SECKA', prenoms: 'ACHOU CHRIST KIROUANE', matricule: '0541820H', district: 'Requin Baleine', parish: 'LES JUBARTES' },
    { nom: 'AOUELI', prenoms: 'RUTH EMMANUELLA', matricule: '0530094Z', district: 'Requin Baleine', parish: 'LES JUBARTES' },
    { nom: 'SAMBOLY', prenoms: 'GRÂCE EMMANUELLA', matricule: '0580240S', district: 'Requin Baleine', parish: 'LES JUBARTES' },
    { nom: 'YAO', prenoms: 'KOUASSI BIENVENUE EMMANUEL', matricule: '0565638Z', district: 'Requin Baleine', parish: 'LES JUBARTES' },
    { nom: 'N\'ZE', prenoms: 'AYA ELVIRA TIFFANY', matricule: '0550470Y', district: 'Requin Baleine', parish: 'LES JUBARTES' },
    { nom: 'BADO', prenoms: 'DIANE AIMÉE', matricule: '0583504M', district: 'Requin Baleine', parish: 'LES JUBARTES' },
    { nom: 'BIENGUY', prenoms: 'DJEYA GRÂCE VIVIANE', matricule: '0523764Q', district: 'Requin Baleine', parish: 'LES JUBARTES' },
    { nom: 'BIENGUY', prenoms: 'ASSORO RÉGINA VALÉRIE', matricule: '0559622V', district: 'Requin Baleine', parish: 'LES JUBARTES' },
    { nom: 'KOUADIO', prenoms: 'FLORENTINE', matricule: '0511542B', district: 'Requin Baleine', parish: 'LES MYSTICETTES' },
    { nom: 'N\'CHO', prenoms: 'HUA CHRISTINE ELÉONORE', matricule: '0598356Z', district: 'Requin Baleine', parish: 'LES MYSTICETTES' },
    { nom: 'BLE', prenoms: 'GROGUHÉ JEAN CÉDRIC', matricule: '0593326N', district: 'Requin Baleine', parish: 'LES MYSTICETTES' },
    { nom: 'KOUASSI', prenoms: 'AHOU EPIPHANIE', matricule: '0576431E', district: 'Requin Baleine', parish: 'LES MYSTICETTES' },
    { nom: 'KOKO', prenoms: 'ANGE STEPHANIE', matricule: '0517232W', district: 'Requin Baleine', parish: 'LES BELUGAS' },
    { nom: 'KOUAME', prenoms: 'KOUAKOU GRACE LAURENE AMAN', matricule: '0510541T', district: 'Requin Baleine', parish: 'LES BELUGAS' },
    { nom: 'NIANGORAN', prenoms: 'ELIE PAUL', matricule: '0524950U', district: 'Requin Baleine', parish: 'LES NARVALS' },
    { nom: 'BAZIE', prenoms: 'ISMAEL', matricule: '0556318W', district: 'Requin Baleine', parish: 'LES MYSTICETTES' },
    { nom: 'GONTY', prenoms: 'TIA BEN EMMANUEL', matricule: '0588830H', district: 'Requin Baleine', parish: 'LES NARVALS' },
    { nom: 'KOUAKOU', prenoms: 'KOUMAN MARIA COMBLEE DE GRACE', matricule: '0547387A', district: 'Requin Baleine', parish: 'LES NARVALS' },
    { nom: 'LEDJI', prenoms: 'OLYMPE NOURA GRACE EMMANUELA', matricule: '0571604W', district: 'Requin Baleine', parish: 'LES NARVALS' },
    { nom: 'AMENAN', prenoms: 'REINE MICHELLE', matricule: '0527093N', district: 'Requin Baleine', parish: 'LES NARVALS' },
    { nom: 'N\'GUESSAN', prenoms: 'SAWAN ACOH MAÏLLANCE', matricule: '0575478T', district: 'Requin Bouledogue', parish: 'Les Marsouins' },
    { nom: 'KOUASSI', prenoms: 'ADIKO DAVID', matricule: '0511560E', district: 'Requin Bouledogue', parish: 'Les Raies Mantas' },
    { nom: 'GOLY', prenoms: 'BRAYAN', matricule: '0593115A', district: 'Requin Bouledogue', parish: 'Equipe de district Requin Bouledogue' },
    { nom: 'AKA', prenoms: 'AGO RAPHAËLLE ARIANE', matricule: '0560309N', district: 'Requin Bouledogue', parish: 'Les Marsouins' },
    { nom: 'HIDO', prenoms: 'STELLA', matricule: '0596508M', district: 'Requin Bouledogue', parish: 'Equipe de district Requin Bouledogue' },
    { nom: 'ADJOUMANI', prenoms: 'CHRIST MARIE EMMANUELA', matricule: '0534389G', district: 'Requin Bouledogue', parish: 'Les Echinodernes' },
    { nom: 'BECHIO', prenoms: 'CHIA SOLANGE CENDR', matricule: '0563501F', district: 'Requin Bouledogue', parish: 'Les Marsouins' },
    { nom: 'KOUADIO', prenoms: 'SALOMÉ', matricule: '0556383K', district: 'Requin Bouledogue', parish: 'Les Orques' },
    { nom: 'YAPI', prenoms: 'APIE SARAH REGINA', matricule: '0535486B', district: 'Requin Bouledogue', parish: 'Les Orques' },
    { nom: 'TRAORÉ', prenoms: 'SIELE PAUL YANNICK', matricule: '0586218M', district: 'Requin Bouledogue', parish: 'Les Echinodernes' },
    { nom: 'KOUTOUAN', prenoms: 'KOUSSO VALENTINE MARIANA', matricule: '0514296A', district: 'Requin Bouledogue', parish: 'Les Marsouins' },
    { nom: 'KOUAKOU', prenoms: 'YAO ELIE', matricule: '0553393S', district: 'Requin Bouledogue', parish: 'Les Echinodernes' },
    { nom: 'ANDOH', prenoms: 'CHI MONNEY PAULE GHISLAINE', matricule: '0562443D', district: 'Requin Bouledogue', parish: 'Les Echinodernes' },
    { nom: 'YAO', prenoms: 'KONAN ELIE', matricule: '0586361Y', district: 'Requin Bouledogue', parish: 'Les Echinodernes' },
    { nom: 'OHÏ', prenoms: 'AXELL GUY MAJEST TOTOSETA', matricule: '0520054D', district: 'Requin Bouledogue', parish: 'Les Marsouins' },
    { nom: 'GUEHI', prenoms: 'AGOUA MARIE CÉCILE', matricule: '0595692T', district: 'Requin Bouledogue', parish: 'Les Orques' },
    { nom: 'KOUADIO', prenoms: 'EKISSI ARTHUR ANGELO', matricule: '0525453L', district: 'Requin Bouledogue', parish: 'Les Orques' },
    { nom: 'LAKPA', prenoms: 'NADA GRÂCE', matricule: '0539802A', district: 'Requin Bouledogue', parish: 'Les Orques' },
    { nom: 'BAKAYOKO', prenoms: 'GÉDÉON', matricule: '0510597C', district: 'Requin Bouledogue', parish: 'Les Orques' },
    { nom: 'KOUASSI', prenoms: 'BELGE BEATRICE', matricule: '0570483Q', district: 'Requin Bouledogue', parish: 'Les Orques' },
    { nom: 'ECHIMANE', prenoms: 'ASSOR GRACE ORNELLA', matricule: '0594335B', district: 'Requin Bouledogue', parish: 'Les Orques' },
    { nom: 'DOUDOU', prenoms: 'BLE YANN DESIRÉ', matricule: '0544635G', district: 'Requin Bouledogue', parish: 'Les Orques' },
    { nom: 'AMON', prenoms: 'VICTOR ANSEL FLOHIS', matricule: '0598923T', district: 'Requin Bouledogue', parish: 'Les Octopus' },
    { nom: 'AMIAN', prenoms: 'BEDE YOANE GAEL', matricule: '0577581G', district: 'Requin Bouledogue', parish: 'Les Octopus' },
    { nom: 'KOUAKOU', prenoms: 'AHOU ANGE CHRISTELLE', matricule: '0513972W', district: 'Requin Bouledogue', parish: 'Les Octopus' },
    { nom: 'TIA', prenoms: 'ORNELLA AWA DESAHI', matricule: '0593535B', district: 'Requin Bouledogue', parish: 'Les Marsouins' },
    { nom: 'OUA', prenoms: 'CARMELLE', matricule: '0567227H', district: 'Requin Bouledogue', parish: 'Les Espadons Voiliers' },
    { nom: 'OHOUE', prenoms: 'JOSÉE D\'AVILA', matricule: '0544455E', district: 'Requin Bouledogue', parish: 'Les Orques' },
    { nom: 'SEMON', prenoms: 'OKENI DANIEL', matricule: '0512228C', district: 'Requin Bouledogue', parish: 'Les Orques' },
    { nom: 'SONAN', prenoms: 'JEAN JUNIOR', matricule: '0525417P', district: 'Requin Bouledogue', parish: 'Les Echinodernes' },
    { nom: 'YAPI', prenoms: 'CHO ANNE', matricule: '0598727T', district: 'Requin Bouledogue', parish: 'Les Orques' },
    { nom: 'ASSOHUN', prenoms: 'EMMANUELLA', matricule: '0511813V', district: 'Requin Bouledogue', parish: 'Les Orques' },
    { nom: 'OHOUSSOU', prenoms: 'AHUA GRACE', matricule: '0522241E', district: 'Requin Bouledogue', parish: 'Les Echinodernes' },
    { nom: 'FALLET', prenoms: 'GEORGES MARIE', matricule: '0564149F', district: 'Requin Bouledogue', parish: 'Les Echinodernes' },
    { nom: 'GNOLEBA', prenoms: 'JESUS BRANDON ULRICH', matricule: '0591718D', district: 'Requin Bouledogue', parish: 'Les Espadons Voiliers' },
    { nom: 'YAO', prenoms: 'NADINE', matricule: '0533490W', district: 'Requin Bouledogue', parish: 'Les Echinodernes' },
    { nom: 'KOUAO', prenoms: 'ELIAKIM NELLY DAVILLA', matricule: '0559482R', district: 'Requin Bouledogue', parish: 'Les Echinodernes' },
    { nom: 'ANOH', prenoms: 'ANDI FIDEL', matricule: '0541678B', district: 'Requin Bouledogue', parish: 'Les Echinodernes' },
    { nom: 'KRA', prenoms: 'AKISSI SANDRINE', matricule: '0588516N', district: 'Requin Bouledogue', parish: 'Les Echinodernes' },
    { nom: 'YAPI', prenoms: 'ASSEMOU CHRIST GHISLAIN', matricule: '0543031N', district: 'Requin Bouledogue', parish: 'Les Echinodernes' },
    { nom: 'BASSELY', prenoms: 'GAPEA YVAN', matricule: '0511192N', district: 'Requin Bouledogue', parish: 'Les Echinodernes' },
    { nom: 'ADJIMAN', prenoms: 'APPIA GUY SERGE', matricule: '0578814W', district: 'Requin Bouledogue', parish: 'Les Echinodernes' },
    { nom: 'KOFFI', prenoms: 'AMOIN NADEGE', matricule: '0544731N', district: 'Requin Bouledogue', parish: 'Les Echinodernes' },
    { nom: 'MIEZAN', prenoms: 'GRACE PRISCA', matricule: '0558427D', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES DABOUKES DE AHOUE' },
    { nom: 'YEHOUN', prenoms: 'GÉRALDINE', matricule: '0580509Z', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES AGUILLARTS DE LAME' },
    { nom: 'ABOYA', prenoms: 'CHABE ALEXANDRA', matricule: '0578336Z', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES GEY SHARKS  D\'ATTIEKOI' },
    { nom: 'BASSE', prenoms: 'GUY ROMUALD', matricule: '0519808V', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES GEY SHARKS  D\'ATTIEKOI' },
    { nom: 'ODJE', prenoms: 'ROSE NATACHA', matricule: '0571109M', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES GEY SHARKS  D\'ATTIEKOI' },
    { nom: 'AKA', prenoms: 'AKA OSCAR', matricule: '0536296Q', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES DABOUKES DE AHOUE' },
    { nom: 'OULAGNAO', prenoms: 'GNOMBLEI ANGE EMMANUEL', matricule: '0597381S', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES REQUINS CITRONS D\'AHOUTOUE' },
    { nom: 'OULAGNAO', prenoms: 'GNOMBLEI ANGE EMMANUEL', matricule: '0519594Y', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES REQUINS CITRONS D\'AHOUTOUE' },
    { nom: 'AWA', prenoms: 'API JOSELINE', matricule: '0559365A', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES GEY SHARKS  D\'ATTIEKOI' },
    { nom: 'ADOMON', prenoms: 'LILIANE', matricule: '0548495M', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES DABOUKES DE AHOUE' },
    { nom: 'MOMBA', prenoms: 'GUY ROLAND JUNIOR', matricule: '0548605Z', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES DABOUKES DE AHOUE' },
    { nom: 'GBELI', prenoms: 'ANGE ENOCK DEMETRIUS', matricule: '0550115X', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES DABOUKES DE AHOUE' },
    { nom: 'ADJIMA', prenoms: 'MOBIO', matricule: '0589766S', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES BLACKS SHARKS DE BROFODOUME' },
    { nom: 'BECHE', prenoms: 'EUGÈNE FREDDY', matricule: '0529990N', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES BLACKS SHARKS DE BROFODOUME' },
    { nom: 'SIKA', prenoms: 'AXEL TRESOR', matricule: '0553591D', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES BLACKS SHARKS DE BROFODOUME' },
    { nom: 'OLLLE', prenoms: 'YAPO ANGE MICHEL', matricule: '0538208W', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES BLACKS SHARKS DE BROFODOUME' },
    { nom: 'ABOLE', prenoms: 'DEVIS ANGE MADREL', matricule: '0560681E', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES BLACKS SHARKS DE BROFODOUME' },
    { nom: 'OULAI', prenoms: 'KEVIN', matricule: '0529715Z', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES BLACKS SHARKS DE BROFODOUME' },
    { nom: 'OULAI', prenoms: 'JUNIOR', matricule: '0544536E', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES BLACKS SHARKS DE BROFODOUME' },
    { nom: 'GOGOUA', prenoms: 'FALONE ISADORA', matricule: '0562916T', district: 'REQUIN CORAIL Alépé Nord', parish: 'LES BLACKS SHARKS DE BROFODOUME' },
    { nom: 'ALOMOU', prenoms: 'ABOYA AIME CHRISTOPHE', matricule: '0573722I', district: 'Requin Des Caraibes', parish: 'Les Nitainos' },
    { nom: 'DAPA', prenoms: 'KOBENAN THOMAS', matricule: '0574450Y', district: 'Requin Des Caraibes', parish: 'Les Kalinagos' },
    { nom: 'KOBENAN', prenoms: 'ABLAN MARCELINE', matricule: '0574535B', district: 'Requin Des Caraibes', parish: 'Les Kalinagos' },
    { nom: 'YAO', prenoms: 'ELVIS KATTATCHE N’GNAKKAN', matricule: '0532340O', district: 'Requin Des Caraibes', parish: 'Les Naborias' },
    { nom: 'ABEY', prenoms: 'KOFFI EMMANUELLA', matricule: '0567298L', district: 'Requin Des Caraibes', parish: 'Les Lucayens' },
    { nom: 'EKESSI', prenoms: 'JEAN MICKAEL', matricule: '0544049T', district: 'Requin Des Caraibes', parish: 'Les Nitainos' },
    { nom: 'BALOU', prenoms: 'SARRASIN RUTH AUDREY', matricule: '0576593J', district: 'Requin Des Caraibes', parish: 'Les Lucayens' },
    { nom: 'PIOT', prenoms: 'SEDEKA REGINA', matricule: '0571409V', district: 'Requin Des Caraibes', parish: 'Les Nitainos' },
    { nom: 'FOHE', prenoms: 'MARC HOULY MARIE CHRISTELLE', matricule: '0575426E', district: 'Requin Des Caraibes', parish: 'Les Nitainos' },
    { nom: 'TAÏ', prenoms: 'NESMOND BRAYAN KELLY', matricule: '0567727N', district: 'Requin Des Caraibes', parish: 'Les Naborias' },
    { nom: 'ANHO', prenoms: 'KOUAME BETOTE JEAN PHILIPPE', matricule: '0549671Z', district: 'Requin Des Caraibes', parish: 'Les Nitainos' },
    { nom: 'KOSSREU', prenoms: 'DAVILLA', matricule: '0598688U', district: 'Requin Des Caraibes', parish: 'Les Kalinagos' },
    { nom: 'KEKE', prenoms: 'INOCÉT', matricule: '0551302I', district: 'Requin Des Caraibes', parish: 'Les Kalinagos' },
    { nom: 'KOFFI', prenoms: 'AFFOUE', matricule: '0540935W', district: 'Requin Des Caraibes', parish: 'Les Lucayens' },
    { nom: 'OMBLEYAN', prenoms: 'MIREILLE', matricule: '0594248Y', district: 'Requin Des Caraibes', parish: 'Les Lucayens' },
    { nom: 'N\'GORAN', prenoms: 'ESSO AYA FABIENNE', matricule: '0599819H', district: 'Requin Des Caraibes', parish: 'Les Lucayens' },
    { nom: 'TAHOU', prenoms: 'JEAN YVES', matricule: '0589850H', district: 'Requin Des Caraibes', parish: 'Les Kalinagos' },
    { nom: 'EDIKEU', prenoms: 'N\'GUESSAN AXEL HENOC', matricule: '0566804P', district: 'Requin Des Caraibes', parish: 'Les Naborias' },
    { nom: 'AKPEUBI', prenoms: 'YAPO CHRIST', matricule: '0578219V', district: 'Requin Des Caraibes', parish: 'Les Kalinagos' },
    { nom: 'DOUA', prenoms: 'MARIE BELLE', matricule: '0540744A', district: 'Requin Des Caraibes', parish: 'Les Kalinagos' },
    { nom: 'N\'GORAN', prenoms: 'KOUADIO JOSHUA RAMAEL', matricule: '0523160L', district: 'Requin Des Caraibes', parish: 'Les Naborias' },
    { nom: 'YAPO', prenoms: 'CREDO ANGE-CYRIL', matricule: '0574593O', district: 'Requin Des Caraibes', parish: 'les Cyboyens' },
    { nom: 'YAO', prenoms: 'KOFFI ULRICH', matricule: '0544618A', district: 'Requin Des Caraibes', parish: 'Les Naborias' },
    { nom: 'N\'DOUFFOU', prenoms: 'GRÂCE', matricule: '0536948E', district: 'Requin Des Caraibes', parish: 'les Cyboyens' },
    { nom: 'KOFFI KAN', prenoms: 'EUNICE SERENA', matricule: '0582624D', district: 'Requin Des Caraibes', parish: 'Les Kalinagos' },
    { nom: 'KONAN', prenoms: 'AKISSI MARIANNE', matricule: '0562088Z', district: 'Requin Des Caraibes', parish: 'Les Kalinagos' },
    { nom: 'KOUADIO', prenoms: 'KANGAH EVA', matricule: '0594537F', district: 'Requin Féroce', parish: 'Les Marsouins' },
    { nom: 'SIA', prenoms: 'AYA MARIE ANGE', matricule: '0578588H', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'OUEDRAOGO', prenoms: 'INÈS', matricule: '0559236G', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'KAMENAN', prenoms: 'AHOU GRACE', matricule: '0599403U', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'ZIBA', prenoms: 'HERMANN', matricule: '0558517R', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'AKRE', prenoms: 'AKRESSIÉ CHRIST MARIE', matricule: '0517889F', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'NARE', prenoms: 'ANNE ERIKA', matricule: '0564766S', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'KOFFI', prenoms: 'ABIGAELLE', matricule: '0575936E', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'YAPO', prenoms: 'MONEY MARIE GRÂCE', matricule: '0528758Y', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'YAO', prenoms: 'ADJOUA MARIE-COLOMBE', matricule: '0587922P', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'KOUASSI', prenoms: 'KOUADIO JUNIOR', matricule: '0586251V', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'TCHOE', prenoms: 'SANDRINE', matricule: '0517418N', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'SEDOUNGO', prenoms: 'NELLY', matricule: '0558376L', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'FIENI', prenoms: 'YAO RONALD', matricule: '0535801L', district: 'Requin Féroce', parish: 'Les Rorquals' },
    { nom: 'TRAORE', prenoms: 'ABOUBAKAR CHARLES EMMANUEL ADAYE', matricule: '0536632O', district: 'Requin Féroce', parish: 'Les Marsouins' },
    { nom: 'DIOMANDE', prenoms: 'SAM MOHAMED', matricule: '0525790N', district: 'Requin Féroce', parish: 'Les Marsouins' },
    { nom: 'ADAMANDOGBE', prenoms: 'LANDRY', matricule: '0544373Q', district: 'Requin Féroce', parish: 'Les Marsouins' },
    { nom: 'MEIZOUN', prenoms: 'JUSTINE', matricule: '0537231A', district: 'Requin Féroce', parish: 'Les Marsouins' },
    { nom: 'BILE', prenoms: 'BOUA FRANCK OLIVIER', matricule: '0561441B', district: 'Requin Féroce', parish: 'Les Marsouins' },
    { nom: 'BOLEANE', prenoms: 'YALE FÉLICITÉ', matricule: '0544591Z', district: 'Requin Féroce', parish: 'Les Rorquals' },
    { nom: 'SANGO', prenoms: 'YAO ANAËL ELIAKIM', matricule: '0517185E', district: 'Requin Féroce', parish: 'Les Rorquals' },
    { nom: 'PODA', prenoms: 'ANNE MARIE-LAURE', matricule: '0514042S', district: 'Requin Féroce', parish: 'Les Rorquals' },
    { nom: 'GAMPENE', prenoms: 'SEFORA HONORINE', matricule: '0541593G', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'OUEDRAOGO', prenoms: 'JEAN JAURES', matricule: '0517861C', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'FORO', prenoms: 'YAPO JORDAN', matricule: '0545158X', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'KOUADIO', prenoms: 'YAO MARTIAL', matricule: '0572269R', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'AKADIÉ', prenoms: 'AUGUSTE', matricule: '0565492N', district: 'Requin Féroce', parish: 'Les Rorquals' },
    { nom: 'KOFFI', prenoms: 'ABENAN ANGE', matricule: '0555377C', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'ZOTOGLO', prenoms: 'MARI MADELEINE', matricule: '0530081K', district: 'Requin Féroce', parish: 'Les Rorquals' },
    { nom: 'TAHOU', prenoms: 'NAOMI ANDREA', matricule: '0589416B', district: 'Requin Féroce', parish: 'Les Rorquals' },
    { nom: 'KOURAOGO', prenoms: 'ABOUL KARIM', matricule: '0564816C', district: 'Requin Féroce', parish: 'Les Rorquals' },
    { nom: 'AGUIE', prenoms: 'AGRE COLLIN\'S HENOC ETIPHENE', matricule: '0573796W', district: 'Requin Féroce', parish: 'Les Marsouins' },
    { nom: 'SOME', prenoms: 'BETIARE CLOTILDE', matricule: '0596253S', district: 'Requin Féroce', parish: 'Les Rorquals' },
    { nom: 'ADIAFI', prenoms: 'AFFIA MARIE PRISCILLE AURELIE', matricule: '0535683U', district: 'Requin Féroce', parish: 'Les Marsouins' },
    { nom: 'OURAGA', prenoms: 'ANGE MARIE DANIELLE', matricule: '0564586T', district: 'Requin Féroce', parish: 'Les Marsouins' },
    { nom: 'KOFFI', prenoms: 'ADJOUA OLIVIA', matricule: '0567683X', district: 'Requin Féroce', parish: 'Les Marsouins' },
    { nom: 'BANYALBA', prenoms: 'KOSSIA JEANNINE', matricule: '0570302J', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'OULAI', prenoms: 'EMMANUELLA', matricule: '0511843U', district: 'Requin Féroce', parish: 'Les Marsouins' },
    { nom: 'KOLIA', prenoms: 'MAMBOUET ANGE AUGUSTIN SAMUEL', matricule: '0531916B', district: 'Requin Féroce', parish: 'Les Marsouins' },
    { nom: 'KOUADIO', prenoms: 'AKOUA MARIE', matricule: '0543897A', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'YAPI', prenoms: 'DELIVA', matricule: '0547991V', district: 'Requin Féroce', parish: 'Les Vaquitas' },
    { nom: 'KOUASSI', prenoms: 'KONAN DAVID EMMANUEL EPIPHANIE', matricule: '0585848C', district: 'Requin Griset', parish: 'LES BAJAUX' },
    { nom: 'TOURE', prenoms: 'MARIE ELLA', matricule: '0583656G', district: 'Requin Griset', parish: 'LES BAJAUX' },
    { nom: 'OWO', prenoms: 'KOUTOUAN AGATHE INES', matricule: '0529123U', district: 'Requin Griset', parish: 'LES BAJAUX' },
    { nom: 'N\'GUESSAN', prenoms: 'AHOU ROMUALDE ADELE', matricule: '0571668Y', district: 'Requin Griset', parish: 'LES MOKENS' },
    { nom: 'NDABO', prenoms: 'MICKAEL', matricule: '0555541L', district: 'Requin Griset', parish: 'LES MOKENS' },
    { nom: 'NDABO', prenoms: 'ILONA', matricule: '0558426N', district: 'Requin Griset', parish: 'LES MOKENS' },
    { nom: 'KHADIO', prenoms: 'MARIE GRÂCE BITTY', matricule: '0556933Q', district: 'Requin Griset', parish: 'LES MOKENS' },
    { nom: 'DOUKOUATH', prenoms: 'OTTO EMMANUEL', matricule: '0529658B', district: 'Requin Griset', parish: 'LES MOKENS' },
    { nom: 'KANGA', prenoms: 'LALLEY MARIE MICHELLE GUIFTY', matricule: '0593485G', district: 'Requin Griset', parish: 'LES MOKENS' },
    { nom: 'GBOGBO', prenoms: 'KOUDOUGNON DIDIER HENRI', matricule: '0522044U', district: 'Requin Griset', parish: 'LES MOWOHS' },
    { nom: 'SEHEHOU', prenoms: 'STEPHANIE', matricule: '0596700P', district: 'Requin Griset', parish: 'LES MOWOHS' },
    { nom: 'YAPO', prenoms: 'ADJA ANGE LOÏC', matricule: '0544322Y', district: 'Requin Lancette', parish: 'LES LANCETTES LUMINEUX' },
    { nom: 'GOA', prenoms: 'ANAYA', matricule: '0599891I', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES DOCILE' },
    { nom: 'NGUETTIA', prenoms: 'AKOSSOUA ANGE ELIANE', matricule: '0530578A', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES DOCILE' },
    { nom: 'SAWADOGO', prenoms: 'EMMANUELLA BECANTI ROXANE', matricule: '0578918Y', district: 'Requin Lancette', parish: 'LES LANCETTES LUMINEUX' },
    { nom: 'KOUAKOU', prenoms: 'RENÉ CHRIST JUNIOR', matricule: '0559378T', district: 'Requin Lancette', parish: 'LES LANCETTES LUMINEUX' },
    { nom: 'MANE', prenoms: 'MARIE JESSICA BIENVENUE', matricule: '0586100E', district: 'Requin Lancette', parish: 'LES LANCETTES LUMINEUX' },
    { nom: 'OUFFOUET', prenoms: 'MARIE ANGE CARELLE', matricule: '0597754P', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES DOCILE' },
    { nom: 'EHUIENI', prenoms: 'AHOU ANNE ARIANE GRAZIELLA', matricule: '0581026U', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES ROYAUX /REQUIN LANCETTE  AIGUILLARD ROYAL' },
    { nom: 'N\'KPOMAN', prenoms: 'CHRIST ISAAC', matricule: '0560964Q', district: 'Requin Lancette', parish: 'LES LANCETTES LUMINEUX' },
    { nom: 'N\'KPOMAN', prenoms: 'CHRIST YVANN', matricule: '0536864P', district: 'Requin Lancette', parish: 'LES LANCETTES LUMINEUX' },
    { nom: 'KOUAME', prenoms: 'MARIE GRÂCE FABIOLA', matricule: '0573221E', district: 'Requin Lancette', parish: 'LES LANCETTES LUMINEUX' },
    { nom: 'N’GOTTA', prenoms: 'NAOMIE MAXENCE RENEE KENZA', matricule: '0564345K', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES ROYAUX /REQUIN LANCETTE  AIGUILLARD ROYAL' },
    { nom: 'KOUAKOU', prenoms: 'DERO KOUADIO JEAN-XAVIER', matricule: '0583526B', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES ELEGANT' },
    { nom: 'KIMA', prenoms: 'LARISSA', matricule: '0534263W', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES ELEGANT' },
    { nom: 'GUESSAN', prenoms: 'LOU BALIFE ASHLEY GRACE YASMINE', matricule: '0539999F', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES ROYAUX /REQUIN LANCETTE  AIGUILLARD ROYAL' },
    { nom: 'SANVEE', prenoms: 'GRACE EMMANUELLA', matricule: '0597385Q', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES ELEGANT' },
    { nom: 'KANGA', prenoms: 'KOUAKOU DOMINIQUE', matricule: '0546176T', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES ROYAUX /REQUIN LANCETTE  AIGUILLARD ROYAL' },
    { nom: 'ZAGRÉ', prenoms: 'ANGE VÉRONIQUE', matricule: '0548151R', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES ROYAUX /REQUIN LANCETTE  AIGUILLARD ROYAL' },
    { nom: 'KONAN', prenoms: 'AYA SAMIRA', matricule: '0592112W', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES AVIATORS' },
    { nom: 'KLIBA', prenoms: 'AFFI CARINE', matricule: '0562835A', district: 'Requin Lancette', parish: 'LES LANCETTES LUMINEUX' },
    { nom: 'YEPRI', prenoms: 'MARIE-DIVINE CÉCILIA-PHANUEL AGATHE', matricule: '0545545S', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES DOCILE' },
    { nom: 'MELAMEDI', prenoms: 'REBECCA', matricule: '0540264B', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES ROYAUX /REQUIN LANCETTE  AIGUILLARD ROYAL' },
    { nom: 'KOUAME', prenoms: 'MARC YVANN', matricule: '0565090J', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES DOCILE' },
    { nom: 'OSSEY', prenoms: 'YVAN JEAN DE KENTY', matricule: '0547425E', district: 'Requin Lancette', parish: 'LES LANCETTES LUMINEUX' },
    { nom: 'KOFFI', prenoms: 'JEAN-YVES', matricule: '0595359Z', district: 'Requin Lancette', parish: 'LES LANCETTES LUMINEUX' },
    { nom: 'DOUO', prenoms: 'MARIE-ANGE CHRISTELLE', matricule: '0537014T', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES AVIATORS' },
    { nom: 'KOFFI', prenoms: 'NATHAN OTHINIEL', matricule: '0512260A', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES AVIATORS' },
    { nom: 'GNABEHI', prenoms: 'GNAMIENWA ANGELA FERNY DEGRACE', matricule: '0592195E', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES EPINEUX' },
    { nom: 'DOH', prenoms: 'BOTTY LOU  IRIE YASMINE', matricule: '0526152G', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES EPINEUX' },
    { nom: 'KONAN', prenoms: 'KOUAME CHRIST NOËL', matricule: '0537583C', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES EPINEUX' },
    { nom: 'KABORE', prenoms: 'PACÔME', matricule: '0570589F', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES DOCILE' },
    { nom: 'DEKI', prenoms: 'KOUAMÉ JEAN-EUDES JOSUÉ', matricule: '0525537C', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES ELEGANT' },
    { nom: 'NCHO', prenoms: 'TOIKEUSSEU CHRISLOÏC', matricule: '0537563V', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES ELEGANT' },
    { nom: 'TOPE', prenoms: 'GERMAIN', matricule: '0586828G', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES ELEGANT' },
    { nom: 'OUEDRAGO', prenoms: 'JULIANA', matricule: '0532314M', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES ELEGANT' },
    { nom: 'ADEGBENLE', prenoms: 'CHRIS EMMANUEL', matricule: '0542596W', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES ELEGANT' },
    { nom: 'NIEPE', prenoms: 'JEAN EMMANUEL', matricule: '0548599K', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES DOCILE' },
    { nom: 'ZABRÉ', prenoms: 'ANNE-MARIE', matricule: '0560403L', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES ELEGANT' },
    { nom: 'MOBIO', prenoms: 'AGOLE EMMANUEL', matricule: '0557184O', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES ELEGANT' },
    { nom: 'KOUAME', prenoms: 'AMENAN MARINA', matricule: '0593531W', district: 'Requin Lancette', parish: 'LES REQUINS LANCETTES AVIATORS' },
    { nom: 'PODA', prenoms: 'GNOURPKENIBE MÉDARD', matricule: '0557233D', district: 'Requin Leopard', parish: 'CHAPELLE SAINTE TRINITE' },
    { nom: 'GUIWEMBA', prenoms: 'MARIA EMMANUELA', matricule: '0545073G', district: 'Requin Leopard', parish: 'CHAPELLE SAINTE TRINITE' },
    { nom: 'HIEN', prenoms: 'TAFIMIBA', matricule: '0571376T', district: 'Requin Leopard', parish: 'CHAPELLE SAINTE TRINITE' },
    { nom: 'AGOUSSI', prenoms: 'PIERRE MICHAEL', matricule: '0538160J', district: 'Requin Leopard', parish: 'Saint Antoine de Padoue' },
    { nom: 'AGOUSSI', prenoms: 'AKE CHADRACK', matricule: '0512339G', district: 'Requin Leopard', parish: 'Saint Antoine de Padoue' },
    { nom: 'DABIRÉ', prenoms: 'AUGUSTINE', matricule: '0579546H', district: 'Requin Leopard', parish: 'CHAPELLE NOTRE DAME DE LA PROVIDENCE' },
    { nom: 'KAMBOU', prenoms: 'AKOUA ERISMA', matricule: '0511567B', district: 'Requin MAKO', parish: 'LES REQUINS SAUMON' },
    { nom: 'MOBIO', prenoms: 'AGUEGO MICHEL EMMANUEL', matricule: '0547813T', district: 'Requin MAKO', parish: 'LES REQUINS SAUMON' },
    { nom: 'N\'KOUMO', prenoms: 'ADJAMOIN CHRISTIAN MARVIN', matricule: '0596945Y', district: 'Requin MAKO', parish: 'LES REQUINS SAUMON' },
    { nom: 'N\'ZI', prenoms: 'JEAN MARC', matricule: '0566614J', district: 'Requin MAKO', parish: 'LES REQUINS SAUMON' },
    { nom: 'GOUMOU', prenoms: 'PASCAL', matricule: '0527816D', district: 'Requin MAKO', parish: 'LES REQUINS DU GANGE' },
    { nom: 'AKRAN', prenoms: 'YANN', matricule: '0549741B', district: 'Requin MAKO', parish: 'LES REQUINS SAUMON' },
    { nom: 'KONE', prenoms: 'ISMAEL MEDERIC', matricule: '0519340S', district: 'Requin MAKO', parish: 'LES REQUINS MEGALODON' },
    { nom: 'N’GUESSAN', prenoms: 'FÉLICITE MARIE BLANCHE', matricule: '0548509T', district: 'Requin MAKO', parish: 'LES REQUINS CUIVRE' },
    { nom: 'DOUGOUNÉ', prenoms: 'LOU FHINY GRÂCE KORELI', matricule: '0570397D', district: 'Requin MAKO', parish: 'LES REQUINS TAUPE' },
    { nom: 'ASSEU', prenoms: 'CYNTICHE', matricule: '0536673K', district: 'Requin MAKO', parish: 'LES REQUINS SAUMON' },
    { nom: 'KOUASSI', prenoms: 'AUDREY', matricule: '0560654B', district: 'Requin MAKO', parish: 'LES REQUINS SAUMON' },
    { nom: 'KOUAKOU', prenoms: 'YVAN JUNIOR', matricule: '0516539R', district: 'Requin MAKO', parish: 'LES REQUINS SAUMON' },
    { nom: 'YAMEOGO', prenoms: 'EPIPHANIE', matricule: '0542570S', district: 'Requin MAKO', parish: 'LES REQUINS SAUMON' },
    { nom: 'BIEU', prenoms: 'MARIE PRISCILLIA', matricule: '0523892B', district: 'Requin MAKO', parish: 'LES REQUINS CUIVRE' },
    { nom: 'EKRA', prenoms: 'OCEANE', matricule: '0511412C', district: 'Requin MAKO', parish: 'LES REQUINS CUIVRE' },
    { nom: 'OULAÏ', prenoms: 'CAROLE', matricule: '0560915V', district: 'Requin MAKO', parish: 'LES REQUINS DU GANGE' },
    { nom: 'KOARA', prenoms: 'DONALD', matricule: '0564955I', district: 'Requin MAKO', parish: 'LES REQUINS CUIVRE' },
    { nom: 'KOUAKOU', prenoms: 'KOUADIO CHRIST NOËL', matricule: '0585470V', district: 'Requin MAKO', parish: 'LES REQUINS DU GANGE' },
    { nom: 'KIENDREBEOGO', prenoms: 'VALERIE', matricule: '0548429P', district: 'Requin MAKO', parish: 'LES REQUINS CUIVRE' },
    { nom: 'SEGLA', prenoms: 'MARIE T\'IMAGINE ASCELLE', matricule: '0522315Z', district: 'Requin MAKO', parish: 'LES REQUINS DU GANGE' },
    { nom: 'KOUADIO', prenoms: 'ALEX JUNIOR', matricule: '0552010C', district: 'Requin MAKO', parish: 'LES REQUINS SAUMON' },
    { nom: 'KONE', prenoms: 'KATHY MARIA EMMANUELLA', matricule: '0567915I', district: 'Requin MAKO', parish: 'LES REQUINS CUIVRE' },
    { nom: 'BOITINI', prenoms: 'EMMANUELLA DORIANE', matricule: '0582837B', district: 'Requin MAKO', parish: 'LES REQUINS SAUMON' },
    { nom: 'DJOMAN', prenoms: 'LOBAKRÉ THÉODORE', matricule: '0518139N', district: 'Requin MAKO', parish: 'LES REQUINS SAUMON' },
    { nom: 'KONAN KOFFI', prenoms: 'ANGE SAMUEL', matricule: '0593855M', district: 'Requin MAKO', parish: 'LES REQUINS DU GANGE' },
    { nom: 'SIAE', prenoms: 'STEPHANIE', matricule: '0527012X', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX ETOILES' },
    { nom: 'DIARRASSOUBA', prenoms: 'DOULOUREUX', matricule: '0531116I', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX ETOILES' },
    { nom: 'KOUADIO', prenoms: 'KOUAKOU JEAN YVES', matricule: '0520256U', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX ETOILES' },
    { nom: 'ACHI', prenoms: 'N\'DEPO IVAN HORTINIEL', matricule: '0591546K', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX TACHETES' },
    { nom: 'ZADI', prenoms: 'DORIANE CHARLENE', matricule: '0596495P', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX ETOILES' },
    { nom: 'SEBEGO', prenoms: 'AIMEE DESIREE MONIQUE', matricule: '0559091C', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX A AILES BLANCHES' },
    { nom: 'GUEU', prenoms: 'ZOUHOSSA MARIE-MADELEINE', matricule: '0562729P', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX A AILES BLANCHES' },
    { nom: 'ADJEDJE', prenoms: 'PRUNELLE ARIELLE DEBORA', matricule: '0511442X', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX A AILES BLANCHES' },
    { nom: 'KOUASSI', prenoms: 'SARA SANDRINE', matricule: '0558427R', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX A AILES BLANCHES' },
    { nom: 'DAH', prenoms: 'ERI NAOMIE', matricule: '0530165M', district: 'Requin Marteau', parish: 'LES REQUIN MARTEAUX HALICORNE' },
    { nom: 'N’DJORE', prenoms: 'EMMANUEL', matricule: '0510811K', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX A AILES BLANCHES' },
    { nom: 'OJOAWO', prenoms: 'MARTINS', matricule: '0576604X', district: 'Requin Marteau', parish: 'LES REQUIN MARTEAUX HALICORNE' },
    { nom: 'COULIBALY', prenoms: 'TIATOH AHOUA EMMANUELLE', matricule: '0525298K', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX ETOILES' },
    { nom: 'KOUASSI', prenoms: 'ARNOLD WILFRIELD', matricule: '0547882H', district: 'Requin Marteau', parish: 'LES REQUIN MARTEAUX HALICORNE' },
    { nom: 'COULIBALY', prenoms: 'SIONFOUNGOWERI BONIFACE', matricule: '0552623Y', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX A AILES BLANCHES' },
    { nom: 'YOBOUE', prenoms: 'AHOU GRACE', matricule: '0550571V', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX A AILES BLANCHES' },
    { nom: 'KOUADIO', prenoms: 'YAH ARIELLE', matricule: '0541618K', district: 'Requin Marteau', parish: 'LES REQUIN MARTEAUX HALICORNE' },
    { nom: 'N’ZUE', prenoms: 'BOUSSIE MARIE VICTOIRE', matricule: '0566312S', district: 'Requin Marteau', parish: 'LES REQUIN MARTEAUX HALICORNE' },
    { nom: 'KOUADIO', prenoms: 'SEAN THIBAUT', matricule: '0554570J', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX ETOILES' },
    { nom: 'BOLI', prenoms: 'LOU TIENEN RUTH ANDREA', matricule: '0578725Q', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX TACHETES' },
    { nom: 'BOKO', prenoms: 'DESIRE', matricule: '0511954X', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX ETOILES' },
    { nom: 'EBA', prenoms: 'KOKO BLANCHE', matricule: '0592911P', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX A AILES BLANCHES' },
    { nom: 'NIKIEMA', prenoms: 'HENRY MICHEL', matricule: '0596902P', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX TACHETES' },
    { nom: 'KOUAKOU', prenoms: 'PIERRE STEPHANE', matricule: '0591182H', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX TACHETES' },
    { nom: 'YESSOH', prenoms: 'RUTH REBECCA', matricule: '0560875G', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX TACHETES' },
    { nom: 'KOUAME', prenoms: 'AFFOUE YASMINE SOLVEGUE', matricule: '0541576I', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX TACHETES' },
    { nom: 'KOUADIO', prenoms: 'LOUKOU DIEUDONNÉ YAO CHRISTIAN', matricule: '0554117N', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX ETOILES' },
    { nom: 'OBOUDI', prenoms: 'ODILON ELISEE', matricule: '0583725U', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX A AILES BLANCHES' },
    { nom: 'YRO', prenoms: 'GUELASSEMIN ENOCK', matricule: '0572197I', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX ETOILES' },
    { nom: 'KINIMO', prenoms: 'KOUA ROLAND JUNIOR', matricule: '0562912N', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX TACHETES' },
    { nom: 'AKA', prenoms: 'GNAMIEN ANGE', matricule: '0519733N', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX ETOILES' },
    { nom: 'SORO', prenoms: 'KIYALA ANGE WILFRIED', matricule: '0524254A', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX ETOILES' },
    { nom: 'APIA', prenoms: 'KOUASSI BRAYAN', matricule: '0586784N', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX TACHETES' },
    { nom: 'ADJOGUE', prenoms: 'AFFOUÉ GRÂCE', matricule: '0567596J', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX TACHETES' },
    { nom: 'NIAMKEY', prenoms: 'EMMANUEL', matricule: '0580213K', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX A AILES BLANCHES' },
    { nom: 'BAZIE', prenoms: 'LYDIE', matricule: '0580888H', district: 'Requin Marteau', parish: 'LES REQUIN MARTEAUX HALICORNE' },
    { nom: 'COULIBALY', prenoms: 'GUISSANGUI SENIDJOU BÉNÉDICTE YASMINE', matricule: '0542245H', district: 'Requin Marteau', parish: 'LES REQUIN MARTEAUX HALICORNE' },
    { nom: 'DJADOU', prenoms: 'KAMENAN CHARLES WILFRIED', matricule: '0520250R', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX TACHETES' },
    { nom: 'KOUADIO', prenoms: 'ADJOUA PATRICIA', matricule: '0522279H', district: 'Requin Marteau', parish: 'LES REQUINS MARTEAUX A AILES BLANCHES' },
    { nom: 'ACKE', prenoms: 'KOUASSI YANN ESAIE', matricule: '0592902C', district: 'Requin Noronhai', parish: 'LES REQUINS TIGRES' },
    { nom: 'KOUADIO', prenoms: 'ADÈLE', matricule: '0595164W', district: 'Requin Noronhai', parish: 'LES REQUINS TIGRES' },
    { nom: 'YAPO', prenoms: 'JEAN ANDRÉ YAN', matricule: '0541339G', district: 'Requin Noronhai', parish: 'LES EPAULARDS' },
    { nom: 'ADENIYI', prenoms: 'SAMY CORNEILLE', matricule: '0599019F', district: 'Requin Noronhai', parish: 'LES EPAULARDS' },
    { nom: 'GNABRO', prenoms: 'YOANE', matricule: '0510876G', district: 'Requin Noronhai', parish: 'LES EPAULARDS' },
    { nom: 'DJE IDA', prenoms: 'MARIE SIRHINA', matricule: '0566928A', district: 'Requin Noronhai', parish: 'LES EPAULARDS' },
    { nom: 'DJOMAN', prenoms: 'DJOROBIE HELENE', matricule: '0568291X', district: 'Requin Noronhai', parish: 'LES CUBOMEDUSES' },
    { nom: 'TONDOSSAMA', prenoms: 'MATHIEU', matricule: '0511475C', district: 'Requin Noronhai', parish: 'LES CUBOMEDUSES' },
    { nom: 'AKE', prenoms: 'JEAN NOËL', matricule: '0532234L', district: 'Requin Noronhai', parish: 'LES REQUINS TIGRES' },
    { nom: 'AKASSA', prenoms: 'SAMUEL', matricule: '0544135D', district: 'Requin Noronhai', parish: 'LES ORQUES MARINIERS' },
    { nom: 'KABA', prenoms: 'KODJOVI GUENOLE DESMOND', matricule: '0520800Z', district: 'Requin Peau Bleu', parish: 'SEMOU (TORTUE DE MER)' },
    { nom: 'ADJARAKOU', prenoms: 'JOËL', matricule: '0559980R', district: 'Requin Peau Bleu', parish: 'QUASI PAROISSE SAINT RAPHAEL ADJIN VILLAGE' },
    { nom: 'SILUE', prenoms: 'NADI AUDREY', matricule: '0594908U', district: 'Requin Peau Bleu', parish: 'QUASI PAROISSE SAINT BERNARD DES CITES' },
    { nom: 'DOGAUG', prenoms: 'AHIKPA ENOC BEDOE', matricule: '0581968Y', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'ANOKY', prenoms: 'KOUAKOU KOFFI ELYSÉE-MARIE', matricule: '0559657K', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'KOUASSI', prenoms: 'AMOUZOUA MARIE-DOMINIQUE', matricule: '0541833X', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'DA', prenoms: 'ODILE', matricule: '0526720Q', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'ZAN LOU', prenoms: 'MARIE ANGE YASMINE', matricule: '0578058Y', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'SORO', prenoms: 'MARIAM', matricule: '0585606O', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'KOUASSI', prenoms: 'JEAN OTHNIEL', matricule: '0526814A', district: 'Requin Peau Bleu', parish: 'QUASI PAROISSE SAINT BERNARD DES CITES' },
    { nom: 'NANI', prenoms: 'SHAKYRA ARCHANGE', matricule: '0585413F', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'YAO', prenoms: 'BOMO MARIE GRÂCE', matricule: '0565395R', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'GUEU', prenoms: 'YASMINE', matricule: '0547333D', district: 'Requin Peau Bleu', parish: 'GWEVOKO' },
    { nom: 'YOH', prenoms: 'BOUABRÉ ENOCK', matricule: '0548685R', district: 'Requin Peau Bleu', parish: 'GWEVOKO' },
    { nom: 'KOUAMÉ', prenoms: 'TIPHANIE', matricule: '0534146U', district: 'Requin Peau Bleu', parish: 'GWEVOKO' },
    { nom: 'ATTIE', prenoms: 'GRÂCE MARIE PAULE', matricule: '0538779I', district: 'Requin Peau Bleu', parish: 'GWEVOKO' },
    { nom: 'AKE', prenoms: 'FRANCK AXEL', matricule: '0510529N', district: 'Requin Peau Bleu', parish: 'GWEVOKO' },
    { nom: 'AMANI', prenoms: 'KOUASSI EZECHIEL', matricule: '0576936B', district: 'Requin Peau Bleu', parish: 'GWEVOKO' },
    { nom: 'BOLI LOU', prenoms: 'TATIANA', matricule: '0593622K', district: 'Requin Peau Bleu', parish: 'GWEVOKO' },
    { nom: 'DJOMAN', prenoms: 'REGIS', matricule: '0599458A', district: 'Requin Peau Bleu', parish: 'GWEVOKO' },
    { nom: 'MOBIO', prenoms: 'HESLI ROXANE', matricule: '0515326R', district: 'Requin Peau Bleu', parish: 'GWEVOKO' },
    { nom: 'KOUADIO', prenoms: 'VICTOIRE', matricule: '0581196R', district: 'Requin Peau Bleu', parish: 'GWEVOKO' },
    { nom: 'N\'GUESSAN', prenoms: 'KOUAMÉ', matricule: '0585499B', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'ALLOU', prenoms: 'ANGE MARDOCHÉE', matricule: '0519365X', district: 'Requin Peau Bleu', parish: 'ANOMA RAIE MARINE' },
    { nom: 'LATH', prenoms: 'ANNE MARIE', matricule: '0514976W', district: 'Requin Peau Bleu', parish: 'QUASI PAROISSE SAINT BERNARD DES CITES' },
    { nom: 'N’GUESSAN', prenoms: 'CEDRIC', matricule: '0532996L', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'ATTA', prenoms: 'KONAN  MARC AUREL', matricule: '0532774H', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'MANDAH', prenoms: 'DON JOEL', matricule: '0553317S', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'GUEU', prenoms: 'MARIE ANGE', matricule: '0536115C', district: 'Requin Peau Bleu', parish: 'ANOMA RAIE MARINE' },
    { nom: 'POUAMON', prenoms: 'CHRIST', matricule: '0595248L', district: 'Requin Peau Bleu', parish: 'ANOMA RAIE MARINE' },
    { nom: 'COULIBALY', prenoms: 'CHRYS MARC', matricule: '0585205P', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'SEKA', prenoms: 'CHIÉPO DORIANE PELAGIE', matricule: '0557757Y', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'ATTE', prenoms: 'JEAN EDITH NELLY', matricule: '0543595P', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'KODJANÉ', prenoms: 'JOËL HENRY', matricule: '1797851K', district: 'Requin Peau Bleu', parish: 'SEMOU (TORTUE DE MER)' },
    { nom: 'AMON', prenoms: 'PRINCE', matricule: '0592915J', district: 'Requin Peau Bleu', parish: 'QUASI PAROISSE SAINT BERNARD DES CITES' },
    { nom: 'DJAMA', prenoms: 'AGOUA MARIE-ÉVA', matricule: '0523450L', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'KANGA', prenoms: 'AFFOUÉ MARIE DÉSIRÉE GRÂCE CILFIGUÊ', matricule: '0566817Y', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'DJONIN', prenoms: 'AKE JEAN YVES', matricule: '0575475R', district: 'Requin Peau Bleu', parish: 'GWEVOKO' },
    { nom: 'DIOURO', prenoms: 'JEAN YVES JOSEPH KILLJOY', matricule: '0558487D', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'TIEMELE', prenoms: 'ANNE EMMANUELLA', matricule: '0512181W', district: 'Requin Peau Bleu', parish: 'ANOMA RAIE MARINE' },
    { nom: 'NIAMBROUI', prenoms: 'EMMANUELLA', matricule: '0530704E', district: 'Requin Peau Bleu', parish: 'GWEVOKO' },
    { nom: 'COHE', prenoms: 'ASSI EBENEZER', matricule: '0531297F', district: 'Requin Peau Bleu', parish: 'ANOMA RAIE MARINE' },
    { nom: 'AMAN', prenoms: 'N’GODO LAETITIA', matricule: '0584096O', district: 'Requin Peau Bleu', parish: 'AKOMA' },
    { nom: 'KOUAKOU', prenoms: 'JOËL', matricule: '0579468X', district: 'Requin Peau Bleu', parish: 'GWEVOKO' },
    { nom: 'TATOU', prenoms: 'N\'DRIN KARL EMMANUEL', matricule: '0520497T', district: 'Requin Peau Bleu', parish: 'GWEVOKO' },
    { nom: 'DIOMANDÉ', prenoms: 'PAUL EVRA KILIAN', matricule: '0560062P', district: 'Requin Peau Bleu', parish: 'ANOMA RAIE MARINE' },
    { nom: 'KOFFI YAO', prenoms: 'JEAN EMMANUEL', matricule: '0561578F', district: 'Requin Peau Bleu', parish: 'ANOMA RAIE MARINE' },
    { nom: 'YOUNIN', prenoms: 'ANGE ARMEL', matricule: '0531630S', district: 'Requin Peau Bleu', parish: 'ANOMA RAIE MARINE' },
    { nom: 'HIE', prenoms: 'JUSTE MÀRCARIE', matricule: '0541988S', district: 'Requin Peau Bleu', parish: 'ANOMA RAIE MARINE' },
    { nom: 'KOUAMÉ', prenoms: 'AKOUA TIPHANIE', matricule: '0527710D', district: 'Requin Peau Bleu', parish: 'GWEVOKO' },
    { nom: 'FANGNIN', prenoms: 'DESSIN HYPOOLITE', matricule: '0594187N', district: 'Requin Peau Bleu', parish: 'SEMOU (TORTUE DE MER)' },
    { nom: 'KOUASSI', prenoms: 'AFFOUA CHANCELLE', matricule: '0517670D', district: 'Requin Peau Bleu', parish: 'SEMOU (TORTUE DE MER)' },
    { nom: 'N\'ZIAN', prenoms: 'KOUASSI CHRISTIAN', matricule: '0582116N', district: 'Requin Peau Bleu', parish: 'SEMOU (TORTUE DE MER)' },
    { nom: 'KPAN', prenoms: 'TIEMOKO BRICE', matricule: '0510476C', district: 'Requin Peau Bleu', parish: 'QUASI PAROISSE SAINT BERNARD DES CITES' },
    { nom: 'SAPIM', prenoms: 'N\'GUETA ARIEL', matricule: '0555734U', district: 'REQUIN PELERIN', parish: 'BALEINE À BOSSE' },
    { nom: 'SANE', prenoms: 'ANSELME LUCIEN', matricule: '0599296Y', district: 'REQUIN PELERIN', parish: 'BALEINE À BOSSE' },
    { nom: 'KOUADIO', prenoms: 'KOFFIKIE YVAN DOMINIQUE', matricule: '0536076M', district: 'REQUIN PELERIN', parish: 'BALEINE À BOSSE' },
    { nom: 'TOGOU', prenoms: 'N\'GUESSAN  ODILON', matricule: '0592325U', district: 'REQUIN PELERIN', parish: 'LES REQUINS NOURRICES' },
    { nom: 'ANGROAN', prenoms: 'GNAWAN IVES', matricule: '0530423L', district: 'REQUIN PELERIN', parish: 'LES REQUINS NOURRICES' },
    { nom: 'AKA', prenoms: 'AMAMDI GOORE', matricule: '0594710W', district: 'REQUIN PELERIN', parish: 'LES ESPADONS' },
    { nom: 'BONGO', prenoms: 'YANN ELIE STEPHANE', matricule: '0516360W', district: 'REQUIN PELERIN', parish: 'LES SEALS' },
    { nom: 'N’GORAN', prenoms: 'ATTOBRA JEAN HUGUES HILARION', matricule: '0515226H', district: 'REQUIN PELERIN', parish: 'LES SEALS' },
    { nom: 'KOFFI', prenoms: 'KOSSIA NAOMY JOELLE', matricule: '0582453F', district: 'REQUIN PELERIN', parish: 'BALEINE À BOSSE' },
    { nom: 'GNANDJA GRODJI', prenoms: 'AZI SADOINE', matricule: '0532997T', district: 'REQUIN PELERIN', parish: 'LES LAMNAS NASUS' },
    { nom: 'DIA', prenoms: 'KOUAKOU YANN-ANDRE', matricule: '0553650T', district: 'REQUIN PELERIN', parish: 'LES LAMNAS NASUS' },
    { nom: 'ATTA', prenoms: 'KOUAKOU BENJAMIN', matricule: '0581445O', district: 'REQUIN PELERIN', parish: 'LES SEALS' },
    { nom: 'KOUAME', prenoms: 'YANN BEN OCTAVE DOVA', matricule: '0574918S', district: 'REQUIN PELERIN', parish: 'LES ESPADONS' },
    { nom: 'SODIE', prenoms: 'JENNIFER', matricule: '0511033T', district: 'REQUIN PELERIN', parish: 'LES REQUINS NOURRICES' },
    { nom: 'AKICHY', prenoms: 'SAMUEL MANFE FRANCK ERIC', matricule: '0540793Y', district: 'REQUIN PELERIN', parish: 'LES REQUINS NOURRICES' },
    { nom: 'ADJOUMANI', prenoms: 'KOBENAN ANGE-ARIEL NANDO', matricule: '0550772K', district: 'REQUIN PELERIN', parish: 'LES REQUINS NOURRICES' },
    { nom: 'MONTEHO', prenoms: 'CEDE PRISCILIA CHRISTELLE', matricule: '0544114D', district: 'REQUIN PELERIN', parish: 'LES DAUPHINS BURRUNANS' },
    { nom: 'POTEY', prenoms: 'MARIE PRIELLE', matricule: '0566206N', district: 'REQUIN PELERIN', parish: 'BALEINE À BOSSE' },
    { nom: 'KOUADIO', prenoms: 'ELIE PAUL ANDRE', matricule: '0511630A', district: 'REQUIN PELERIN', parish: 'BALEINE À BOSSE' },
    { nom: 'ASSAOVI', prenoms: 'MARIUS FRANÇOIS DESALES POUTIN', matricule: '0569064A', district: 'REQUIN PELERIN', parish: 'LES SEALS' },
    { nom: 'LIGUÉ DAGO LORA MARIE CHRISTIANE', prenoms: 'LORA MARIE CHRISTIANE', matricule: '0545278X', district: 'REQUIN PELERIN', parish: 'LES LAMNAS NASUS' },
    { nom: 'FOBRI', prenoms: 'OLIVIA FABIOLA', matricule: '0580619V', district: 'REQUIN PELERIN', parish: 'LES LAMNAS NASUS' },
    { nom: 'YAPI', prenoms: 'NANDIO MARIUS', matricule: '0586456S', district: 'REQUIN PELERIN', parish: 'LES LAMNAS NASUS' },
    { nom: 'KONAN', prenoms: 'BEGNAN FATIM VALENTINE', matricule: '0575160L', district: 'REQUIN PELERIN', parish: 'LES ESPADONS' },
    { nom: 'KOKO', prenoms: 'ANNE-LISE MAMELAN', matricule: '0575729C', district: 'REQUIN PELERIN', parish: 'LES ESPADONS' },
    { nom: 'EHUA', prenoms: 'MARIE-JOSÈPHE EMMANUELLA', matricule: '0551992J', district: 'REQUIN PELERIN', parish: 'LES ESPADONS' },
    { nom: 'SOUBEIGA', prenoms: 'DAMIEN', matricule: '0580967E', district: 'REQUIN PELERIN', parish: 'LES LAMNAS NASUS' },
    { nom: 'BONI', prenoms: 'YOHAN ROXAN N\'DRI', matricule: '0563789J', district: 'REQUIN PELERIN', parish: 'LES LAMNAS NASUS' },
    { nom: 'GNAWA', prenoms: 'ETRAN ERICA CÉLESTE', matricule: '0566828D', district: 'REQUIN PELERIN', parish: 'LES LAMNAS NASUS' },
    { nom: 'KOFFI', prenoms: 'AHEMI ANGE DAVID', matricule: '0528569D', district: 'REQUIN PELERIN', parish: 'LES SEALS' },
    { nom: 'DAGO', prenoms: 'ANGE MICHEL JUNIOR', matricule: '0570990N', district: 'REQUIN PELERIN', parish: 'BALEINE À BOSSE' },
    { nom: 'ALLOU', prenoms: 'YOWANE AXEL LEVANE', matricule: '0551438Y', district: 'REQUIN PELERIN', parish: 'LES DAUPHINS BURRUNANS' },
    { nom: 'KOSSONOU', prenoms: 'KOSSIA ANGE-JANVIER', matricule: '0591413F', district: 'REQUIN PELERIN', parish: 'LES SEALS' },
    { nom: 'ZADI', prenoms: 'AHOU GRÂCE EMMANUELLA', matricule: '0571840Y', district: 'REQUIN PELERIN', parish: 'LES SEALS' },
    { nom: 'BOUSSOU', prenoms: 'CHRIS ARIELLE', matricule: '0517847S', district: 'REQUIN PELERIN', parish: 'LES DAUPHINS BURRUNANS' },
    { nom: 'N\'GORAN', prenoms: 'GNAMBI MICHELLE DANIELLE', matricule: '0527091V', district: 'REQUIN PELERIN', parish: 'LES DAUPHINS BURRUNANS' },
    { nom: 'TENAN', prenoms: 'ARIEL JEAN WILFRIED', matricule: '0578014K', district: 'REQUIN PELERIN', parish: 'LES DAUPHINS BURRUNANS' },
    { nom: 'ENO', prenoms: 'CHIA BLANDINE', matricule: '0550587C', district: 'REQUIN PELERIN', parish: 'LES DAUPHINS BURRUNANS' },
    { nom: 'GUIGMA', prenoms: 'FRANÇOIS ANDERSON', matricule: '0535660L', district: 'REQUIN PELERIN', parish: 'LES SEALS' },
    { nom: 'ANVI', prenoms: 'EHOUMAN DENIS', matricule: '0560686Y', district: 'REQUIN PELERIN', parish: 'LES SEALS' },
    { nom: 'N\'GUESSAN', prenoms: 'KAMELIA OLIVE', matricule: '0532686B', district: 'REQUIN PELERIN', parish: 'LES SEALS' },
    { nom: 'DAGO', prenoms: 'ONAKAME FLORE', matricule: '0570504I', district: 'REQUIN PELERIN', parish: 'LES DAUPHINS BURRUNANS' },
    { nom: 'KOUAME', prenoms: 'AMANY WILLIAMS DÉSIRE', matricule: '0569504O', district: 'REQUIN PELERIN', parish: 'BALEINE À BOSSE' },
    { nom: 'MANSILLA', prenoms: 'MAEVA', matricule: '0578923H', district: 'REQUIN PELERIN', parish: 'BALEINE À BOSSE' },
    { nom: 'GUIGMA', prenoms: 'FRANÇOIS ANDERSON', matricule: '0523658H', district: 'REQUIN PELERIN', parish: 'LES SEALS' },
    { nom: 'AKA', prenoms: 'ANNE LYS', matricule: '0557842E', district: 'REQUIN PELERIN', parish: 'BALEINE À BOSSE' },
    { nom: 'KOUAKOU', prenoms: 'BLANCHE VALENTINA', matricule: '0570721D', district: 'REQUIN PELERIN', parish: 'LES REQUINS NOURRICES' },
    { nom: 'SEKA', prenoms: 'APIE ROXANE', matricule: '0562369Z', district: 'REQUIN PELERIN', parish: 'LES REQUINS NOURRICES' },
    { nom: 'NARE', prenoms: 'ELLA PRISCA', matricule: '0554393K', district: 'REQUIN PELERIN', parish: 'LES REQUINS NOURRICES' },
    { nom: 'FOFANA', prenoms: 'FATIM CELESTE', matricule: '0582353A', district: 'REQUIN PELERIN', parish: 'LES LAMNAS NASUS' },
    { nom: 'DJANGO', prenoms: 'JEAN MELVYN', matricule: '0557140Z', district: 'REQUIN PELERIN', parish: 'BALEINE À BOSSE' },
    { nom: 'DIEHI', prenoms: 'MARIE ROXANE', matricule: '0542804J', district: 'REQUIN PELERIN', parish: 'LES DAUPHINS BURRUNANS' },
    { nom: 'TIGORI', prenoms: 'KATIRA', matricule: '0579168B', district: 'REQUIN PELERIN', parish: 'LES ESPADONS' },
    { nom: 'ALLA', prenoms: 'EBA MERVEILLE NAOMIE', matricule: '0594699P', district: 'REQUIN PELERIN', parish: 'LES ESPADONS' },
    { nom: 'AMIE', prenoms: 'RENÉ JEAN CHRIST', matricule: '0540437J', district: 'REQUIN PELERIN', parish: 'LES LAMNAS NASUS' },
    { nom: 'KOUAKOU', prenoms: 'N’GUESSAN GRÂCE EUDOXIE', matricule: '0558218H', district: 'REQUIN PELERIN', parish: 'LES DAUPHINS BURRUNANS' },
    { nom: 'KOUASSI', prenoms: 'LEKETTE NELLY', matricule: '0570932U', district: 'REQUIN PELERIN', parish: 'BALEINE À BOSSE' },
    { nom: 'OHOUCOU', prenoms: 'LÉA', matricule: '0583640W', district: 'REQUIN PELERIN', parish: 'BALEINE À BOSSE' },
    { nom: 'AHOUSSI', prenoms: 'ESTHER MONDESIR', matricule: '0570494M', district: 'REQUIN PELERIN', parish: 'BALEINE À BOSSE' },
    { nom: 'ASSAMOI', prenoms: 'CHRISTIAN', matricule: '0532894U', district: 'REQUIN PELERIN', parish: 'BALEINE À BOSSE' },
    { nom: 'SOMBO', prenoms: 'CHIA AUDE', matricule: '0536383Z', district: 'REQUIN PELERIN', parish: 'LES LAMNAS NASUS' },
    { nom: 'KOFFI', prenoms: 'YA ANDREA AUDREY', matricule: '0573968F', district: 'REQUIN PELERIN', parish: 'LES DAUPHINS BURRUNANS' },
    { nom: 'ABEKAN', prenoms: 'KYRIELLE', matricule: '0513149J', district: 'REQUIN PELERIN', parish: 'LES LAMNAS NASUS' },
    { nom: 'KOUAME', prenoms: 'AYA CELINE', matricule: '0513521R', district: 'REQUIN PELERIN', parish: 'BALEINE À BOSSE' },
    { nom: 'KOUAKOU', prenoms: 'MARIE MIREILLE', matricule: '0528059B', district: 'REQUIN PELERIN', parish: 'LES LAMNAS NASUS' },
    { nom: 'N\'DRY', prenoms: 'CARLA', matricule: '0588091C', district: 'REQUIN PELERIN', parish: 'BALEINE À BOSSE' },
    { nom: 'TANO', prenoms: 'JEAN LOIC', matricule: '0551264I', district: 'REQUIN PELERIN', parish: 'BALEINE À BOSSE' },
    { nom: 'OUATTARA', prenoms: 'FATIM JOSÉPHINE', matricule: '0560170M', district: 'REQUIN PELERIN', parish: 'LES LAMNAS NASUS' },
    { nom: 'KARAMOKO', prenoms: 'ROMARIC', matricule: '0549562I', district: 'Requin Sable', parish: 'LES BIDJARAS' },
    { nom: 'KAM', prenoms: 'JUSTIN', matricule: '0558745W', district: 'Requin Sable', parish: 'LES BIDJARAS' },
    { nom: 'KOUADIO BI', prenoms: 'BALLO LOUIS', matricule: '0518607L', district: 'Requin Sable', parish: 'LES WIRADJURIS' },
    { nom: 'N\'GUESSAN', prenoms: 'KLOLAI MANUELLA', matricule: '0561649Q', district: 'Requin Sable', parish: 'LES WIRADJURIS' },
    { nom: 'ASSI', prenoms: 'API RUTH EMERAUDE', matricule: '0520912M', district: 'Requin Sable', parish: 'LES WIRADJURIS' },
    { nom: 'OUPLE', prenoms: 'CHRIST EMMANUEL YORICE', matricule: '0571209N', district: 'Requin Sable', parish: 'LES WIRADJURIS' },
    { nom: 'NEGBE', prenoms: 'YEOU SARAH OLIVIA', matricule: '0568943C', district: 'Requin Sable', parish: 'LES BIDJARAS' },
    { nom: 'AKAZENI', prenoms: 'KABKAN GEORGES CHRIST', matricule: '0597031J', district: 'Requin Sable', parish: 'LES BIDJARAS' },
    { nom: 'HIE', prenoms: 'TURPIN MARIE CHRIST ANICETTE', matricule: '0572171S', district: 'Requin Sable', parish: 'LES BIDJARAS' },
    { nom: 'KONAN', prenoms: 'KOFFI DAVID', matricule: '0592122J', district: 'Requin Sable', parish: 'LES WURUNDJERIS' },
    { nom: 'DJOMAN', prenoms: 'WILLIAM CHRIST ARNOLD', matricule: '0556638T', district: 'Requin Sable', parish: 'LES WURUNDJERIS' },
    { nom: 'OKOU', prenoms: 'BLA MARIE DOMINIQUE', matricule: '0543039H', district: 'Requin Sable', parish: 'LES WIRADJURIS' },
    { nom: 'GOURY', prenoms: 'EMMANANUEL', matricule: '0558733U', district: 'Requin Sable', parish: 'LES WIRADJURIS' },
    { nom: 'KOUAME', prenoms: 'ANGE HONORAT', matricule: '0593767R', district: 'Requin Sable', parish: 'LES BIDJARAS' },
    { nom: 'KONAN', prenoms: 'MARIE MADELEINE', matricule: '0538914A', district: 'Requin Sable', parish: 'LES BIDJARAS' },
    { nom: 'KOMENAN', prenoms: 'KOUASSI AXANE CHAMEL', matricule: '0561649P', district: 'Requin Sable', parish: 'LES WIRADJURIS' },
    { nom: 'KOUABRAN', prenoms: 'CHARLES EMMAN', matricule: '0552031J', district: 'Requin Sable', parish: 'LES BIDJARAS' },
    { nom: 'ANOH', prenoms: 'KACOU MARC ALEXANDRE', matricule: '0535527E', district: 'Requin Sable', parish: 'LES BIDJARAS' },
    { nom: 'KABLAN', prenoms: 'KADJO ALBAN MATHIS', matricule: '0589342H', district: 'Requin Sable', parish: 'LES WURUNDJERIS' },
    { nom: 'N\'GUETTIA', prenoms: 'ANOUMA PAUL BRAYANNE', matricule: '0558295A', district: 'Requin Sable', parish: 'LES WURUNDJERIS' },
    { nom: 'KOUAME', prenoms: 'FULGENCE', matricule: '0533508O', district: 'Requin Sable', parish: 'LES WIRADJURIS' },
    { nom: 'DANON', prenoms: 'BROU FRANCK', matricule: '0565815H', district: 'Requin Sable', parish: 'LES WIRADJURIS' },
    { nom: 'KOFFI', prenoms: 'BENIEN EMMANUELLA', matricule: '0545276X', district: 'Requin Sable', parish: 'LES WIRADJURIS' },
    { nom: 'KOUAME', prenoms: 'JADE PRUNELLE', matricule: '0595304U', district: 'Requin Sable', parish: 'LES WIRADJURIS' },
    { nom: 'ASSI', prenoms: 'ATTHO AURÉLIA EMMANUELLA', matricule: '0513403U', district: 'Requin Sable', parish: 'LES WIRADJURIS' },
    { nom: 'DJAKI', prenoms: 'FLORE NADÈGE', matricule: '0538937K', district: 'Requin Scie', parish: 'ANGE DE MER' },
    { nom: 'KRA', prenoms: 'AMENAN ORIANE', matricule: '0512672H', district: 'Requin Scie', parish: 'ANGE DE MER' },
    { nom: 'YEO', prenoms: 'NAGNIRIMINTA SAMUEL', matricule: '0595260G', district: 'Requin Scie', parish: 'LION DE MER' },
    { nom: 'YORO', prenoms: 'BRYAN', matricule: '0540397K', district: 'Requin Scie', parish: 'LION DE MER' },
    { nom: 'ADOU', prenoms: 'ADJA ATTAWA SANDRINE', matricule: '0565471W', district: 'Requin Scie', parish: 'LION DE MER' },
    { nom: 'BOSSA', prenoms: 'AGNEI RUTH MARYSE', matricule: '0533772B', district: 'Requin Scie', parish: 'LION DE MER' },
    { nom: 'CAMARA', prenoms: 'NANGALAH JEAN EMMANUEL', matricule: '0534706Q', district: 'Requin Scie', parish: 'LION DE MER' },
    { nom: 'BIACOU', prenoms: 'MARIE-DANIELLE', matricule: '0586288G', district: 'Requin Scie', parish: 'LION DE MER' },
    { nom: 'N\'CHO', prenoms: 'OVO ZOÉ ESTHER', matricule: '0530565V', district: 'Requin Scie', parish: 'LION DE MER' },
    { nom: 'TOURÉ', prenoms: 'MÉLINA', matricule: '0521131U', district: 'Requin Scie', parish: 'LION DE MER' },
    { nom: 'SEOWOULOU', prenoms: 'CAROLE', matricule: '0572196F', district: 'Requin Scie', parish: 'LION DE MER' },
    { nom: 'NADJE', prenoms: 'TROHON DELPHINE LESLIE', matricule: '0539520C', district: 'Requin Scie', parish: 'LION DE MER' },
    { nom: 'GOSSÉ', prenoms: 'ANGE LEVI', matricule: '0599237N', district: 'Requin Scie', parish: 'LION DE MER' },
    { nom: 'KONE', prenoms: 'DELPHINE', matricule: '0560785W', district: 'Requin Scie', parish: 'LION DE MER' },
    { nom: 'KOUAKOU', prenoms: 'DORIANE', matricule: '0590006L', district: 'Requin Scie', parish: 'ANGE DE MER' },
    { nom: 'ZON', prenoms: 'ASHLEY CHRIST NOELLE', matricule: '0572561Q', district: 'Requin Scie', parish: 'LION DE MER' },
    { nom: 'YAO', prenoms: 'BIENVENU TRÉSOR CRAMOEL', matricule: '0552103O', district: 'Requin Scie', parish: 'LES ELEPHANT DE MER' },
    { nom: 'SORO', prenoms: 'PEDJOUGUEMIN PRISCA ESTHER', matricule: '0585711M', district: 'Requin Scie', parish: 'LION DE MER' },
    { nom: 'KOUAKOU', prenoms: 'ANNA PULCHERIE', matricule: '0549235P', district: 'Requin Taureau Alépé Sud', parish: 'LES LONGIMANES' },
    { nom: 'AKOU', prenoms: 'IBO BENJAMIN', matricule: '0562280X', district: 'Requin Taureau Alépé Sud', parish: 'LES SQUALES BOUCLES' },
    { nom: 'VRAIZA', prenoms: 'GBESSI ANGE FREDERIC', matricule: '0530202M', district: 'Requin Taureau Alépé Sud', parish: 'LES LONGIMANES' },
    { nom: 'BANOUANKON', prenoms: 'ANNE ELIANE', matricule: '0569305B', district: 'Requin Taureau Alépé Sud', parish: 'LES LONGIMANES' },
    { nom: 'ASSA', prenoms: 'SAINT WILFRID DIEUDONNÉ', matricule: '0580131M', district: 'Requin Taureau Alépé Sud', parish: 'LES LONGIMANES' },
    { nom: 'YAPO', prenoms: 'OTOKPA JEAN WILFRID MICKAEL', matricule: '0573884P', district: 'Requin Taureau Alépé Sud', parish: 'LES LONGIMANES' },
    { nom: 'KOUADJO', prenoms: 'OWO ROXANE THECLE AURORE', matricule: '0533215I', district: 'Requin Taureau Alépé Sud', parish: 'LES LONGIMANES' },
    { nom: 'ADON', prenoms: 'MATHURIN EDIE', matricule: '0544012W', district: 'Requin Taureau Alépé Sud', parish: 'LES BABOSSES' },
    { nom: 'MONNAN', prenoms: 'ALEX JUNIOR', matricule: '0577564C', district: 'Requin Taureau Alépé Sud', parish: 'LES BABOSSES' },
    { nom: 'ANOUMAN', prenoms: 'AGOA JEAN CHRIST LEROY', matricule: '0551213O', district: 'Requin Taureau Alépé Sud', parish: 'LES REQUINS TIGRE' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Pools de noms ivoiriens
// ─────────────────────────────────────────────────────────────────────────────

const NOM_POOL = [
  'Kouamé', 'Konan', 'Koffi', 'Brou', 'Yao', 'Traoré', 'Coulibaly', 'Koné',
  'Touré', 'Bamba', 'Diallo', 'Ouattara', "N'Guessan", "N'Dri", 'Assi', 'Aka',
  'Yapi', 'Diabaté', 'Doumbia', 'Okou', 'Ahoussou', 'Ehui', 'Bogui', 'Lago',
  'Loba', "N'Da", "N'Goran", 'Aké', 'Attié', 'Boa',
];
const PRENOM_POOL = [
  'Emmanuel', 'Aminata', 'Kofi', 'Fatou', 'Jean-Baptiste', 'Charlotte',
  'Youssouf', 'Esther', 'Franck', 'Bintou', 'Thierry', 'Delphine', 'Patrick',
  'Grâce', 'Olivier', 'Hortense', 'Serge', 'Inès', 'Augustin', 'Joëlle',
  'Laurent', 'Mariame', 'Marcel', 'Nathalie', 'Narcisse', 'Odette', 'Régis',
  'Sandra', 'Sylvain', 'Tatiana', 'Théodore', 'Véronique',
];
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const structureKey = (process.env.SEED_STRUCTURE ?? 'MYTHOLOGIQUE') as 'MYTHOLOGIQUE' | 'CLASSIQUE';

  if (structureKey !== 'MYTHOLOGIQUE' && structureKey !== 'CLASSIQUE') {
    throw new Error(
      `SEED_STRUCTURE invalide : "${structureKey}". Valeurs acceptées : MYTHOLOGIQUE, CLASSIQUE`,
    );
  }

  const structure = structureKey === 'CLASSIQUE' ? CLASSIQUE : MYTHOLOGIQUE;

  const totalDistricts = structure.districts.length;
  const totalParishes  = structure.districts.reduce((acc, d) => acc + d.parishes.length, 0);

  console.log('🌱 Démarrage du seed — Héliopolis\n');
  console.log(`   Structure  : ${structureKey}`);
  console.log(`   ${structure.label}`);
  console.log(`   ${totalDistricts} district(s) · ${totalParishes} paroisse(s)\n`);

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
    throw new Error(`Paroisse communautaire introuvable : ${communityParishKey}`);
  }
  const community = await prisma.community.upsert({
    where: { parishId_nom: { parishId: communityParish.id, nom: 'Communauté Mahatma Gandhi' } },
    update: {},
    create: { nom: 'Communauté Mahatma Gandhi', parishId: communityParish.id },
  });
  console.log(`✔ Communauté : ${community.nom}`);

  // ── 5. Admin — Grand Archiviste ─────────────────────────────────────────────
  const adminHash = await hash('Admin@2026!');
  const admin = await prisma.user.upsert({
    where: { matricule: '0000001A' },
    update: { passwordHash: adminHash, statutProfil: 'ACTIF', regionId: region.id },
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
  console.log(`✔ ADMIN       : ${admin.prenoms} ${admin.nom}  (${admin.matricule})`);

  // ── 6. Hiérophante — Conseil d'Héliopolis ───────────────────────────────────
  const regionHash = await hash('Region@2026!');
  const hierophante = await prisma.user.upsert({
    where: { matricule: '0000002B' },
    update: {
      passwordHash: regionHash,
      statutProfil: 'ACTIF',
      regionId: region.id,
      districtId: districts[structure.communityDistrict].id,
      parishId: communityParish.id,
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
      districtId: districts[structure.communityDistrict].id,
      parishId: communityParish.id,
      communityId: community.id,
    },
  });

  await prisma.region.updateMany({
    where: { responsableId: hierophante.id, NOT: { id: region.id } },
    data: { responsableId: null },
  });
  await prisma.region.update({
    where: { id: region.id },
    data: { responsableId: hierophante.id },
  });
  console.log(`✔ REGION      : ${hierophante.prenoms} ${hierophante.nom}  (${hierophante.matricule})`);

  // ── 7. Sentinelles — une par district ───────────────────────────────────────
  const sentinelleHash = await hash('Sentinelle@2026!');
  const sentinelleIds: string[] = [];
  for (const s of structure.sentinelles) {
    const district = districts[s.district];
    if (!district) {
      throw new Error(`District introuvable pour la sentinelle ${s.matricule} : ${s.district}`);
    }
    const sentinelle = await prisma.user.upsert({
      where: { matricule: s.matricule },
      update: { passwordHash: sentinelleHash, statutProfil: 'ACTIF', regionId: region.id, districtId: district.id },
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
    await prisma.district.updateMany({
      where: { responsableId: sentinelle.id, NOT: { id: district.id } },
      data: { responsableId: null },
    });
    await prisma.district.update({
      where: { id: district.id },
      data: { responsableId: sentinelle.id },
    });
    sentinelleIds.push(sentinelle.id);
  }
  console.log(`✔ SENTINELLES : ${structure.sentinelles.length} créées (une par district)`);

  // ── 8. Guides — 3 par paroisse (plein · adjoint · assistant) ───────────────
  type GuideRole = 'PLEIN' | 'ADJOINT' | 'ASSISTANT';
  const GUIDE_FONCTIONS: Array<{ guideRole: GuideRole; typeIdx: number }> = [
    { guideRole: 'PLEIN',     typeIdx: 1 },
    { guideRole: 'ADJOINT',   typeIdx: 2 },
    { guideRole: 'ASSISTANT', typeIdx: 3 },
  ];

  const guideHash = await hash('Guide@2026!');
  const guidePleinIds: string[] = [];
  const guideAllIds: string[] = [];
  let totalGuides = 0;

  for (let dIdx = 0; dIdx < structure.districts.length; dIdx++) {
    const districtData = structure.districts[dIdx];
    const district = districts[districtData.nom];

    for (let pIdx = 0; pIdx < districtData.parishes.length; pIdx++) {
      const parishName = districtData.parishes[pIdx];
      const parish = parishes[`${districtData.nom}::${parishName}`];
      const isCommunityParish =
        districtData.nom === structure.communityDistrict &&
        parishName === structure.communityParish;

      for (const { guideRole, typeIdx } of GUIDE_FONCTIONS) {
        totalGuides++;
        const letter    = ALPHABET[(totalGuides - 1) % 26];
        const matricule = `27${String(dIdx + 1).padStart(2, '0')}${String(pIdx + 1).padStart(2, '0')}${typeIdx}${letter}`;
        const nom       = NOM_POOL[(dIdx * 6 + pIdx * 4 + typeIdx) % NOM_POOL.length];
        const prenom    = PRENOM_POOL[(dIdx * 9 + pIdx * 5 + typeIdx + 1) % PRENOM_POOL.length];

        const guideUser = await prisma.user.upsert({
          where: { matricule },
          update: { passwordHash: guideHash, statutProfil: 'ACTIF', regionId: region.id, districtId: district.id, parishId: parish.id },
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
            ...(isCommunityParish && guideRole === 'PLEIN' ? { communityId: community.id } : {}),
          },
        });

        await prisma.$executeRaw`
          UPDATE "users"
          SET "guideRole" = ${guideRole}::"GuideRole"
          WHERE id = ${guideUser.id}
        `;

        guideAllIds.push(guideUser.id);
        if (guideRole === 'PLEIN') {
          guidePleinIds.push(guideUser.id);
          await prisma.parish.update({ where: { id: parish.id }, data: { guideId: guideUser.id } });
        }
      }
    }
  }
  console.log(
    `✔ GUIDES      : ${totalGuides} créés (3 par paroisse · ${Object.keys(parishes).length} paroisses)`,
  );

  // ── 9. Gardiens ─────────────────────────────────────────────────────────────
  const gardienHash = await hash('Gardien@2026!');
  const gardienIdsAJour: string[] = [];
  let totalGardiens = 0;

  if (structure.gardiens && structure.gardiens.length > 0) {
    // Real gardien data from the structure
    for (const g of structure.gardiens) {
      const district = districts[g.district];
      if (!district) {
        console.warn(`  ⚠ District introuvable pour gardien ${g.matricule} : ${g.district}`);
        continue;
      }
      const parishKey = `${g.district}::${g.parish}`;
      const parish = parishes[parishKey];
      if (!parish) {
        console.warn(`  ⚠ Paroisse introuvable pour gardien ${g.matricule} : ${parishKey}`);
        continue;
      }
      const gardien = await prisma.user.upsert({
        where: { matricule: g.matricule },
        update: { passwordHash: gardienHash, statutProfil: 'ACTIF', regionId: region.id, districtId: district.id, parishId: parish.id },
        create: {
          nom: g.nom,
          prenoms: g.prenoms,
          matricule: g.matricule,
          email: `${g.matricule.toLowerCase()}@heliopolis.ci`,
          passwordHash: gardienHash,
          role: 'GARDIEN',
          statutProfil: 'ACTIF',
          regionId: region.id,
          districtId: district.id,
          parishId: parish.id,
        },
      });
      totalGardiens++;
      gardienIdsAJour.push(gardien.id);
    }
    console.log(`✔ GARDIENS    : ${totalGardiens} créés (données réelles · ${structure.gardiens.length} entrées)`);
  } else {
    // Synthetic fallback — 5 gardiens per parish
    for (let dIdx = 0; dIdx < structure.districts.length; dIdx++) {
      const districtData = structure.districts[dIdx];
      const district = districts[districtData.nom];

      for (let pIdx = 0; pIdx < districtData.parishes.length; pIdx++) {
        const parishName = districtData.parishes[pIdx];
        const parish = parishes[`${districtData.nom}::${parishName}`];

        for (let gIdx = 1; gIdx <= 5; gIdx++) {
          totalGardiens++;
          const letter    = ALPHABET[(totalGardiens - 1) % 26];
          const matricule = `26${String(dIdx + 1).padStart(2, '0')}${String(pIdx + 1).padStart(2, '0')}${gIdx}${letter}`;
          const nom       = NOM_POOL[(dIdx * 5 + pIdx * 3 + gIdx - 1) % NOM_POOL.length];
          const prenom    = PRENOM_POOL[(dIdx * 7 + pIdx * 4 + gIdx) % PRENOM_POOL.length];

          const gardien = await prisma.user.upsert({
            where: { matricule },
            update: { passwordHash: gardienHash, statutProfil: 'ACTIF', regionId: region.id, districtId: district.id, parishId: parish.id },
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

          gardienIdsAJour.push(gardien.id);
        }
      }
    }
    console.log(
      `✔ GARDIENS    : ${totalGardiens} créés (5 par paroisse · ${Object.keys(parishes).length} paroisses)`,
    );
  }

  // ── 10. Adhésions 2026 — tous les comptes créés sont À jour ─────────────────
  const allUserIds = [
    admin.id,
    hierophante.id,
    ...sentinelleIds,
    ...guideAllIds,
    ...gardienIdsAJour,
  ];
  for (const userId of allUserIds) {
    await prisma.adhesion.upsert({
      where: { userId_annee: { userId, annee: 2026 } },
      update: {},
      create: { userId, annee: 2026, statut: 'A_JOUR', validateurId: admin.id, dateValidation: new Date() },
    });
  }
  console.log(
    `✔ Adhésions   : ${allUserIds.length} comptes marqués À jour` +
    ` (admin · hiérophante · ${sentinelleIds.length} sentinelles · ${guideAllIds.length} guides · ${gardienIdsAJour.length} gardiens)`,
  );

  // ── 11. Badges ──────────────────────────────────────────────────────────────
  const badgesInput = [
    {
      code: 'EVEIL', nom: "Pierre d'Éveil",
      description: 'Premier défi validé — le chemin du Gardien commence.',
      condition: 'Valider son premier défi Codex',
      niveau: 'BRONZE' as const,
      conditionMeta: { type: 'challenges_validated', count: 1 },
    },
    {
      code: 'MARCHEUR', nom: 'Corde du Marcheur',
      description: 'Cinq défis validés, la route se trace.',
      condition: 'Valider 5 défis Codex',
      niveau: 'BRONZE' as const,
      conditionMeta: { type: 'challenges_validated', count: 5 },
    },
    {
      code: 'ANCRE', nom: 'Ancre de Communauté',
      description: 'Premier défi communautaire relevé avec sa paroisse.',
      condition: 'Valider un défi de catégorie Communautaire',
      niveau: 'ARGENT' as const,
      conditionMeta: { type: 'communautaire_validated', count: 1 },
    },
    {
      code: 'ANKH', nom: 'Ankh du Gardien',
      description: 'Dix défis validés — le Gardien prend racine.',
      condition: 'Valider 10 défis Codex',
      niveau: 'ARGENT' as const,
      conditionMeta: { type: 'challenges_validated', count: 10 },
    },
    {
      code: 'LUMIERE', nom: "Lumière de l'Esprit",
      description: 'Trois défis spirituels accomplis.',
      condition: 'Valider 3 défis de catégorie Spirituelle',
      niveau: 'ARGENT' as const,
      conditionMeta: { type: 'spirituel_validated', count: 3 },
    },
    {
      code: 'FLAMME', nom: 'Flamme du Gardien',
      description: "Le défi long des 21 jours accompli — la flamme s'est établie.",
      condition: 'Valider le défi « 21 jours de Gardien »',
      niveau: 'OR' as const,
      conditionMeta: { type: 'long_challenge', challengeCode: '21JOURS' },
    },
    {
      code: 'ABAYKACAMP', nom: "Bouclier d'Abay-Ka",
      description: 'Participant sélectionné et présent au Camp Régional.',
      condition: 'Être présent au camp régional',
      niveau: 'OR' as const,
      conditionMeta: { type: 'camp_present', campType: 'REGIONAL' },
    },
    {
      code: 'LEGENDE', nom: "Étoile d'Héliopolis",
      description: 'Vingt-cinq défis validés — légende vivante du Codex.',
      condition: 'Valider 25 défis Codex',
      niveau: 'LEGENDE' as const,
      conditionMeta: { type: 'challenges_validated', count: 25 },
    },
  ];

  for (const b of badgesInput) {
    await prisma.badge.upsert({ where: { code: b.code }, update: {}, create: b });
  }
  console.log(`✔ Badges      : ${badgesInput.length} créés`);

  // ── 12. Défis ────────────────────────────────────────────────────────────────
  const challengesInput = [
    {
      titre: '🌱 Planter une graine',
      description: 'Plante une graine ou un jeune plant dans ton quartier et soigne-le pendant 7 jours. Observe sa croissance chaque jour.',
      categorie: 'PERSONNEL' as const, regne: 'TERRE' as const, niveau: 'DECOUVERTE' as const,
      preuveDemandee: 'Photo de la graine plantée + photo J+7', points: 10,
    },
    {
      titre: '🧹 Nettoyer une paroisse',
      description: 'Organise ou participe à une action de nettoyage de ton lieu de culte ou de ton quartier avec au moins 3 autres personnes.',
      categorie: 'COMMUNAUTAIRE' as const, regne: 'TERRE' as const, niveau: 'DECOUVERTE' as const,
      preuveDemandee: 'Photo avant/après + liste des participants', points: 15,
    },
    {
      titre: '🙏 Prière du Gardien',
      description: 'Consacre 10 minutes par jour à une prière ou méditation sur la Création pendant 5 jours consécutifs.',
      categorie: 'SPIRITUEL' as const, regne: 'ESPRIT' as const, niveau: 'DECOUVERTE' as const,
      preuveDemandee: 'Journal de méditation (texte court de 5 entrées)', points: 12,
    },
    {
      titre: "🚰 Réduire l'eau",
      description: "Identifie 3 gestes concrets pour réduire ta consommation d'eau et applique-les pendant une semaine entière.",
      categorie: 'PERSONNEL' as const, regne: 'EAU' as const, niveau: 'ENGAGEMENT' as const,
      preuveDemandee: "Liste des gestes + témoignage écrit d'une semaine", points: 20,
    },
    {
      titre: "🌬️ Souffle de l'Air",
      description: "Initie ou rejoins un projet de plantation d'arbres ou de préservation de la qualité de l'air dans ton quartier.",
      categorie: 'COMMUNAUTAIRE' as const, regne: 'AIR' as const, niveau: 'ENGAGEMENT' as const,
      preuveDemandee: "Photo du projet + rapport d'activité (1 page)", points: 25,
    },
    {
      titre: '🔥 Veillée du Feu Sacré',
      description: "Organise une veillée de partage spirituel autour d'un feu (ou d'une bougie) avec au moins 5 membres de ta communauté.",
      categorie: 'SPIRITUEL' as const, regne: 'FEU' as const, niveau: 'ENGAGEMENT' as const,
      preuveDemandee: 'Photo de la veillée + liste des participants', points: 30,
    },
    {
      titre: "💧 Gardien de l'Eau Vive",
      description: "Mène une action de sensibilisation sur la préservation de l'eau dans ta communauté : sensibiliser au moins 10 personnes.",
      categorie: 'COMMUNAUTAIRE' as const, regne: 'EAU' as const, niveau: 'MAITRISE' as const,
      preuveDemandee: 'Compte-rendu écrit + photos ou signatures', points: 40,
    },
    {
      titre: '🌿 21 jours de Gardien',
      description: "Le grand défi : 21 jours d'actions quotidiennes pour la Création. Un acte concret par jour, documenté dans un journal de bord.",
      categorie: 'LONG' as const, regne: null, niveau: 'MAITRISE' as const,
      preuveDemandee: 'Journal de 21 entrées avec photos et/ou textes', points: 100,
    },
  ];

  let challengesCreated = 0;
  for (const c of challengesInput) {
    const existing = await prisma.challenge.findFirst({ where: { titre: c.titre } });
    if (!existing) {
      await prisma.challenge.create({
        data: {
          titre: c.titre, description: c.description, categorie: c.categorie,
          regne: c.regne ?? undefined, niveau: c.niveau,
          preuveDemandee: c.preuveDemandee, points: c.points,
          statut: 'ACTIF', createdById: admin.id,
        },
      });
      challengesCreated++;
    }
  }
  console.log(`✔ Défis       : ${challengesCreated} créés`);

  // ── 13. Camp régional Abay-Ka 2026 ──────────────────────────────────────────
  const existingCamp = await prisma.camp.findFirst({ where: { nom: "Camp d'Abay-Ka 2026" } });
  if (!existingCamp) {
    await prisma.camp.create({
      data: {
        nom: "Camp d'Abay-Ka 2026",
        theme: 'Les Cinq Règnes de la Création',
        description: "Camp régional annuel de la Route en Joie — Communauté Mahatma Gandhi, Région d'Abidjan.",
        type: 'REGIONAL', statut: 'OUVERT',
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
  const firstSentinelle = structure.sentinelles[0];
  const firstGuideMatricule = `2701011A`;
  const firstGardienMatricule = `2601011A`;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ✅  Seed terminé avec succès !');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Structure : ${structureKey} — ${structure.label}`);
  console.log(`  Districts : ${totalDistricts}  ·  Paroisses : ${totalParishes}`);
  console.log(`  Guides    : ${totalGuides} (3/paroisse)`);
  console.log(`  Gardiens  : ${totalGardiens} (5/paroisse)`);
  console.log('');
  console.log('  Comptes fixes :');
  console.log('  ┌─────────────────┬──────────────┬──────────────────────┐');
  console.log('  │ Rôle            │ Matricule    │ Mot de passe         │');
  console.log('  ├─────────────────┼──────────────┼──────────────────────┤');
  console.log('  │ ADMIN           │ 0000001A     │ Admin@2026!          │');
  console.log('  │ REGION          │ 0000002B     │ Region@2026!         │');
  console.log(`  │ SENTINELLE      │ ${firstSentinelle.matricule.padEnd(12)} │ Sentinelle@2026!     │`);
  console.log(`  │ GUIDE (plein)   │ ${firstGuideMatricule.padEnd(12)} │ Guide@2026!          │`);
  console.log(`  │ GARDIEN         │ ${firstGardienMatricule.padEnd(12)} │ Gardien@2026!        │`);
  console.log('  └─────────────────┴──────────────┴──────────────────────┘');
  console.log('');
  console.log('  Pour changer de structure :');
  console.log('  SEED_STRUCTURE=CLASSIQUE     npx prisma db seed');
  console.log('  SEED_STRUCTURE=MYTHOLOGIQUE  npx prisma db seed');
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
