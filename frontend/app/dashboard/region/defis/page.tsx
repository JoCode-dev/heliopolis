'use client';
import { useCallback, useEffect, useState } from 'react';
import { codexApi } from '@/lib/api';
import { deferEffect } from '@/lib/effects';
import { CreateChallengeModal } from '@/components/defis/CreateChallengeModal';
import type { Submission, SubmissionStatus } from '@/types';

type TabFilter = 'TOUTES' | 'EN_ATTENTE' | 'VALIDE' | 'REJETE';

const TABS: { label: string; value: TabFilter; dot?: string }[] = [
  { label: 'Toutes',     value: 'TOUTES'     },
  { label: 'En attente', value: 'EN_ATTENTE', dot: 'bg-[#D9A441]' },
  { label: 'Validées',   value: 'VALIDE',     dot: 'bg-[#2E7D32]' },
  { label: 'Rejetées',   value: 'REJETE',     dot: 'bg-[#E55A35]' },
];

const STATUS_STYLE: Record<SubmissionStatus, { label: string; bg: string; text: string; border: string }> = {
  EN_ATTENTE:           { label: '⏳ En attente',     bg: 'bg-[#fff8e1]', text: 'text-[#D9A441]', border: 'border-[#ffe082]' },
  VALIDE:               { label: '✓ Validée',          bg: 'bg-[#e8f5e9]', text: 'text-[#2E7D32]', border: 'border-[#a5d6a7]' },
  REJETE:               { label: '✕ Rejetée',          bg: 'bg-[#ffebee]', text: 'text-[#E55A35]', border: 'border-[#ef9a9a]' },
  CORRECTION_DEMANDEE:  { label: '✎ Correction',       bg: 'bg-[#fff8e1]', text: 'text-[#D9A441]', border: 'border-[#ffe082]' },
};

