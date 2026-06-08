'use client';
import { useEffect, useState } from 'react';
import { badgesApi } from '@/lib/api';
import { BadgeFormModal } from '@/components/badges/BadgeFormModal';
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

export default function AdminArtefactsPage() {
  const [badges, setBadges]   = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<{ open: boolean; badge?: Badge }>({ open: false });

  const reload = () => {
    setLoading(true);
    badgesApi.list()
      .then(r => setBadges(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6 bg-[#fafafa]">

      {modal.open && (
        <BadgeFormModal
          badge={modal.badge}
          canDelete
          onClose={() => setModal({ open: false })}
          onSaved={() => { setModal({ open: false }); reload(); }}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-5 border-b border-[#ececf0] pb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E]">🏅 Artefacts</h1>
          <p className="text-sm text-[#6b6b78] mt-0.5">{badges.length} artefact{badges.length !== 1 ? 's' : ''} configuré{badges.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="bg-[#1F1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm shadow-[#1F1B2E]/20 hover:bg-[#2c2640] hover:shadow-md hover:shadow-[#1F1B2E]/25 hover:-translate-y-px transition-all duration-150"
        >
          + Nouvel artefact
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-[#6b6b78] text-sm">Chargement…</div>
      )}

      {!loading && badges.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-[#6b6b78]">
          <div className="text-5xl mb-3">🏅</div>
          <p className="font-semibold">Aucun artefact configuré</p>
          <p className="text-sm mt-1">Créez le premier artefact pour les Gardiens.</p>
          <button onClick={() => setModal({ open: true })}
            className="mt-4 bg-[#1F1B2E] text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm shadow-[#1F1B2E]/20 hover:bg-[#2c2640] hover:shadow-md hover:shadow-[#1F1B2E]/25 hover:-translate-y-px transition-all duration-150">
            + Créer un artefact
          </button>
        </div>
      )}

      {!loading && badges.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {badges.map(b => (
            <div key={b.id}
              className="bg-white border border-[#ececf0] rounded-2xl p-4 hover:border-[#c0c0cc] transition-colors cursor-pointer group"
              onClick={() => setModal({ open: true, badge: b })}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-2xl text-white shadow-md bg-gradient-to-br from-[#D9A441] to-[#b58530]">
                  {LEVEL_EMOJI[b.niveau] ?? '🏅'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#1F1B2E] leading-tight truncate">{b.nom}</span>
                    <span className="text-[10px] text-[#9b9ba8] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">✏️ Modifier</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${LEVEL_PILL[b.niveau] ?? 'bg-gray-100 text-gray-500'}`}>
                      {b.niveau}
                    </span>
                    <span className="text-[10px] text-[#9b9ba8] font-mono">{b.code}</span>
                  </div>
                </div>
              </div>

              {b.description && (
                <p className="text-xs text-[#6b6b78] mt-2.5 leading-relaxed line-clamp-2">{b.description}</p>
              )}

              <div className="mt-2.5 bg-[#f7f5ff] border border-[#6A1B9A]/10 rounded-xl px-3 py-2">
                <p className="text-[10px] font-bold text-[#6A1B9A] uppercase tracking-wide mb-0.5">Condition</p>
                <p className="text-xs text-[#3a1d4d] leading-relaxed">{b.condition}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
