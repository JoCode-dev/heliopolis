import axios from 'axios';
import type { DashboardStats } from '@/types/dashboard-stats';
import { rewriteMediaUrls } from '@/lib/media';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4002/api';

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
  timeout: 20_000,
});

// On 401, tenter un refresh via cookie httpOnly puis rejouer la requête
let _refreshing = false;
let _refreshFailed = false;

api.interceptors.response.use(
  (r) => {
    _refreshFailed = false;
    if (r.data) r.data = rewriteMediaUrls(r.data);
    return r;
  },
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry && !_refreshFailed) {
      original._retry = true;
      if (_refreshing) return Promise.reject(err);
      _refreshing = true;
      try {
        // Le cookie refresh_token (httpOnly, path=/api/auth/refresh) est envoyé automatiquement
        await axios.post(`${BASE}/auth/refresh`, {}, { withCredentials: true });
        _refreshing = false;
        return api(original);
      } catch {
        _refreshing = false;
        _refreshFailed = true;
        if (typeof window !== 'undefined') {
          window.location.href = '/activation';
        }
      }
    }
    return Promise.reject(err);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  /** Vérifie qu'un matricule est pré-enregistré et disponible pour l'inscription */
  verifierMatricule: (matricule: string) =>
    api.post<{ userId: string; role: string; hasProfile: boolean; nom: string | null; prenoms: string | null }>('/auth/verifier-matricule', { matricule }),
  /** Inscription : vérifie matricule + date de naissance et crée le compte */
  inscrire: (data: {
    nom: string;
    prenoms: string;
    matricule: string;
    dateNaissance: string; // YYYY-MM-DD
    password: string;
  }) => api.post<{ accessToken: string; refreshToken: string }>('/auth/inscrire', data),
  activate: (matricule: string) => api.post('/auth/activate', { matricule }),
  login: (identifier: string, password: string) => api.post('/auth/login', { identifier, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  wsToken: () => api.get<{ token: string }>('/auth/ws-token'),
  changePassword: (ancienMotDePasse: string, nouveauMotDePasse: string) =>
    api.patch('/auth/change-password', { ancienMotDePasse, nouveauMotDePasse }),
};

// ─── Territories ─────────────────────────────────────────────────────────────
export const territoriesApi = {
  stats: () => api.get('/territories/stats'),
  dashboardStats: () => api.get<DashboardStats>('/territories/dashboard-stats'),
  regions: () => api.get('/territories/regions'),
  districts: (regionId?: string) => api.get('/territories/districts', { params: { regionId } }),
  parishes: (districtId?: string) => api.get('/territories/parishes', { params: { districtId } }),
  createDistrict: (data: { nom: string; code?: string; regionId: string }) => api.post('/territories/districts', data),
  renameDistrict: (id: string, nom: string) => api.patch(`/territories/districts/${id}/rename`, { nom }),
  mergeDistricts: (sourceId: string, targetId: string) => api.post(`/territories/districts/${sourceId}/merge`, { targetId }),
  deleteDistrict: (id: string) => api.delete(`/territories/districts/${id}`),
  createParish: (data: { nom: string; districtId: string }) => api.post('/territories/parishes', data),
  deleteParish: (id: string) => api.delete(`/territories/parishes/${id}`),
  compareExcel: (fichier: File) => {
    const form = new FormData();
    form.append('fichier', fichier);
    return api.post('/territories/compare-excel', form);
  },
  appliquerExcel: (fichier: File) => {
    const form = new FormData();
    form.append('fichier', fichier);
    return api.post('/territories/appliquer-excel', form);
  },
  completerDistricts: () => api.post<{ corriges: number }>('/territories/completer-districts'),
};

// ─── Camps ───────────────────────────────────────────────────────────────────
export const campsApi = {
  list: (params?: Record<string, unknown>) => api.get('/camps', { params }),
  get: (id: string) => api.get(`/camps/${id}`),
  create: (data: Record<string, unknown>) => api.post('/camps', data),
  updateStatus: (id: string, statut: string) => api.patch(`/camps/${id}/status`, { statut }),
  participants: (id: string) => api.get(`/camps/${id}/participants`),
  selectParticipant:   (campId: string, userId: string) => api.post(`/camps/${campId}/participants`, { userId }),
  removeParticipant:   (campId: string, userId: string) => api.delete(`/camps/${campId}/participants/${userId}`),
  blockParticipant:    (campId: string, userId: string) => api.patch(`/camps/${campId}/participants/${userId}/block`),
  unblockParticipant:  (campId: string, userId: string) => api.patch(`/camps/${campId}/participants/${userId}/unblock`),
  myParticipation:     (campId: string) => api.get(`/camps/${campId}/my-participation`),
  expressInterest:     (campId: string) => api.post(`/camps/${campId}/express-interest`),
  withdrawInterest:    (campId: string) => api.delete(`/camps/${campId}/withdraw`),
  pendingRequests:     () => api.get('/camps/requests-pending'),
  toggleChargeSecurite: (campId: string, userId: string) => api.patch(`/camps/${campId}/participants/${userId}/charge-securite`),
  validerDemande:       (campId: string, userId: string) => api.patch(`/camps/${campId}/participants/${userId}/valider-demande`),
  autorisations:       (campId: string) => api.get(`/camps/${campId}/autorisations`),
  createAutorisation:  (campId: string, data: { motif: string; heureSortie: string; dateHeureRetour: string; personneIds: string[] }) => api.post(`/camps/${campId}/autorisations`, data),
  validerAutorisation: (campId: string, id: string, reponse?: string) => api.patch(`/camps/${campId}/autorisations/${id}/valider`, { reponse }),
  refuserAutorisation: (campId: string, id: string, reponse?: string) => api.patch(`/camps/${campId}/autorisations/${id}/refuser`, { reponse }),
};

// ─── Challenges ───────────────────────────────────────────────────────────────
export const challengesApi = {
  list: (params?: Record<string, unknown>) => api.get('/challenges', { params }),
  get: (id: string) => api.get(`/challenges/${id}`),
  create: (data: Record<string, unknown>) => api.post('/challenges', data),
  mySubmissions: () => api.get('/challenges/my/submissions'),
  submit: (id: string, data: { texte?: string; preuveUrl?: string }, photo?: File | null) => {
    if (photo) {
      const form = new FormData();
      if (data.texte) form.append('texte', data.texte);
      form.append('preuve', photo);
      return api.post(`/challenges/${id}/submit`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return api.post(`/challenges/${id}/submit`, data);
  },
  validate: (id: string, data: Record<string, unknown>) => api.post(`/challenges/submissions/${id}/validate`, data),
  retractSubmission: (id: string) => api.delete(`/challenges/submissions/${id}`),
  pending: () => api.get('/challenges/pending/submissions'),
};

// ─── Photothèque ──────────────────────────────────────────────────────────────
export const photothequeApi = {
  publications: (campId?: string, cursor?: string, limit = 12) =>
    api.get('/phototheque/publications', {
      params: { ...(campId ? { campId } : {}), ...(cursor ? { cursor } : {}), limit },
    }),
  camps: () => api.get('/phototheque/camps'),
  createPublication: (files: File[], campId?: string, caption?: string) => {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    if (campId)  fd.append('campId', campId);
    if (caption) fd.append('caption', caption);
    return api.post('/phototheque/publications', fd);
  },
  deletePublication: (id: string) => api.delete(`/phototheque/publications/${id}`),
};

// ─── Annonces ────────────────────────────────────────────────────────────────
export const annoncesApi = {
  list: () => api.get('/annonces'),
  listAll: () => api.get('/annonces/all'),
  create: (
    body: { titre: string; contenu?: string; portee?: string; statut?: string; publishedAt?: string; expiresAt?: string },
    photos?: File[],
  ) => {
    const fd = new FormData();
    Object.entries(body).forEach(([k, v]) => { if (v !== undefined) fd.append(k, v); });
    photos?.forEach(f => fd.append('photos', f));
    return api.post('/annonces', fd);
  },
  update: (
    id: string,
    body: { titre?: string; contenu?: string; portee?: string; statut?: string; publishedAt?: string; expiresAt?: string },
    photos?: File[],
  ) => {
    const fd = new FormData();
    Object.entries(body).forEach(([k, v]) => { if (v !== undefined) fd.append(k, v as string); });
    photos?.forEach(f => fd.append('photos', f));
    return api.patch(`/annonces/${id}`, fd);
  },
  deletePhoto: (photoId: string) => api.delete(`/annonces/photos/${photoId}`),
  remove: (id: string) => api.delete(`/annonces/${id}`),
};

// ─── Conseils ─────────────────────────────────────────────────────────────────
const API_BASE = BASE;

async function publicFetch<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message ?? 'Erreur API'), {
      status: res.status,
      message: body.message ?? 'Erreur API',
    });
  }
  return res.json() as Promise<T>;
}

