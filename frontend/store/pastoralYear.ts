import { create } from 'zustand';
import { settingsApi } from '@/lib/api';

interface PastoralYearStore {
  annee: number;
  loaded: boolean;
  load: () => Promise<void>;
  update: (annee: number) => Promise<{ annee: number; membresInitialises: number }>;
}

export const usePastoralYear = create<PastoralYearStore>((set, get) => ({
  annee: new Date().getFullYear(),
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const { data } = await settingsApi.getAnneePastorale();
      set({ annee: data.annee, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  update: async (annee: number) => {
    const { data } = await settingsApi.setAnneePastorale(annee);
    set({ annee: data.annee });
    return data as { annee: number; membresInitialises: number };
  },
}));
