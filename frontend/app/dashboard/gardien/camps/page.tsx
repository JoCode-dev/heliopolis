'use client';
import { useEffect, useState } from 'react';
import { campsApi } from '@/lib/api';
import { CampCard } from '@/components/camps/CampCard';
import type { Camp } from '@/types';

type CampFilter = 'TOUS' | 'OUVERT' | 'EN_COURS' | 'CLOTURE';

const FILTERS: { label: string; value: CampFilter }[] = [
  { label: 'Tous', value: 'TOUS' },
  { label: 'Ouverts', value: 'OUVERT' },
  { label: 'En cours', value: 'EN_COURS' },
  { label: 'Clôturés', value: 'CLOTURE' },
];

const STATUS_ORDER: Record<string, number> = {
  OUVERT: 0, EN_COURS: 1, BROUILLON: 2, CLOTURE: 3, ARCHIVE: 4,
};

export default function GardienCampsPage() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CampFilter>('TOUS');

  useEffect(() => {
    campsApi.list()
      .then(r => setCamps(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = (filter === 'TOUS' ? camps : camps.filter(c => c.statut === filter))
    .slice()
    .sort((a, b) => (STATUS_ORDER[a.statut] ?? 99) - (STATUS_ORDER[b.statut] ?? 99));

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] text-white px-4 pt-4 pb-4 flex-shrink-0">
        <h1 className="text-xl font-bold">⛺ Camps</h1>
        <p className="text-xs opacity-85 mt-0.5">Camps des Gardiens de la Création</p>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 bg-[#fafafa]">
        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                filter === f.value
                  ? 'bg-[#E55A35] text-white'
                  : 'bg-[#f3f3f5] text-[#6b6b78]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-10 text-[#6b6b78] text-sm">Chargement…</div>
        )}

        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(camp => (
            <CampCard key={camp.id} camp={camp} href={`/dashboard/gardien/camps/${camp.id}`} />
          ))}
        </div>

        {!loading && filtered.length === 0 && (
          <div className="text-center py-10 text-[#6b6b78] text-sm">
            <div className="text-3xl mb-2">⛺</div>
            <p>Aucun camp dans cette catégorie.</p>
          </div>
        )}
      </div>
    </div>
  );
}
