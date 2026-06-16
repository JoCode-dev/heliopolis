'use client';
import { create } from 'zustand';
import { messagingApi, annoncesApi, campsApi } from '@/lib/api';
import type { Conversation, Annonce } from '@/types';

const ANNONCES_KEY = (userId: string) => `annonces_seen_at_${userId}`;

interface UnreadCountsState {
  messages: number;
  annonces: number;
  campRequests: number;
  byCampRequests: Record<string, number>;
  refreshMessages: () => Promise<void>;
  refreshAnnonces: (userId?: string) => Promise<void>;
  refreshCampRequests: () => Promise<void>;
  markAnnoncesRead: (userId: string) => void;
}

export const useUnreadCounts = create<UnreadCountsState>((set) => ({
  messages: 0,
  annonces: 0,
  campRequests: 0,
  byCampRequests: {},

  refreshMessages: async () => {
    try {
      const { data } = await messagingApi.conversations();
      const total = (data as Conversation[]).reduce((acc, c) => acc + (c.unreadCount ?? 0), 0);
      set({ messages: total });
    } catch { /* ignore */ }
  },

  refreshAnnonces: async (userId?: string) => {
    if (!userId) return;
    try {
      const { data } = await annoncesApi.list();
      const annonces = data as Annonce[];
      const stored = typeof window !== 'undefined' ? localStorage.getItem(ANNONCES_KEY(userId)) : null;
      const lastSeen = stored ? new Date(stored) : new Date(0);
      const unseen = annonces.filter(a => new Date(a.publishedAt ?? a.createdAt) > lastSeen).length;
      set({ annonces: unseen });
    } catch { /* ignore */ }
  },

  refreshCampRequests: async () => {
    try {
      const { data } = await campsApi.pendingRequests();
      const d = data as { total: number; byCamp: Record<string, number> };
      set({ campRequests: d.total, byCampRequests: d.byCamp });
    } catch { /* ignore */ }
  },

  markAnnoncesRead: (userId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ANNONCES_KEY(userId), new Date().toISOString());
    }
    set({ annonces: 0 });
  },
}));
