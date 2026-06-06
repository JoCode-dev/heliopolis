import { create } from 'zustand';
import { settingsApi } from '@/lib/api';

interface PastoralYearStore {
  annee: number;
  loaded: boolean;
  load: () => Promise<void>;
  update: (annee: number) => Promise<void>;
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
    await settingsApi.setAnneePastorale(annee);
    set({ annee });
  },
}));