const CAT_ICON: Record<string, string> = {
  PERSONNEL: '🔥', COMMUNAUTAIRE: '🌿', SPIRITUEL: '✨', LONG: '🏔️',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function DefisPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<TabFilter>('TOUTES');
  const [actionId, setActionId]       = useState<string | null>(null);
  const [createOpen, setCreateOpen]   = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await codexApi.pending();
      setSubmissions(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => deferEffect(load), [load]);

  const handleApprove = async (id: string) => {
    setActionId(id + '-ok');
    try { await codexApi.approve(id); await load(); } catch { /* ignore */ }
    finally { setActionId(null); }
  };

  const handleReject = async (id: string) => {
    setActionId(id + '-ko');
    try { await codexApi.reject(id, 'Rejeté par le responsable régional'); await load(); } catch { /* ignore */ }
    finally { setActionId(null); }
  };

  const filtered = tab === 'TOUTES'
    ? submissions
    : submissions.filter(s => s.statut === tab);

  const nbAttente = submissions.filter(s => s.statut === 'EN_ATTENTE').length;

  const count = (v: TabFilter) =>
    v === 'TOUTES' ? submissions.length : submissions.filter(s => s.statut === v).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-white border-b border-[#ececf0] px-4 pt-4 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-black text-[#1F1B2E]">🎯 Quêtes & soumissions</h1>
          <div className="flex items-center gap-2">
            {nbAttente > 0 && (
              <span className="flex items-center gap-1.5 bg-[#fff8e1] border border-[#ffe082] text-[#D9A441] text-[11px] font-bold px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D9A441] animate-pulse" />
                {nbAttente}
              </span>
            )}
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1 bg-[#E55A35] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm shadow-[#E55A35]/20 hover:bg-[#b51d1d] hover:shadow-md hover:shadow-[#E55A35]/30 hover:-translate-y-px transition-all duration-150"
            >
              + Nouveau quête
            </button>
          </div>
        </div>

        {/* Onglets tab-bar */}
        <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(t => {
            const n      = count(t.value);
            const active = tab === t.value;
            return (
              <button key={t.value} onClick={() => setTab(t.value)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider relative transition-colors ${
                  active ? 'text-[#1F1B2E]' : 'text-[#9b9ba8]'
                }`}>
                {t.dot && <span className={`w-1.5 h-1.5 rounded-full ${active ? t.dot : 'bg-[#d0d0d8]'}`} />}
                {t.label}
                {n > 0 && (
                  <span className={`text-[10px] font-black ${active ? 'text-[#1F1B2E]' : 'text-[#c0c0cc]'}`}>{n}</span>
                )}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E55A35] rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Liste ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f6f6fa] px-3 py-3 lg:px-6 lg:py-4">

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-[#9b9ba8]">
            <div className="text-4xl animate-pulse mb-3">🎯</div>
            <p className="text-sm">Chargement…</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[#9b9ba8]">
            <div className="text-4xl mb-3">🎯</div>
            <p className="font-semibold text-sm text-[#1F1B2E]">Aucune soumission</p>
            <p className="text-xs mt-1">
              {tab === 'TOUTES' ? 'Les soumissions de vos gardiens apparaîtront ici.' : 'Essayez un autre filtre.'}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-4">
          {filtered.map(sub => {
            const g       = sub.gardien;
            const st      = STATUS_STYLE[sub.statut] ?? STATUS_STYLE.EN_ATTENTE;
            const catIcon = CAT_ICON[sub.challenge?.categorie ?? ''] ?? '🎯';
            const isPending   = sub.statut === 'EN_ATTENTE';
            const isApproving = actionId === sub.id + '-ok';
            const isRejecting = actionId === sub.id + '-ko';
            const busy        = isApproving || isRejecting;

            return (
              <div key={sub.id}
                className={`bg-white rounded-2xl border border-[#ececf0] overflow-hidden shadow-sm ${isPending ? 'border-l-4 border-l-[#D9A441]' : ''}`}>

                <div className="px-4 pt-3.5 pb-3">
                  {/* Gardien + badge statut */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[14px] text-[#1F1B2E] truncate">
                        {g ? `${g.prenoms} ${g.nom}` : 'Gardien inconnu'}
                      </div>
                      {g?.matricule && (
                        <span className="text-[11px] text-[#9b9ba8] font-mono">{g.matricule}</span>
                      )}
                    </div>
                    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${st.bg} ${st.text} ${st.border}`}>
                      {st.label}
                    </span>
                  </div>

                  {/* Quête + date */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">{catIcon}</span>
                    <span className="text-[12px] font-semibold text-[#1F1B2E] truncate flex-1">
                      {sub.challenge?.titre ?? '—'}
                    </span>
                    <span className="text-[11px] text-[#9b9ba8] flex-shrink-0">{fmtDate(sub.submittedAt)}</span>
                  </div>

                  {/* Texte de la soumission */}
                  {sub.texte && (
                    <p className="text-[12px] text-[#6b6b78] bg-[#f9f9fc] rounded-xl px-3 py-2 italic mb-2 leading-relaxed">
                      « {sub.texte} »
                    </p>
                  )}

                  {/* Actions — seulement si en attente */}
                  {isPending && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleApprove(sub.id)} disabled={busy}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#e8f5e9] text-[#2E7D32] border border-[#a5d6a7] enabled:hover:bg-[#2E7D32] enabled:hover:text-white enabled:hover:shadow-sm enabled:hover:border-[#2E7D32] disabled:opacity-60 transition-all duration-150">
                        {isApproving ? '…' : '✓ Valider'}
                      </button>
                      <button onClick={() => handleReject(sub.id)} disabled={busy}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#ffebee] text-[#E55A35] border border-[#ef9a9a] enabled:hover:bg-[#E55A35] enabled:hover:text-white enabled:hover:shadow-sm enabled:hover:border-[#E55A35] disabled:opacity-60 transition-all duration-150">
                        {isRejecting ? '…' : '✕ Rejeter'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-4" />
      </div>

      <CreateChallengeModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setCreateOpen(false)}
      />
    </div>
  );
}
