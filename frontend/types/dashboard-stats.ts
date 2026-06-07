import type { CampStatus } from '@/types';

export interface DashboardStats {
  overview: {
    totalGardiens: number;
    campsOuverts: number;
    defisValides: number;
    districts: number;
    sentinelles: number;
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
