// ─── Enums ────────────────────────────────────────────────────────────────────
export type UserRole = 'ADMIN' | 'REGION' | 'SENTINELLE' | 'GUIDE' | 'GARDIEN' | 'PHOTOGRAPHE';
export type ProfileStatus = 'ACTIF' | 'INACTIF' | 'EN_ATTENTE_ACTIVATION' | 'SUSPENDU' | 'ARCHIVE';
export type AdhesionStatus = 'A_JOUR' | 'NON_A_JOUR' | 'EN_ATTENTE';
export type CampType = 'REGIONAL' | 'DISTRICT' | 'PAROISSIAL' | 'NATIONAL' | 'COMMUNAUTE';
export type CampStatus = 'BROUILLON' | 'OUVERT' | 'EN_COURS' | 'CLOTURE' | 'ARCHIVE';
export type ParticipationStatus = 'NON_SELECTIONNE' | 'SELECTIONNE' | 'CONFIRME' | 'PRESENT' | 'ABSENT' | 'DESISTE' | 'EN_ATTENTE' | 'BLOQUE';
export type ChallengeCategory = 'PERSONNEL' | 'COMMUNAUTAIRE' | 'SPIRITUEL' | 'LONG';
export type SubmissionStatus = 'EN_ATTENTE' | 'VALIDE' | 'REJETE' | 'CORRECTION_DEMANDEE';
export type BadgeLevel = 'BRONZE' | 'ARGENT' | 'OR' | 'LEGENDE';
export type ConversationType = 'COMMUNAUTE' | 'REGION' | 'DOYENNE' | 'PAROISSE' | 'PRIVE' | 'GROUPE';
export type MessageType = 'TEXTE' | 'IMAGE' | 'FICHIER' | 'AUDIO' | 'SYSTEME';
export type ContactStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED';

// ─── Territories ─────────────────────────────────────────────────────────────
export interface Region { id: string; nom: string; code?: string; }
export interface District { id: string; nom: string; region: Region; _count?: { parishes: number; users: number }; }
export interface Parish { id: string; nom: string; district: District; guide?: Partial<User>; _count?: { members: number }; }

// ─── Users ────────────────────────────────────────────────────────────────────
export interface Adhesion { id: string; annee: number; statut: AdhesionStatus; preuveUrl?: string; }
export interface User {
  id: string; nom: string; prenoms: string; matricule?: string;
  email?: string; telephone?: string; avatarUrl?: string;
  role: UserRole; statutProfil: ProfileStatus;
  notifPush?: boolean; notifEmail?: boolean;
  region?: Region; district?: District; parish?: Parish;
  adhesions?: Adhesion[];
  _count?: { badges: number; submissions: number };
}

// ─── Contacts ─────────────────────────────────────────────────────────────────
export interface ContactUser {
  id: string; nom: string; prenoms: string; avatarUrl?: string;
  role: UserRole;
  parish?: { id: string; nom: string };
  district?: { id: string; nom: string };
}
export interface Contact {
  id: string;
  requester: ContactUser;
  receiver: ContactUser;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}
export interface ContactItem {
  contactId: string;
  user: ContactUser;
  since: string;
}

// ─── Camps ────────────────────────────────────────────────────────────────────
export interface Camp {
  id: string; nom: string; theme?: string; description?: string;
  dateDebut: string; dateFin: string; lieu: string;
  type: CampType; statut: CampStatus; imageUrl?: string;
  selectionOuverte: boolean; createdAt: string;
  region?: Region;
  districts?: { district: District }[];
  createdBy?: Partial<User>;
  _count?: { participants: number };
}

export interface CampParticipant {
  id: string; campId: string; userId: string;
  user: Partial<User>; district: District; parish: Parish;
  adhesionStatusSnapshot: AdhesionStatus;
  participationStatus: ParticipationStatus;
  selectedAt: string;
  commentaireInterne?: string;
}

// ─── Conseils de Communauté ───────────────────────────────────────────────────
export type CouncilStatus = 'PLANIFIE' | 'EN_COURS' | 'TERMINE' | 'ANNULE';

export interface Council {
  id: string;
  nom: string;
  description?: string;
  date: string;
  lieu?: string;
  statut: CouncilStatus;
  targetRoles: string[];
  qrToken?: string;
  region?:   { id: string; nom: string };
  district?: { id: string; nom: string };
  parish?:   { id: string; nom: string };
  createdBy?: Partial<User>;
  createdAt: string;
}

