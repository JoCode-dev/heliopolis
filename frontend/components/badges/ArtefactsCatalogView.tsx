'use client';
import { useEffect, useState } from 'react';
import { badgesApi } from '@/lib/api';
import { SectionTitle } from '@/components/ui';
import type { Badge } from '@/types';

const LEVEL_EMOJI: Record<string, string> = {
  BRONZE: '🪨', ARGENT: '🥈', OR: '🏅', LEGENDE: '⚜️',
};

const LEVEL_PILL: Record<string, string> = {
  BRONZE:  'bg-amber-700/15 text-amber-700',
  ARGENT:  'bg-gray-300/40 text-gray-500',
  OR:      'bg-yellow-400/20 text-yellow-600',
  LEGENDE: 'bg-purple-500/20 text-purple-700',
};

export function ArtefactsCatalogView() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    badgesApi.list()
      .then(r => { setBadges(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-10 text-[#6b6b78] text-sm">Chargement…</div>;
  }

  if (!badges.length) {
    return (
      <div className="text-center py-10 text-[#6b6b78] text-sm">
        <div className="text-3xl mb-2">🏅</div>
        <p>Aucun artefact configuré.</p>
      </div>
    );
  }

  return (
    <>
      <SectionTitle>Catalogue — {badges.length} artefact{badges.length !== 1 ? 's' : ''}</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {badges.map(b => (
          <div key={b.id} className="bg-white border border-[#ececf0] rounded-2xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-2xl bg-gradient-to-br from-[#D9A441] to-[#b58530] text-white shadow-md">
                {LEVEL_EMOJI[b.niveau] ?? '🏅'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[#1F1B2E] leading-tight">{b.nom}</div>
                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${LEVEL_PILL[b.niveau] ?? 'bg-gray-100 text-gray-500'}`}>
                  {b.niveau}
                </span>
              </div>
            </div>

            {b.description && (
              <p className="text-xs text-[#6b6b78] leading-relaxed mb-2">{b.description}</p>
            )}

            <div className="bg-[#f7f5ff] border border-[#6A1B9A]/15 rounded-xl p-2.5">
              <div className="text-[10px] font-bold text-[#6A1B9A] uppercase tracking-wide mb-1">
                Condition d&apos;obtention
              </div>
              <p className="text-xs text-[#3a1d4d] leading-relaxed">{b.condition}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
