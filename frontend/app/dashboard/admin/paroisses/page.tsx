'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { territoriesApi, usersApi } from '@/lib/api';
import { Select } from '@/components/ui';
import type { District, Parish, User } from '@/types';

function ParoissesContent() {
  const searchParams = useSearchParams();
  const initialDistrictId = searchParams.get('districtId') ?? '';

  const [districts, setDistricts] = useState<District[]>([]);
  const [parishes, setParishes] = useState<Parish[]>([]);
  const [guides, setGuides] = useState<User[]>([]);
  const [gardiens, setGardiens] = useState<User[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState(initialDistrictId);
  const [loading, setLoading] = useState(true);
  const [loadingParishes, setLoadingParishes] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [d, g, gar] = await Promise.all([
          territoriesApi.districts(),
          usersApi.list({ role: 'GUIDE' }),
          usersApi.list({ role: 'GARDIEN' }),
        ]);
        setDistricts(d.data);
        setGuides(g.data);
        setGardiens(gar.data);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedDistrictId) {
      setParishes([]);
      return;
    }
    setLoadingParishes(true);
    (async () => {
      try {
        const { data } = await territoriesApi.parishes(selectedDistrictId);
        setParishes(data);
      } catch { setParishes([]); }
      finally { setLoadingParishes(false); }
    })();
  }, [selectedDistrictId]);

  const guideByParish = new Map<string, User>();
  for (const g of guides) {
    if (g.parish?.id) guideByParish.set(g.parish.id, g);
  }

  const gardiensByParish = new Map<string, number>();
  for (const g of gardiens) {
    if (g.parish?.id) {
      gardiensByParish.set(g.parish.id, (gardiensByParish.get(g.parish.id) ?? 0) + 1);
    }
  }

  const adhesionsByParish = new Map<string, { total: number; aJour: number }>();
  for (const g of gardiens) {
    if (g.parish?.id) {
      const key = g.parish.id;
      const current = adhesionsByParish.get(key) ?? { total: 0, aJour: 0 };
      const aJour = g.adhesions?.some(a => a.statut === 'A_JOUR') ?? false;
      adhesionsByParish.set(key, { total: current.total + 1, aJour: current.aJour + (aJour ? 1 : 0) });
    }
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-5 border-b border-[#ececf0] pb-4">
        <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E]">⛪ Paroisses</h1>
        <div className="text-sm text-[#6b6b78]">{parishes.length} paroisse{parishes.length > 1 ? 's' : ''}</div>
      </div>

      {/* Select district */}
      <div className="mb-5 max-w-sm">
        {loading ? (
          <div className="h-10 bg-white border border-[#e6e6ea] rounded-xl animate-pulse" />
        ) : (
          <Select
            value={selectedDistrictId}
            onChange={e => setSelectedDistrictId(e.target.value)}
            className="w-full">
            <option value="">— Tous les districts —</option>
            {districts.map(d => (
              <option key={d.id} value={d.id}>{d.nom}</option>
            ))}
          </Select>
        )}
      </div>

      {loadingParishes && (
        <div className="flex items-center justify-center py-16 text-[#6b6b78] text-sm">Chargement…</div>
      )}

      {!loadingParishes && selectedDistrictId && parishes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-[#6b6b78]">
          <div className="text-5xl mb-3">⛪</div>
          <p className="font-semibold">Aucune paroisse dans ce district</p>
        </div>
      )}

      {!selectedDistrictId && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-[#6b6b78]">
          <div className="text-5xl mb-3">🛡️</div>
          <p className="font-semibold">Sélectionnez un district pour voir ses paroisses</p>
        </div>
      )}

      {parishes.length > 0 && !loadingParishes && (
        <div className="bg-white border border-[#ececf0] rounded-2xl overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#f9f9fc] text-[#6b6b78] uppercase tracking-wide">
                {['Paroisse', 'District', 'Guide', 'Gardiens', 'Adhésions à jour'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold border-b border-[#ececf0]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parishes.map(parish => {
                const guide = guideByParish.get(parish.id);
                const nbGardiens = gardiensByParish.get(parish.id) ?? 0;
                const adh = adhesionsByParish.get(parish.id);
                const adhStr = adh ? `${adh.aJour} / ${adh.total}` : '—';

                return (
                  <tr key={parish.id} className="border-b border-[#f0f0f4] hover:bg-[#fafafc]">
                    <td className="px-4 py-3 font-semibold text-[#1F1B2E]">{parish.nom}</td>
                    <td className="px-4 py-3 text-[#6b6b78]">{parish.district?.nom ?? '—'}</td>
                    <td className="px-4 py-3 text-[#6b6b78]">
                      {guide ? `${guide.prenoms} ${guide.nom}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-[#1F1B2E]">{nbGardiens}</td>
                    <td className="px-4 py-3 text-[#6b6b78]">{adhStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminParoissesPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-[#6b6b78] text-sm">Chargement…</div>}>
      <ParoissesContent />
    </Suspense>
  );
}
