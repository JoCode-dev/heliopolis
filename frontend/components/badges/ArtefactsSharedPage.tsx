'use client';
import { useCallback, useEffect, useState } from 'react';
import { badgesApi } from '@/lib/api';
import { BadgeFormModal } from '@/components/badges/BadgeFormModal';
import { ArtefactsCatalogView } from '@/components/badges/ArtefactsCatalogView';
import { BadgeUnlockModal } from '@/components/badges/BadgeUnlockModal';
import { SectionTitle } from '@/components/ui';
import { deferEffect } from '@/lib/effects';
import { useAuthStore } from '@/store/auth';
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

const ANNOUNCED_KEY = 'heliopolis_announced_badges';
function getAnnounced(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(ANNOUNCED_KEY) ?? '[]')); }
  catch { return new Set(); }
}
function markAnnounced(ids: string[]) {
  const set = getAnnounced();
  ids.forEach(id => set.add(id));
  localStorage.setItem(ANNOUNCED_KEY, JSON.stringify([...set]));
}
function toAccomplissement(condition: string): string {
  return condition
    .replace(/^Valider /, 'En validant ')
    .replace(/^Atteindre /, 'En atteignant ')
    .replace(/^Être /, 'En étant ')
    .replace(/^Avoir /, 'En ayant ');
}

