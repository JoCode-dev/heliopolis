'use client';
import { useCallback, useEffect, useState } from 'react';
import { codexApi, challengesApi } from '@/lib/api';
import { deferEffect } from '@/lib/effects';
import { Pill } from '@/components/ui';
import { CreateChallengeModal } from '@/components/defis/CreateChallengeModal';
import type { Challenge, Submission, SubmissionStatus } from '@/types';

type TabFilter = 'TOUTES' | 'EN_ATTENTE' | 'VALIDE' | 'REJETE';

const SUB_TABS: { label: string; value: TabFilter }[] = [
  { label: 'Toutes',     value: 'TOUTES'     },
  { label: 'En attente', value: 'EN_ATTENTE'  },
  { label: 'Validées',   value: 'VALIDE'      },
  { label: 'Rejetées',   value: 'REJETE'      },
];

const STATUS_PILL: Record<SubmissionStatus, 'or' | 'vert' | 'rouge' | 'gris'> = {
  EN_ATTENTE: 'or', VALIDE: 'vert', REJETE: 'rouge', CORRECTION_DEMANDEE: 'or',
};
const STATUS_LABELS: Record<SubmissionStatus, string> = {
  EN_ATTENTE: 'En attente', VALIDE: 'Validée', REJETE: 'Rejetée', CORRECTION_DEMANDEE: 'Correction demandée',
};

const CAT_META: Record<string, { label: string; color: string; bg: string }> = {
  PERSONNEL:     { label: 'Personnel',     color: 'text-[#6A1B9A]', bg: 'bg-[#f5eeff]' },
  COMMUNAUTAIRE: { label: 'Communautaire', color: 'text-[#2E7D32]', bg: 'bg-green-50'  },
  SPIRITUEL:     { label: 'Spirituel',     color: 'text-[#D9A441]', bg: 'bg-[#fdf8ec]' },
  LONG:          { label: 'Long terme',    color: 'text-[#E55A35]', bg: 'bg-[#fef3ef]' },
};

