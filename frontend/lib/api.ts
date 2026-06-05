import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
});

// Attach access token from localStorage on each request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, attempt refresh then retry once
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken }, { withCredentials: true });
        localStorage.setItem('access_token', data.accessToken);
        if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/activation';
      }
    }
    return Promise.reject(err);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  activate: (matricule: string) => api.post('/auth/activate', { matricule }),
  login: (identifier: string, password: string) => api.post('/auth/login', { identifier, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (ancienMotDePasse: string, nouveauMotDePasse: string) =>
    api.patch('/auth/change-password', { ancienMotDePasse, nouveauMotDePasse }),
};

// ─── Territories ─────────────────────────────────────────────────────────────
export const territoriesApi = {
  stats: () => api.get('/territories/stats'),
  regions: () => api.get('/territories/regions'),
  districts: (regionId?: string) => api.get('/territories/districts', { params: { regionId } }),
  parishes: (districtId?: string) => api.get('/territories/parishes', { params: { districtId } }),
};

// ─── Camps ───────────────────────────────────────────────────────────────────
export const campsApi = {
  list: (params?: object) => api.get('/camps', { params }),
  get: (id: string) => api.get(`/camps/${id}`),
  create: (data: object) => api.post('/camps', data),
  updateStatus: (id: string, statut: string) => api.patch(`/camps/${id}/status`, { statut }),
  participants: (id: string) => api.get(`/camps/${id}/participants`),
  selectParticipant:   (campId: string, userId: string) => api.post(`/camps/${campId}/participants`, { userId }),
  removeParticipant:   (campId: string, userId: string) => api.delete(`/camps/${campId}/participants/${userId}`),
  blockParticipant:    (campId: string, userId: string) => api.patch(`/camps/${campId}/participants/${userId}/block`),
  unblockParticipant:  (campId: string, userId: string) => api.patch(`/camps/${campId}/participants/${userId}/unblock`),
};

// ─── Challenges ───────────────────────────────────────────────────────────────
export const challengesApi = {
  list: (params?: object) => api.get('/challenges', { params }),
  get: (id: string) => api.get(`/challenges/${id}`),
  create: (data: object) => api.post('/challenges', data),
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
  validate: (id: string, data: object) => api.post(`/challenges/submissions/${id}/validate`, data),
  retractSubmission: (id: string) => api.delete(`/challenges/submissions/${id}`),
  pending: () => api.get('/challenges/pending/submissions'),
};

// ─── Codex ────────────────────────────────────────────────────────────────────
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
  list: () => api.get('/badges'),
  mine: () => api.get('/badges/mine'),
};

// ─── Messaging ────────────────────────────────────────────────────────────────
export const messagingApi = {
  conversations: () => api.get('/messaging/conversations'),
  messages: (id: string, page = 1) => api.get(`/messaging/conversations/${id}/messages`, { params: { page } }),
  send: (id: string, contenu: string, replyToId?: string) => api.post(`/messaging/conversations/${id}/messages`, { contenu, ...(replyToId ? { replyToId } : {}) }),
  markRead: (id: string) => api.post(`/messaging/conversations/${id}/read`),
  createPrivate: (userId: string) => api.post('/messaging/conversations/private', { userId }),
  editMessage: (messageId: string, contenu: string) => api.patch(`/messaging/messages/${messageId}`, { contenu }),
  deleteMessage: (messageId: string) => api.delete(`/messaging/messages/${messageId}`),
  getConversation: (id: string) => api.get(`/messaging/conversations/${id}`),
  addMember: (id: string, userId: string) => api.post(`/messaging/conversations/${id}/members`, { userId }),
  removeMember: (id: string, userId: string) => api.delete(`/messaging/conversations/${id}/members/${userId}`),
  togglePin: (id: string) => api.patch(`/messaging/conversations/${id}/pin`),
  deleteConversation: (id: string) => api.delete(`/messaging/conversations/${id}`),
  createGroup:           (nom: string, memberIds: string[]) => api.post('/messaging/conversations/group', { nom, memberIds }),
  suggestedChannels:     () => api.get('/messaging/conversations/channels/suggestions'),
  createOrJoinChannel:   (channelKey: 'PAROISSE' | 'DOYENNE' | 'REGION' | 'GARDIENS' | 'GUIDES' | 'SENTINELLES') =>
    api.post('/messaging/conversations/channel', { channelKey }),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: object) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: object) => api.post('/users', data),
  update: (id: string, data: object) => api.patch(`/users/${id}`, data),
  updateMe: (data: { nom?: string; prenoms?: string; email?: string; telephone?: string }) =>
    api.patch('/users/me', data),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.patch('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
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

// ─── Export ───────────────────────────────────────────────────────────────────
export const exportApi = {
  campParticipants: (campId: string) =>
    `${BASE}/export/camps/${campId}/participants`,
  campParticipantsFile: (campId: string) =>
    api.get(`/export/camps/${campId}/participants`, { responseType: 'blob' }),
};
