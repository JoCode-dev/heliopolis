'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { campsApi } from '@/lib/api';
import { CampCard } from '@/components/camps/CampCard';
import type { Camp } from '@/types';

export default function GuideCampsPage() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    campsApi.list({ statut: 'OUVERT' })
      .then(r => setCamps(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] text-white px-4 pt-4 pb-4 flex-shrink-0">
        <h1 className="text-xl font-bold">⛺ Camps</h1>
        <p className="text-xs opacity-85 mt-0.5">Sélectionne les participants</p>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-[#6b6b78] text-sm">
            <div className="text-3xl mb-3 animate-pulse">⛺</div>
            <p>Chargement…</p>
          </div>
        )}

        {!loading && camps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-[#6b6b78] text-sm">
            <div className="text-4xl mb-3">⛺</div>
            <p className="font-semibold text-[#1F1B2E]">Aucun camp ouvert</p>
            <p className="text-xs mt-1 text-center leading-relaxed">
              Les camps disponibles pour la sélection apparaîtront ici.
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {camps.map(camp => (
          <div key={camp.id} className="mb-4">
            <CampCard camp={camp} href={`/dashboard/guide/camps/${camp.id}`} />
            <Link
              href={`/dashboard/guide/selection/${camp.id}`}
              className="block w-full text-center bg-[#6A1B9A] text-white font-bold text-sm py-2.5 rounded-xl -mt-1"
            >
              Sélectionner →
            </Link>
          </div>
        ))}
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
