export interface Rang {
  label: string;
  icon: string;
  color: string;
  minPoints: number;
}

export const RANGS: Rang[] = [
  { label: 'Novice de la Création',  icon: '🌱', color: '#6b6b78', minPoints: 0    },
  { label: 'Gardien en Éveil',       icon: '🔥', color: '#D9A441', minPoints: 50   },
  { label: 'Gardien Confirmé',       icon: '⚔️',  color: '#C62828', minPoints: 150  },
  { label: 'Gardien de la Flamme',   icon: '🛡️',  color: '#6A1B9A', minPoints: 300  },
  { label: 'Gardien Éclairé',        icon: '✨', color: '#2E7D32', minPoints: 500  },
  { label: 'Gardien Légendaire',     icon: '⚜️',  color: '#1F1B2E', minPoints: 1000 },
];

export function getRangGardien(points: number): Rang {
  let rang = RANGS[0];
  for (const r of RANGS) {
    if (points >= r.minPoints) rang = r;
    else break;
  }
  return rang;
}

export function getNextRang(points: number): Rang | null {
  for (const r of RANGS) {
    if (points < r.minPoints) return r;
  }
  return null;
}

export function getRangProgress(points: number): number {
  const current = getRangGardien(points);
  const next = getNextRang(points);
  if (!next) return 100;
  const range = next.minPoints - current.minPoints;
  const done  = points - current.minPoints;
  return Math.round((done / range) * 100);
}