export function ArtefactsSharedPage() {
  const { user } = useAuthStore();
  const role = user?.role ?? '';

  const canManage = role === 'ADMIN' || role === 'REGION';
  const canDelete = role === 'ADMIN';
  const isGardien = role === 'GARDIEN';

  // ── Vue gestion (ADMIN / REGION) ──────────────────────────────────────────
  const [badges, setBadges]   = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<{ open: boolean; badge?: Badge }>({ open: false });

  const reload = useCallback(() => {
    setLoading(true);
    badgesApi.list()
      .then(r => setBadges(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Vue gardien ───────────────────────────────────────────────────────────
  const [myBadges, setMyBadges]       = useState<UserBadge[]>([]);
  const [modalBadges, setModalBadges] = useState<Badge[]>([]);

  useEffect(() => {
    if (canManage) {
      return deferEffect(reload);
    }
    if (isGardien) {
      Promise.all([badgesApi.list(), badgesApi.mine()])
        .then(([all, mine]) => {
          setBadges(all.data);
          const { badges: myB, newlyAwarded } = mine.data as { badges: UserBadge[]; newlyAwarded: Badge[] };
          setMyBadges(myB);
          if (newlyAwarded.length > 0) {
            const announced = getAnnounced();
            const toShow = newlyAwarded.filter(b => !announced.has(b.id));
            if (toShow.length > 0) {
              setModalBadges(toShow);
              markAnnounced(toShow.map(b => b.id));
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      // GUIDE / SENTINELLE : catalogue uniquement (chargé par ArtefactsCatalogView)
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Vue catalogue (GUIDE / SENTINELLE) ───────────────────────────────────
  if (!canManage && !isGardien) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] text-white px-4 pt-4 pb-4 flex-shrink-0">
          <h1 className="text-xl font-bold">🏅 Artefacts</h1>
          <p className="text-xs opacity-85 mt-0.5">Règles d&apos;acquisition pour les Gardiens</p>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 bg-[#fafafa]">
          <div className="bg-[#fff7e0] border border-[#f0d98a] rounded-2xl p-3.5 mb-4 flex gap-2.5 items-start">
            <span className="text-base flex-shrink-0">ℹ️</span>
            <p className="text-xs text-[#5a4a1a] leading-relaxed">
              Les artefacts sont des badges gagnés par les Gardiens selon des conditions précises.
              Cette page présente le catalogue officiel et les règles d&apos;obtention.
            </p>
          </div>
          <ArtefactsCatalogView />
        </div>
      </div>
    );
  }

  // ── Vue gardien : progression personnelle ────────────────────────────────
  if (isGardien) {
    const ownedIds = new Set(myBadges.map(ub => ub.badge.id));
    const pct = badges.length ? Math.round((ownedIds.size / badges.length) * 100) : 0;
    const remaining = badges.length - ownedIds.size;

    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        {modalBadges.length > 0 && (
          <BadgeUnlockModal badges={modalBadges} onClose={() => setModalBadges([])} />
        )}
        <div className="bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] text-white px-4 pt-4 pb-4 flex-shrink-0">
          <h1 className="text-xl font-bold">🏅 Mes artefacts</h1>
          <p className="text-xs opacity-85 mt-0.5">
            {ownedIds.size} / {badges.length} débloqué{ownedIds.size !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 bg-[#fafafa]">
          {loading && <div className="text-center py-10 text-[#6b6b78] text-sm">Chargement…</div>}
          {!loading && badges.length > 0 && (
            <>
              <div className="bg-white border border-[#ececf0] rounded-2xl p-4 mb-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-[#1F1B2E]">Ta progression</span>
                  <span className="text-xs font-bold text-[#E55A35]">{pct}%</span>
                </div>
                <div className="w-full bg-[#f3f3f5] rounded-full h-2.5 overflow-hidden">
                  <div className="h-2.5 rounded-full bg-gradient-to-r from-[#D9A441] to-[#E55A35] transition-all duration-500"
                    style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] text-[#6b6b78] mt-2 leading-relaxed">
                  {ownedIds.size === 0
                    ? "Tu n'as pas encore débloqué d'artefact."
                    : remaining === 0
                      ? '🎉 Félicitations ! Tu as débloqué tous les artefacts.'
                      : `Encore ${remaining} artefact${remaining !== 1 ? 's' : ''} à débloquer.`}
                </p>
              </div>
              <SectionTitle>Règles d&apos;acquisition</SectionTitle>
              <div className="flex flex-col gap-3">
                {[...badges].sort((a, b) => (ownedIds.has(a.id) ? 0 : 1) - (ownedIds.has(b.id) ? 0 : 1)).map(b => {
                  const earned = ownedIds.has(b.id);
                  const ub = myBadges.find(u => u.badge.id === b.id);
                  return (
                    <div key={b.id} className={`rounded-2xl border p-4 transition-all ${earned ? 'bg-gradient-to-r from-[#fff9e6] to-white border-[#f0d98a]' : 'bg-white border-[#ececf0]'}`}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-2xl text-white shadow-md ${earned ? 'bg-gradient-to-br from-[#D9A441] to-[#b58530]' : 'bg-gradient-to-br from-gray-400 to-gray-500'}`}>
                          {LEVEL_EMOJI[b.niveau] ?? '🏅'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-[#1F1B2E] leading-tight">{b.nom}</span>
                            {earned ? (
                              <span className="text-[10px] font-bold text-[#2E7D32] bg-[#e8f5e9] px-2 py-0.5 rounded-full">✓ Débloqué</span>
                            ) : (
                              <span className="text-[10px] text-[#6b6b78] bg-[#f3f3f5] px-2 py-0.5 rounded-full">🔒 À débloquer</span>
                            )}
                          </div>
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${LEVEL_PILL[b.niveau] ?? 'bg-gray-100 text-gray-500'}`}>{b.niveau}</span>
                          {earned && ub && (
                            <div className="text-[10px] text-[#6b6b78] mt-1">
                              Obtenu le {new Date(ub.awardedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                          )}
                        </div>
                        {earned && (
                          <button onClick={() => setModalBadges([b])}
                            className="flex-shrink-0 text-[10px] font-semibold text-[#D9A441] bg-[#fff9e6] border border-[#f0d98a] px-2.5 py-1 rounded-full hover:bg-[#fef3cd] transition-colors">
                            ▶ Revoir
                          </button>
                        )}
                      </div>
                      {b.description && <p className="text-xs text-[#6b6b78] leading-relaxed mb-2 pl-1">{b.description}</p>}
                      <div className={`rounded-xl p-3 ${earned ? 'bg-[#e8f5e9]/60 border border-[#2E7D32]/20' : 'bg-[#f7f5ff] border border-[#6A1B9A]/15'}`}>
                        <div className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 ${earned ? 'text-[#2E7D32]' : 'text-[#6A1B9A]'}`}>
                          {earned ? '✓ Comment il a été gagné' : 'Comment obtenir cet artefact'}
                        </div>
                        <p className="text-xs text-[#1F1B2E] leading-relaxed">
                          {earned ? toAccomplissement(b.condition) : b.condition}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {!loading && badges.length === 0 && (
            <div className="text-center py-10 text-[#6b6b78] text-sm">
              <div className="text-3xl mb-2">🏅</div>
              <p>Aucun artefact configuré pour le moment.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Vue gestion (ADMIN / REGION) ──────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6 bg-[#fafafa]">
      {modal.open && (
        <BadgeFormModal
          badge={modal.badge}
          canDelete={canDelete}
          onClose={() => setModal({ open: false })}
          onSaved={() => { setModal({ open: false }); reload(); }}
        />
      )}
      <div className="flex justify-between items-center mb-5 border-b border-[#ececf0] pb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E]">🏅 Artefacts</h1>
          <p className="text-sm text-[#6b6b78] mt-0.5">{badges.length} artefact{badges.length !== 1 ? 's' : ''} configuré{badges.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal({ open: true })}
          className="bg-[#1F1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm hover:bg-[#2c2640] hover:shadow-md hover:-translate-y-px transition-all duration-150">
          + Nouvel artefact
        </button>
      </div>

      {loading && <div className="flex items-center justify-center py-16 text-[#6b6b78] text-sm">Chargement…</div>}

      {!loading && badges.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-[#6b6b78]">
          <div className="text-5xl mb-3">🏅</div>
          <p className="font-semibold">Aucun artefact configuré</p>
          <p className="text-sm mt-1">Créez le premier artefact pour les Gardiens.</p>
          <button onClick={() => setModal({ open: true })}
            className="mt-4 bg-[#1F1B2E] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[#2c2640] hover:-translate-y-px transition-all duration-150">
            + Créer un artefact
          </button>
        </div>
      )}

      {!loading && badges.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {badges.map(b => (
            <div key={b.id}
              className="bg-white border border-[#ececf0] rounded-2xl p-4 hover:border-[#c0c0cc] transition-colors cursor-pointer group"
              onClick={() => setModal({ open: true, badge: b })}>
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
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${LEVEL_PILL[b.niveau] ?? 'bg-gray-100 text-gray-500'}`}>{b.niveau}</span>
                    <span className="text-[10px] text-[#9b9ba8] font-mono">{b.code}</span>
                  </div>
                </div>
              </div>
              {b.description && <p className="text-xs text-[#6b6b78] mt-2.5 leading-relaxed line-clamp-2">{b.description}</p>}
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
