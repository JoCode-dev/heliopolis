'use client';
import { useEffect, useState } from 'react';
import { codexApi } from '@/lib/api';
import { Pill } from '@/components/ui';
import { CreateChallengeModal } from '@/components/defis/CreateChallengeModal';
import type { Submission, SubmissionStatus } from '@/types';

type TabFilter = 'TOUTES' | 'EN_ATTENTE' | 'VALIDE' | 'REJETE';

const TABS: { label: string; value: TabFilter }[] = [
  { label: 'Toutes', value: 'TOUTES' },
  { label: 'En attente', value: 'EN_ATTENTE' },
  { label: 'Validées', value: 'VALIDE' },
  { label: 'Rejetées', value: 'REJETE' },
];

const STATUS_PILL: Record<SubmissionStatus, 'or' | 'vert' | 'rouge' | 'gris'> = {
  EN_ATTENTE: 'or',
  VALIDE: 'vert',
  REJETE: 'rouge',
  CORRECTION_DEMANDEE: 'or',
};
const STATUS_LABELS: Record<SubmissionStatus, string> = {
  EN_ATTENTE: 'En attente',
  VALIDE: 'Validée',
  REJETE: 'Rejetée',
  CORRECTION_DEMANDEE: 'Correction demandée',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminDefisPage() {
  const [pending, setPending] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('TOUTES');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchPending = async () => {
    try {
      const { data } = await codexApi.pending();
      setPending(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id + '-approve');
    try {
      await codexApi.approve(id);
      await fetchPending();
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id + '-reject');
    try {
      await codexApi.reject(id, 'Rejeté par l\'administrateur');
      await fetchPending();
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const filtered = activeTab === 'TOUTES'
    ? pending
    : pending.filter(s => s.statut === activeTab);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-5 border-b border-[#ececf0] pb-4">
        <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E]">🎯 Défis & soumissions</h1>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-[#6b6b78]">
            {pending.filter(s => s.statut === 'EN_ATTENTE').length} en attente
          </span>
          <button
            onClick={() => setCreateOpen(true)}
            className="bg-[#1F1B2E] text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#2d2640] transition-colors"
          >
            + Nouveau défi
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-5">
        {TABS.map(tab => (
          <button key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              activeTab === tab.value
                ? 'bg-[#1F1B2E] text-white'
                : 'bg-white border border-[#e0e0e8] text-[#6b6b78] hover:border-[#1F1B2E] hover:text-[#1F1B2E]'
            }`}>
            {tab.label}
            {tab.value === 'EN_ATTENTE' && pending.filter(s => s.statut === 'EN_ATTENTE').length > 0 && (
              <span className="ml-1.5 bg-[#C62828] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {pending.filter(s => s.statut === 'EN_ATTENTE').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-[#6b6b78] text-sm">Chargement…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-[#6b6b78]">
          <div className="text-5xl mb-3">🎯</div>
          <p className="font-semibold">Aucune soumission pour ce filtre</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map(sub => {
          const gardien = sub.gardien;
          const isApproving = actionLoading === sub.id + '-approve';
          const isRejecting = actionLoading === sub.id + '-reject';

          return (
            <div key={sub.id} className="bg-white border border-[#ececf0] rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-[#1F1B2E] text-sm">
                      {gardien ? `${gardien.prenoms} ${gardien.nom}` : 'Gardien inconnu'}
                    </span>
                    {gardien?.matricule && (
                      <span className="text-xs text-[#6b6b78] font-mono">{gardien.matricule}</span>
                    )}
                  </div>
                  <p className="text-xs text-[#6b6b78] mb-2">
                    Défi : <span className="font-semibold text-[#1F1B2E]">{sub.challenge?.titre ?? '—'}</span>
                    {' · '}
                    {formatDate(sub.submittedAt)}
                  </p>
                  {sub.texte && (
                    <p className="text-xs text-[#1F1B2E] bg-[#f9f9fc] rounded-lg px-3 py-2 italic">
                      « {sub.texte} »
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Pill variant={STATUS_PILL[sub.statut]}>
                    {STATUS_LABELS[sub.statut]}
                  </Pill>
                  {sub.statut === 'EN_ATTENTE' && (
                    <>
                      <button
                        onClick={() => handleApprove(sub.id)}
                        disabled={!!actionLoading}
                        className="text-xs bg-[#e1f4e3] text-[#2E7D32] border border-[#2E7D32]/30 rounded-lg px-3 py-1.5 font-semibold hover:bg-[#2E7D32] hover:text-white transition-colors disabled:opacity-60">
                        {isApproving ? '…' : '✓ Valider'}
                      </button>
                      <button
                        onClick={() => handleReject(sub.id)}
                        disabled={!!actionLoading}
                        className="text-xs bg-[#ffe6e6] text-[#C62828] border border-[#C62828]/30 rounded-lg px-3 py-1.5 font-semibold hover:bg-[#C62828] hover:text-white transition-colors disabled:opacity-60">
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

      <CreateChallengeModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setCreateOpen(false)}
      />
    </div>
  );
}