const NIVEAU_COLOR: Record<string, string> = {
  FACILE:       'bg-green-100 text-green-700',
  INTERMEDIAIRE:'bg-amber-100 text-amber-700',
  DIFFICILE:    'bg-red-100   text-red-700',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

type Section = 'quetes' | 'soumissions';

export default function AdminDefisPage() {
  const [section, setSection]           = useState<Section>('quetes');
  const [challenges, setChallenges]     = useState<Challenge[]>([]);
  const [submissions, setSubmissions]   = useState<Submission[]>([]);
  const [loadingQ, setLoadingQ]         = useState(true);
  const [loadingS, setLoadingS]         = useState(true);
  const [subTab, setSubTab]             = useState<TabFilter>('TOUTES');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createOpen, setCreateOpen]     = useState(false);

  const fetchChallenges = useCallback(async () => {
    try {
      const { data } = await challengesApi.list();
      setChallenges(Array.isArray(data) ? data : (data as { items?: Challenge[] }).items ?? []);
    } catch { /* ignore */ }
    finally { setLoadingQ(false); }
  }, []);

  const fetchSubmissions = useCallback(async () => {
    try {
      const { data } = await codexApi.pending();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoadingS(false); }
  }, []);

  useEffect(() => deferEffect(() => { void fetchChallenges(); void fetchSubmissions(); }), [fetchChallenges, fetchSubmissions]);

  const handleApprove = async (id: string) => {
    setActionLoading(id + '-approve');
    try { await codexApi.approve(id); await fetchSubmissions(); }
    catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id + '-reject');
    try { await codexApi.reject(id, 'Rejeté par l\'administrateur'); await fetchSubmissions(); }
    catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const pendingCount = submissions.filter(s => s.statut === 'EN_ATTENTE').length;
  const filteredSubs = subTab === 'TOUTES' ? submissions : submissions.filter(s => s.statut === subTab);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6">

      {/* En-tête */}
      <div className="flex justify-between items-center mb-5 border-b border-[#ececf0] pb-4">
        <div>
          <h1 className="text-xl font-black text-[#1F1B2E]">Quêtes & soumissions</h1>
          <p className="text-xs text-[#9b9ba8] mt-0.5">
            {challenges.length} quête{challenges.length !== 1 ? 's' : ''} · {pendingCount} soumission{pendingCount !== 1 ? 's' : ''} en attente
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="bg-[#1F1B2E] text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#2d2640] transition-colors whitespace-nowrap"
        >
          + Nouvelle quête
        </button>
      </div>

      {/* Onglets de section */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setSection('quetes')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
            section === 'quetes' ? 'bg-[#1F1B2E] text-white' : 'bg-white border border-[#e0e0e8] text-[#6b6b78] hover:border-[#1F1B2E] hover:text-[#1F1B2E]'
          }`}
        >
          🎯 Quêtes
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${section === 'quetes' ? 'bg-white/20 text-white' : 'bg-[#f0f0f4] text-[#6b6b78]'}`}>
            {challenges.length}
          </span>
        </button>
        <button
          onClick={() => setSection('soumissions')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
            section === 'soumissions' ? 'bg-[#1F1B2E] text-white' : 'bg-white border border-[#e0e0e8] text-[#6b6b78] hover:border-[#1F1B2E] hover:text-[#1F1B2E]'
          }`}
        >
          📬 Soumissions
          {pendingCount > 0 && (
            <span className="text-[10px] font-black bg-[#E55A35] text-white px-1.5 py-0.5 rounded-full">{pendingCount}</span>
          )}
        </button>
      </div>

      {/* ── Section Quêtes ── */}
      {section === 'quetes' && (
        <>
          {loadingQ ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-white border border-[#ececf0] rounded-2xl p-4 animate-pulse">
                  <div className="h-4 w-3/4 bg-[#f0f0f4] rounded mb-2" />
                  <div className="h-3 w-1/2 bg-[#f0f0f4] rounded mb-4" />
                  <div className="h-3 w-full bg-[#f0f0f4] rounded" />
                </div>
              ))}
            </div>
          ) : challenges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#9b9ba8]">
              <div className="text-5xl mb-3">🎯</div>
              <p className="font-semibold text-sm">Aucune quête créée</p>
              <button onClick={() => setCreateOpen(true)} className="mt-3 text-sm font-bold text-[#E55A35] hover:underline">
                Créer la première quête →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {challenges.map(ch => {
                const cat    = CAT_META[ch.categorie] ?? { label: ch.categorie, color: 'text-[#6b6b78]', bg: 'bg-[#f5f5f8]' };
                const nColor = NIVEAU_COLOR[ch.niveau] ?? 'bg-[#f5f5f8] text-[#6b6b78]';
                const count  = ch._count?.submissions ?? 0;

                return (
                  <div key={ch.id} className="bg-white border border-[#ececf0] rounded-2xl p-4 flex flex-col gap-2.5 hover:border-[#E55A35]/30 hover:shadow-sm transition-all">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-[#1F1B2E] leading-snug line-clamp-2">{ch.titre}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${nColor}`}>
                        {ch.niveau}
                      </span>
                    </div>

                    {/* Catégorie */}
                    <span className={`self-start text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.bg} ${cat.color}`}>
                      {cat.label}
                    </span>

                    {/* Description */}
                    {ch.description && (
                      <p className="text-xs text-[#9b9ba8] leading-relaxed line-clamp-2">{ch.description}</p>
                    )}

                    {/* Footer stats */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#f5f5f8]">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#9b9ba8]">
                          <span className="font-bold text-[#1F1B2E]">{ch.points}</span> pts
                        </span>
                        {ch.pointsRequis > 0 && (
                          <span className="text-xs text-[#9b9ba8]">
                            Requis : <span className="font-semibold">{ch.pointsRequis}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#9b9ba8]">
                        <span className="font-bold text-[#1F1B2E]">{count}</span> soumission{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Section Soumissions ── */}
      {section === 'soumissions' && (
        <>
          {/* Sous-onglets statut */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-0.5 scrollbar-none">
            {SUB_TABS.map(tab => (
              <button key={tab.value}
                onClick={() => setSubTab(tab.value)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  subTab === tab.value
                    ? 'bg-[#1F1B2E] text-white'
                    : 'bg-white border border-[#e0e0e8] text-[#6b6b78] hover:border-[#1F1B2E] hover:text-[#1F1B2E]'
                }`}>
                {tab.label}
                {tab.value === 'EN_ATTENTE' && pendingCount > 0 && (
                  <span className="bg-[#E55A35] text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          {loadingS ? (
            <div className="flex items-center justify-center py-16 text-[#9b9ba8] text-sm">Chargement…</div>
          ) : filteredSubs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#9b9ba8]">
              <div className="text-5xl mb-3">📬</div>
              <p className="font-semibold text-sm">Aucune soumission pour ce filtre</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredSubs.map(sub => {
                const gardien = sub.gardien;
                const isApproving = actionLoading === sub.id + '-approve';
                const isRejecting = actionLoading === sub.id + '-reject';
                return (
                  <div key={sub.id} className="bg-white border border-[#ececf0] rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-[#1F1B2E] text-sm">
                            {gardien ? `${gardien.prenoms} ${gardien.nom}` : 'Gardien inconnu'}
                          </span>
                          {gardien?.matricule && (
                            <span className="text-xs text-[#9b9ba8] font-mono">{gardien.matricule}</span>
                          )}
                        </div>
                        <p className="text-xs text-[#9b9ba8] mb-2">
                          Quête : <span className="font-semibold text-[#1F1B2E]">{sub.challenge?.titre ?? '—'}</span>
                          {' · '}{formatDate(sub.submittedAt)}
                        </p>
                        {sub.texte && (
                          <p className="text-xs text-[#1F1B2E] bg-[#f9f9fc] rounded-lg px-3 py-2 italic">
                            « {sub.texte} »
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        <Pill variant={STATUS_PILL[sub.statut]}>{STATUS_LABELS[sub.statut]}</Pill>
                        {sub.statut === 'EN_ATTENTE' && (
                          <>
                            <button onClick={() => handleApprove(sub.id)} disabled={!!actionLoading}
                              className="text-xs bg-[#e1f4e3] text-[#2E7D32] border border-[#2E7D32]/30 rounded-lg px-3 py-1.5 font-semibold hover:bg-[#2E7D32] hover:text-white transition-colors disabled:opacity-60">
                              {isApproving ? '…' : '✓ Valider'}
                            </button>
                            <button onClick={() => handleReject(sub.id)} disabled={!!actionLoading}
                              className="text-xs bg-[#ffe6e6] text-[#E55A35] border border-[#E55A35]/30 rounded-lg px-3 py-1.5 font-semibold hover:bg-[#E55A35] hover:text-white transition-colors disabled:opacity-60">
                              {isRejecting ? '…' : '✕ Rejeter'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <CreateChallengeModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); void fetchChallenges(); }}
      />
    </div>
  );
}
