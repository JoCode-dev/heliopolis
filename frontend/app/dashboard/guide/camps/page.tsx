'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { campsApi } from '@/lib/api';
import { CampCard } from '@/components/camps/CampCard';
import { useUnreadCounts } from '@/store/unreadCounts';
import type { Camp } from '@/types';

export default function GuideCampsPage() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);

  const byCampRequests      = useUnreadCounts(s => s.byCampRequests);
  const campRequests         = useUnreadCounts(s => s.campRequests);
  const refreshCampRequests  = useUnreadCounts(s => s.refreshCampRequests);

  useEffect(() => {
    void refreshCampRequests();
    campsApi.list({ statut: 'OUVERT' })
      .then(r => setCamps(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Camps avec demandes en attente en premier
  const sorted = [...camps].sort((a, b) => {
    const pa = byCampRequests[a.id] ?? 0;
    const pb = byCampRequests[b.id] ?? 0;
    return pb - pa;
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] text-white px-4 pt-4 pb-4 flex-shrink-0">
        <h1 className="text-xl font-bold">⛺ Camps</h1>
        <p className="text-xs opacity-85 mt-0.5">Sélectionne les participants</p>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8">

        {/* Bannière d'alerte si des gardiens attendent */}
        {!loading && campRequests > 0 && (
          <div className="mb-4 rounded-2xl overflow-hidden border border-[#D9A441] shadow-[0_0_16px_rgba(217,164,65,0.25)]">
            <div className="bg-[#D9A441] px-4 py-2 flex items-center gap-2">
              <span className="text-white text-sm font-black uppercase tracking-wide">Action requise</span>
            </div>
            <div className="bg-[#fffbef] px-4 py-3 flex items-center gap-3">
              <div className="text-3xl animate-bounce">⏳</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[#7a5800]">
                  {campRequests} gardien{campRequests > 1 ? 's' : ''} {campRequests > 1 ? 'attendent' : 'attend'} ta sélection
                </p>
                <p className="text-[11px] text-[#9c7218] mt-0.5">
                  Ouvre le camp concerné et valide leur participation.
                </p>
              </div>
              <span className="text-[#D9A441] text-lg font-black">›</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-[#6b6b78] text-sm">
            <div className="text-3xl mb-3 animate-pulse">⛺</div>
            <p>Chargement…</p>
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-[#6b6b78] text-sm">
            <div className="text-4xl mb-3">⛺</div>
            <p className="font-semibold text-[#1F1B2E]">Aucun camp ouvert</p>
            <p className="text-xs mt-1 text-center leading-relaxed">
              Les camps disponibles pour la sélection apparaîtront ici.
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map(camp => {
            const pending = byCampRequests[camp.id] ?? 0;
            return (
              <div key={camp.id} className="mb-4">
                <CampCard
                  camp={camp}
                  href={`/dashboard/guide/camps/${camp.id}`}
                  pendingCount={pending}
                />
                <Link
                  href={`/dashboard/guide/selection/${camp.id}`}
                  className={`block w-full text-center font-bold text-sm py-2.5 rounded-xl -mt-1 transition-colors ${
                    pending > 0
                      ? 'bg-[#D9A441] text-white hover:bg-[#c49030]'
                      : 'bg-[#6A1B9A] text-white hover:bg-[#5a1280]'
                  }`}
                >
                  {pending > 0 ? `⏳ Traiter ${pending} demande${pending > 1 ? 's' : ''} →` : 'Sélectionner →'}
                </Link>
              </div>
            );
          })}
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
