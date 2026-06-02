import { campsApi } from '@/lib/api';
import type { Camp } from '@/types';
import { CampsClient } from '@/components/camps/CampsClient';

const STATUS_ORDER: Record<string, number> = {
  EN_COURS:  0,
  OUVERT:    1,
  BROUILLON: 2,
  CLOTURE:   3,
  ARCHIVE:   4,
};

async function getCamps(): Promise<Camp[]> {
  try {
    const { data } = await campsApi.list();
    const camps = data as Camp[];
    return camps.sort((a, b) => {
      const diff = (STATUS_ORDER[a.statut] ?? 5) - (STATUS_ORDER[b.statut] ?? 5);
      if (diff !== 0) return diff;
      return new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime();
    });
  } catch {
    return [];
  }
}

export default async function CampsPage() {
  const camps = await getCamps();
  return <CampsClient initialCamps={camps} />;
}