export const councilsApi = {
  list:   ()                           => api.get('/councils'),
  get:    (id: string)                 => api.get(`/councils/${id}`),
  create: (data: Record<string, unknown>)               => api.post('/councils', data),
  update: (id: string, data: Record<string, unknown>)   => api.patch(`/councils/${id}`, data),
  remove: (id: string)                 => api.delete(`/councils/${id}`),
  getParticipants: (id: string)        => api.get(`/councils/${id}/participants`),
};

export const councilsPublicApi = {
  getByToken: (token: string) =>
    publicFetch(`/councils/public/${token}`),
  register: (
    token: string,
    data: Record<string, unknown>,
    accessToken?: string | null,
  ) =>
    publicFetch(`/councils/public/${token}/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, accessToken),
  updateFeedback: (
    token: string,
    data: Record<string, unknown>,
    accessToken?: string | null,
  ) =>
    publicFetch(`/councils/public/${token}/feedback`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, accessToken),
};

export const logsApi = {
  dates: () => api.get<string[]>('/logs/dates'),
  list: (params?: {
    date?: string;
    action?: string;
    category?: string;
    actorId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => api.get('/logs', { params }),
  deleteByDate: (date: string) => api.delete(`/logs/${date}`),
  deleteAll: () => api.delete('/logs/all'),
};

export const codexApi = {
  wall: (page = 1) => api.get('/codex/wall', { params: { page } }),
  react:   (id: string, emoji = '❤️') => api.post(`/codex/${id}/react`, { emoji }),
  unreact: (id: string, emoji = '❤️') => api.delete(`/codex/${id}/react`, { data: { emoji } }),
  pending: () => api.get('/codex/moderation/pending'),
  approve: (id: string) => api.post(`/codex/${id}/approve`),
  reject: (id: string, reason: string) => api.post(`/codex/${id}/reject`, { reason }),
};

// ─── Badges ───────────────────────────────────────────────────────────────────
export const badgesApi = {
  list:   () => api.get('/badges'),
  mine:   () => api.get('/badges/mine'),
  create: (body: Record<string, unknown>) => api.post('/badges', body),
  update: (id: string, body: Record<string, unknown>) => api.patch(`/badges/${id}`, body),
  remove: (id: string) => api.delete(`/badges/${id}`),
};

// ─── Messaging ────────────────────────────────────────────────────────────────
export const messagingApi = {
  conversations: () => api.get('/messaging/conversations'),
  messages: (id: string, page = 1, since?: string, last?: number) => api.get(`/messaging/conversations/${id}/messages`, { params: { page, ...(since ? { since } : {}), ...(last ? { last } : {}) } }),
  send: (id: string, contenu: string, replyToId?: string) => api.post(`/messaging/conversations/${id}/messages`, { contenu, ...(replyToId ? { replyToId } : {}) }),
  markRead: (id: string) => api.post(`/messaging/conversations/${id}/read`),
  createPrivate: (userId: string) => api.post('/messaging/conversations/private', { userId }),
  editMessage: (messageId: string, contenu: string) => api.patch(`/messaging/messages/${messageId}`, { contenu }),
  deleteMessage: (messageId: string) => api.delete(`/messaging/messages/${messageId}`),
  getConversation: (id: string) => api.get(`/messaging/conversations/${id}`),
  addMember: (id: string, userId: string) => api.post(`/messaging/conversations/${id}/members`, { userId }),
  removeMember: (id: string, userId: string) => api.delete(`/messaging/conversations/${id}/members/${userId}`),
  restrictMember: (id: string, userId: string) => api.patch(`/messaging/conversations/${id}/members/${userId}/restrict`),
  togglePin: (id: string) => api.patch(`/messaging/conversations/${id}/pin`),
  deleteConversation: (id: string) => api.delete(`/messaging/conversations/${id}`),
  createGroup:           (nom: string, memberIds: string[]) => api.post('/messaging/conversations/group', { nom, memberIds }),
  suggestedChannels:     () => api.get('/messaging/conversations/channels/suggestions'),
  createOrJoinChannel:   (channelKey: 'PAROISSE' | 'DOYENNE' | 'REGION' | 'GARDIENS' | 'GUIDES' | 'SENTINELLES' | 'DIFFUSION') =>
    api.post('/messaging/conversations/channel', { channelKey }),
  syncMembers: (conversationId: string) => api.post(`/messaging/conversations/${conversationId}/sync-members`),
  search: (q: string) => api.get('/messaging/search', { params: { q } }),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: Record<string, unknown>) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  /** Pré-enregistre un matricule (ADMIN) — détermine le rôle via l'âge */
  preEnregistrer: (data: {
    matricule: string;
    dateNaissance: string;
    nom?: string;
    prenoms?: string;
    regionId?: string;
    districtId?: string;
    parishId?: string;
  }) => api.post('/users/pre-enregistrer', data),
  /** Import en masse CSV/Excel de matricules (ADMIN) */
  importerMatricules: (file: File, forceRole?: string) => {
    const form = new FormData();
    form.append('fichier', file);
    if (forceRole) form.append('forceRole', forceRole);
    return api.post('/users/importer', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  /** Changer le rôle d'un membre (promotion ou rétrogradation entre GUIDE, SENTINELLE, REGION) */
  promouvoir: (id: string, role: 'GUIDE' | 'SENTINELLE' | 'REGION') =>
    api.patch(`/users/${id}/promouvoir`, { role }),
  /** Attribuer ou retirer le sous-rôle régional (RESPONSABLE, ADJOINT, CHARGE_COMMUNICATION) */
  setRegionRole: (id: string, regionRole: string | null) =>
    api.patch(`/users/${id}/region-role`, { regionRole }),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/users/${id}`, data),
  updateMe: (data: { nom?: string; prenoms?: string; email?: string; telephone?: string }) =>
    api.patch('/users/me', data),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.patch('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  purger: (id: string) =>
    api.delete(`/users/${id}/purger`),
  valider: (id: string) =>
    api.patch(`/users/${id}/valider`),
  rejeter: (id: string) =>
    api.patch(`/users/${id}/rejeter`),
  resetPassword: (id: string, password: string) =>
    api.patch(`/users/${id}/reset-password`, { password }),
  updateStatut: (id: string, statut: string) =>
    api.patch(`/users/${id}/statut`, { statut }),
  updateAdhesion: (id: string, annee: number, statut: string, file?: File) => {
    if (file) {
      const form = new FormData();
      form.append('annee', String(annee));
      form.append('statut', statut);
      form.append('preuve', file);
      return api.patch(`/users/${id}/adhesion`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.patch(`/users/${id}/adhesion`, { annee, statut });
  },
};

// ─── Contacts ─────────────────────────────────────────────────────────────────
export const contactsApi = {
  /** Membres de ma paroisse (contacts auto) */
  parish: () => api.get('/contacts/parish'),
  /** Mes contacts acceptés (hors paroisse) */
  list: () => api.get('/contacts'),
  /** Demandes reçues */
  received: () => api.get('/contacts/requests/received'),
  /** Demandes envoyées */
  sent: () => api.get('/contacts/requests/sent'),
  /** Rechercher un utilisateur */
  search: (q: string) => api.get('/contacts/search', { params: { q } }),
  /** Envoyer une demande */
  request: (userId: string) => api.post(`/contacts/request/${userId}`),
  /** Accepter une demande */
  accept: (contactId: string) => api.patch(`/contacts/${contactId}/accept`),
  /** Refuser / annuler une demande */
  decline: (contactId: string) => api.delete(`/contacts/${contactId}`),
};

// ─── Settings ────────────────────────────────────────────────────────────────
export const settingsApi = {
  getAnneePastorale: () => api.get('/settings/annee-pastorale'),
  setAnneePastorale: (annee: number) => api.patch('/settings/annee-pastorale', { annee }),
};

// ─── Notifications (PWA push) ────────────────────────────────────────────────
export const notificationsApi = {
  getVapidPublicKey: () => api.get<{ publicKey: string }>('/notifications/vapid-public-key'),
  subscribe: (data: {
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  }) => api.post('/notifications/subscribe', data),
  unsubscribe: (endpoint: string) =>
    api.delete('/notifications/subscribe', { data: { endpoint } }),
  updatePreferences: (data: { notifPush?: boolean; notifEmail?: boolean }) =>
    api.patch('/notifications/preferences', data),
};

// ─── Export ───────────────────────────────────────────────────────────────────
export const exportApi = {
  campParticipants: (campId: string) =>
    `${BASE}/export/camps/${campId}/participants`,
  campParticipantsFile: (campId: string) =>
    api.get(`/export/camps/${campId}/participants`, { responseType: 'blob' }),
  adhesionsFile: (annee?: number, campId?: string) =>
    api.get('/export/adhesions', {
      params: { ...(annee ? { annee } : {}), ...(campId ? { campId } : {}) },
      responseType: 'blob',
    }),
};
