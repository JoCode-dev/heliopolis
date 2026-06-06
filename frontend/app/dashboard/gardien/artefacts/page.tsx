'use client';
import { useEffect, useState } from 'react';
import { badgesApi } from '@/lib/api';
import { SectionTitle } from '@/components/ui';
import type { Badge, UserBadge } from '@/types';

const LEVEL_EMOJI: Record<string, string> = {
  BRONZE: '🪨', ARGENT: '🥈', OR: '🏅', LEGENDE: '⚜️',
};

const LEVEL_PILL: Record<string, string> = {
  BRONZE:  'bg-amber-700/15 text-amber-700',
  ARGENT:  'bg-gray-300/40 text-gray-500',
  OR:      'bg-yellow-400/20 text-yellow-600',
  LEGENDE: 'bg-purple-500/20 text-purple-700',
};

export default function ArtefactsPage() {
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [myBadges, setMyBadges]   = useState<UserBadge[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([badgesApi.list(), badgesApi.mine()])
      .then(([all, mine]) => {
        setAllBadges(all.data);
        setMyBadges(mine.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const ownedIds = new Set(myBadges.map(ub => ub.badge.id));
  const pct = allBadges.length ? Math.round((ownedIds.size / allBadges.length) * 100) : 0;
  const remaining = allBadges.length - ownedIds.size;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-gradient-to-br from-[#C62828] to-[#8e1a1a] text-white px-4 pt-4 pb-4 flex-shrink-0">
        <h1 className="text-xl font-bold">🏅 Mes artefacts</h1>
        <p className="text-xs opacity-85 mt-0.5">
          {ownedIds.size} / {allBadges.length} débloqué{ownedIds.size !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 bg-[#fafafa]">

        {loading && (
          <div className="text-center py-10 text-[#6b6b78] text-sm">Chargement…</div>
        )}

        {!loading && allBadges.length > 0 && (
          <>
            {/* ── Barre de progression ── */}
            <div className="bg-white border border-[#ececf0] rounded-2xl p-4 mb-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-[#1F1B2E]">Ta progression</span>
                <span className="text-xs font-bold text-[#C62828]">{pct}%</span>
              </div>
              <div className="w-full bg-[#f3f3f5] rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-[#D9A441] to-[#C62828] transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[11px] text-[#6b6b78] mt-2 leading-relaxed">
                {ownedIds.size === 0
                  ? "Tu n'as pas encore débloqué d'artefact. Lis les règles ci-dessous pour savoir comment en gagner !"
                  : remaining === 0
                    ? '🎉 Félicitations ! Tu as débloqué tous les artefacts.'
                    : `Encore ${remaining} artefact${remaining !== 1 ? 's' : ''} à débloquer — lis les règles ci-dessous !`
                }
              </p>
            </div>

            {/* ── Liste complète avec règles ── */}
            <SectionTitle>Règles d&apos;acquisition</SectionTitle>

            <div className="flex flex-col gap-3">
              {allBadges.map(b => {
                const earned = ownedIds.has(b.id);
                const ub     = myBadges.find(u => u.badge.id === b.id);

                return (
                  <div key={b.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      earned
                        ? 'bg-gradient-to-r from-[#fff9e6] to-white border-[#f0d98a]'
                        : 'bg-white border-[#ececf0]'
                    }`}
                  >
                    {/* En-tête badge */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-2xl text-white shadow-md ${
                        earned
                          ? 'bg-gradient-to-br from-[#D9A441] to-[#b58530]'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500'
                      }`}>
                        {LEVEL_EMOJI[b.niveau] ?? '🏅'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-[#1F1B2E] leading-tight">{b.nom}</span>
                          {earned ? (
                            <span className="text-[10px] font-bold text-[#2E7D32] bg-[#e8f5e9] px-2 py-0.5 rounded-full">
                              ✓ Débloqué
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#6b6b78] bg-[#f3f3f5] px-2 py-0.5 rounded-full">
                              🔒 À débloquer
                            </span>
                          )}
                        </div>

                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${LEVEL_PILL[b.niveau] ?? 'bg-gray-100 text-gray-500'}`}>
                          {b.niveau}
                        </span>

                        {earned && ub && (
                          <div className="text-[10px] text-[#6b6b78] mt-1">
                            Obtenu le {new Date(ub.awardedAt).toLocaleDateString('fr-FR', {
                              day: 'numeric', month: 'long', year: 'numeric',
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {b.description && (
                      <p className="text-xs text-[#6b6b78] leading-relaxed mb-2 pl-1">{b.description}</p>
                    )}

                    {/* Condition — toujours visible en entier */}
                    <div className={`rounded-xl p-3 ${
                      earned
                        ? 'bg-[#f0d98a]/25 border border-[#f0d98a]/50'
                        : 'bg-[#f7f5ff] border border-[#6A1B9A]/15'
                    }`}>
                      <div className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 ${
                        earned ? 'text-[#b58530]' : 'text-[#6A1B9A]'
                      }`}>
                        Comment obtenir cet artefact
                      </div>
                      <p className="text-xs text-[#1F1B2E] leading-relaxed">{b.condition}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!loading && allBadges.length === 0 && (
          <div className="text-center py-10 text-[#6b6b78] text-sm">
            <div className="text-3xl mb-2">🏅</div>
            <p>Aucun artefact configuré pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
