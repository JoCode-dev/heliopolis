'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { territoriesApi, usersApi } from '@/lib/api';
import { Pill } from '@/components/ui';
import type { District, User } from '@/types';

export default function DistrictsPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [sentinelles, setSentinelles] = useState<User[]>([]);
  const [gardiens, setGardiens] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [d, s, g] = await Promise.all([
          territoriesApi.districts(),
          usersApi.list({ role: 'SENTINELLE' }),
          usersApi.list({ role: 'GARDIEN' }),
        ]);
        setDistricts(d.data);
        setSentinelles(s.data);
        setGardiens(g.data);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const sentinelleByDistrict = new Map<string, User>();
  for (const s of sentinelles) {
    if (s.district?.id) sentinelleByDistrict.set(s.district.id, s);
  }

  const gardienCountByDistrict = new Map<string, number>();
  const adhesionsByDistrict = new Map<string, { total: number; aJour: number }>();
  for (const g of gardiens) {
    if (!g.district?.id) continue;
    const id = g.district.id;
    gardienCountByDistrict.set(id, (gardienCountByDistrict.get(id) ?? 0) + 1);
    const current = adhesionsByDistrict.get(id) ?? { total: 0, aJour: 0 };
    const aJour = g.adhesions?.some(a => a.statut === 'A_JOUR') ?? false;
    adhesionsByDistrict.set(id, { total: current.total + 1, aJour: current.aJour + (aJour ? 1 : 0) });
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-5 border-b border-[#ececf0] pb-4">
        <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E]">🛡️ Districts</h1>
        <div className="text-sm text-[#6b6b78]">{districts.length} district{districts.length > 1 ? 's' : ''}</div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-[#6b6b78] text-sm">Chargement…</div>
      )}

      {!loading && districts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-[#6b6b78]">
          <div className="text-5xl mb-3">🛡️</div>
          <p className="font-semibold">Aucun district trouvé</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {districts.map(district => {
          const sentinelle = sentinelleByDistrict.get(district.id);
          const nbGardiens = gardienCountByDistrict.get(district.id) ?? 0;
          const nbParoisses = district._count?.parishes ?? 0;
          const adh = adhesionsByDistrict.get(district.id) ?? { total: 0, aJour: 0 };
          const pct = adh.total > 0 ? Math.round((adh.aJour / adh.total) * 100) : 0;

          return (
            <div key={district.id} className="bg-white border border-[#ececf0] rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[#1F1B2E]">{district.nom}</h2>
                  <p className="text-xs text-[#6b6b78] mt-0.5">{district.region?.nom ?? '—'}</p>
                </div>
                {sentinelle
                  ? <Pill variant="vert">✓ Actif</Pill>
                  : <Pill variant="or">⏳ Sans sentinelle</Pill>
                }
              </div>

              <div className="border-t border-[#f0f0f4] pt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6b6b78]">Sentinelle</span>
                  <span className="font-semibold text-[#1F1B2E]">
                    {sentinelle ? `${sentinelle.prenoms} ${sentinelle.nom}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b6b78]">Paroisses</span>
                  <span className="font-semibold text-[#1F1B2E]">{nbParoisses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b6b78]">Gardiens</span>
                  <span className="font-semibold text-[#1F1B2E]">{nbGardiens}</span>
                </div>

                {/* Taux d'adhésion */}
                <div className="pt-2 border-t border-[#f0f0f4]">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[#6b6b78]">Adhésions à jour</span>
                    <span className={`font-bold text-xs ${pct >= 80 ? 'text-[#2E7D32]' : pct >= 50 ? 'text-[#D9A441]' : 'text-[#E55A35]'}`}>
                      {adh.aJour}/{adh.total} — {pct}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#f0f0f4] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 80 ? '#2E7D32' : pct >= 50 ? '#D9A441' : '#E55A35',
                      }}
                    />
                  </div>
                </div>
              </div>

              <Link
                href={`/dashboard/region/paroisses?districtId=${district.id}`}
                className="mt-auto text-center text-xs border border-[#e6e6ea] text-[#1F1B2E] rounded-lg px-3 py-2 font-semibold hover:bg-[#f6f6fa] transition-colors">
                Voir paroisses →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