export interface CouncilPublic {
  nom: string;
  description?: string;
  date: string;
  lieu?: string;
  statut: CouncilStatus;
  targetRoles: string[];
  region?:   { id: string; nom: string };
  district?: { id: string; nom: string };
  parish?:   { id: string; nom: string };
  registrationOpen: boolean;
}

export interface CouncilParticipant {
  id: string;
  nom: string;
  prenoms: string;
  contact?: string;
  district?: { id: string; nom: string };
  parish?: { id: string; nom: string };
  fonction?: string;
  note?: number;
  avis?: string;
  registeredAt: string;
  user?: { id: string; nom: string; prenoms: string };
}

// ─── Journal d'actions ───────────────────────────────────────────────────────
export type AuditAction =
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
  | 'EXPORT' | 'STATUS_CHANGE' | 'VALIDATE' | 'REJECT';

export type ActionLogCategory =
  | 'auth' | 'user' | 'camp' | 'challenge' | 'codex'
  | 'council' | 'badge' | 'export' | 'settings';

export interface ActionLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  category: ActionLogCategory;
  summary: string;
  actor?: { id: string; role: string; label: string };
  target: { entityType: string; entityId: string };
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export interface ActionLogsResponse {
  items: ActionLogEntry[];
  total: number;
  page: number;
  limit: number;
  date: string;
}

// ─── Challenges / Soumissions ────────────────────────────────────────────────
export interface Challenge {
  id: string; titre: string; description: string;
  categorie: ChallengeCategory; points: number;
  pointsRequis: number;
  niveau: string; statut: string; imageUrl?: string;
  preuveDemandee?: string;
  duree?: number;
  _count?: { submissions: number };
}

export interface Submission {
  id: string; challengeId: string; gardienId: string;
  statut: SubmissionStatus; texte?: string; preuveUrl?: string;
  submittedAt: string; validatedAt?: string;
  publishedToCodex: boolean;
  challenge: Challenge;
  gardien?: Partial<User>;
  reactions?: CodexReaction[];
  _count?: { reactions: number };
}

export interface CodexReaction { id: string; emoji: string; userId: string; }

// ─── Badges ──────────────────────────────────────────────────────────────────
export interface Badge {
  id: string; nom: string; code: string; description: string;
  condition: string; imageUrl?: string; niveau: BadgeLevel;
}
export interface UserBadge { id: string; badge: Badge; awardedAt: string; }

// ─── Messagerie ───────────────────────────────────────────────────────────────
export interface Conversation {
  id: string; type: ConversationType; nom?: string;
  isPinned: boolean; isModerated: boolean;
  lastMessageAt?: string;
  members?: ConversationMember[];
  messages?: Message[];
  _count?: { messages: number };
  unreadCount?: number;
}
export interface ConversationMember {
  id: string; userId: string; role: string;
  lastReadAt?: string; joinedAt: string;
  user?: { id: string; nom: string; prenoms: string; avatarUrl?: string; role: string; parish?: { nom: string } };
}
export interface Message {
  id: string; conversationId: string; authorId: string;
  type: MessageType; contenu?: string;
  author: Partial<User>;
  replyTo?: Partial<Message>;
  createdAt: string; editedAt?: string; deletedAt?: string;
}

// ─── Photothèque ─────────────────────────────────────────────────────────────
export interface CampPhoto {
  id: string;
  url: string;
}

export interface CampPublication {
  id: string;
  caption?: string;
  campId?: string;
  camp?: { id: string; nom: string };
  uploader: { id: string; nom: string; prenoms: string; avatarUrl?: string };
  photos: CampPhoto[];
  createdAt: string;
}

// ─── Annonces ────────────────────────────────────────────────────────────────
export type AnnouncementStatus = 'BROUILLON' | 'PUBLIE' | 'PLANIFIE' | 'ARCHIVE';
export type AnnouncementScope  = 'COMMUNAUTE' | 'REGION' | 'DOYENNE' | 'PAROISSE';

export interface AnnouncementPhoto {
  id: string;
  url: string;
}

export interface Annonce {
  id: string;
  titre: string;
  contenu?: string;
  portee: AnnouncementScope;
  statut: AnnouncementStatus;
  publishedAt?: string;
  expiresAt?: string;
  createdAt: string;
  author: { id: string; nom: string; prenoms: string; avatarUrl?: string };
  photos: AnnouncementPhoto[];
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface AuthTokens { accessToken: string; refreshToken: string; }
