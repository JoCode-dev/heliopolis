'use client';
import { useEffect, useState, useCallback } from 'react';
import { challengesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Pill } from '@/components/ui';
import type { Submission, ChallengeCategory } from '@/types';

// ─── Constantes ───────────────────────────────────────────────────────────────

const CAT_PILL: Record<ChallengeCategory, 'rouge' | 'vert' | 'violet' | 'or'> = {
  PERSONNEL: 'rouge', COMMUNAUTAIRE: 'vert', SPIRITUEL: 'violet', LONG: 'or',
};
const CAT_LABEL: Record<ChallengeCategory, string> = {
  PERSONNEL: 'Personnel', COMMUNAUTAIRE: 'Communautaire', SPIRITUEL: 'Spirituel', LONG: 'Défi long',
};
const CAT_EMOJI: Record<string, string> = {
  PERSONNEL: '🌿', COMMUNAUTAIRE: '🤝', SPIRITUEL: '🔥', LONG: '🏔️',
};

type Tab = 'attente' | 'validees' | 'rejetees';
const TAB_KEY = 'guide-missions-tab';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuideMissionsPage() {
  const { user } = useAuthStore();
  const isSentinelle = user?.role === 'SENTINELLE';
  const [tab, setTab]         = useState<Tab>('attente');
  const [all, setAll]         = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [toast, setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(TAB_KEY) as Tab;
    if (['attente', 'validees', 'rejetees'].includes(saved)) setTab(saved);
  }, []);

  const changeTab = (t: Tab) => { setTab(t); localStorage.setItem(TAB_KEY, t); };

  const reload = useCallback(() => {
    setLoading(true);
    challengesApi.pending()
      .then(r => setAll(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const onValidated = (id: string, approved: boolean) => {
    setAll(prev => prev.map(s =>
      s.id === id ? { ...s, statut: approved ? 'VALIDE' : 'REJETE' } : s
    ));
    setSelected(null);
    showToast(approved ? '✅ Soumission validée !' : '✕ Soumission rejetée.', approved);
  };

  const pending  = all.filter(s => s.statut === 'EN_ATTENTE');
  const validated = all.filter(s => s.statut === 'VALIDE');
  const rejected  = all.filter(s => s.statut === 'REJETE' || s.statut === 'CORRECTION_DEMANDEE');

  const tabData: Record<Tab, Submission[]> = {
    attente:  pending,
    validees: validated,
    rejetees: rejected,
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-xl ${toast.ok ? 'bg-[#2E7D32]' : 'bg-[#C62828]'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Header avec onglets ── */}
      <div className="bg-gradient-to-br from-[#C62828] to-[#8e1a1a] flex-shrink-0">
        <div className="flex items-end gap-3 px-4 pt-3 pb-0">
          <div>
            <h1 className="text-[18px] font-black text-white tracking-tight">Missions</h1>
            <p className="text-[11px] text-white/50 mt-0.5 pb-2">Validation des preuves · {all.length} soumissions</p>
          </div>
          <div className="flex-1" />
          {pending.length > 0 && (
            <div className="pb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#C62828] animate-pulse inline-block" />
              <span className="text-[11px] text-[#C62828] font-bold">{pending.length} en attente</span>
            </div>
          )}
        </div>

        <div className="flex border-t border-white/10">
          {([
            { key: 'attente',  label: 'À valider',  count: pending.length,   urgent: true },
            { key: 'validees', label: 'Validées',   count: validated.length, urgent: false },
            { key: 'rejetees', label: 'Rejetées',   count: rejected.length,  urgent: false },
          ] as { key: Tab; label: string; count: number; urgent: boolean }[]).map(t => (
            <button key={t.key} onClick={() => changeTab(t.key)}
              className={`flex-1 py-2.5 text-[12px] font-bold uppercase tracking-widest transition-colors relative flex items-center justify-center gap-1.5 ${
                tab === t.key ? 'text-white' : 'text-white/40'
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  tab === t.key
                    ? t.urgent ? 'bg-[#C62828] text-white' : 'bg-white text-[#1F1B2E]'
                    : 'bg-white/15 text-white/60'
                }`}>{t.count}</span>
              )}
              {tab === t.key && <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-t-sm" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Liste ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">

        {loading && <EmptyState icon="⏳" title="Chargement…" sub="" pulse />}

        {!loading && tabData[tab].length === 0 && (
          <EmptyState
            icon={tab === 'attente' ? '🎉' : tab === 'validees' ? '📭' : '📋'}
            title={
              tab === 'attente' ? 'Aucune preuve à valider'
              : tab === 'validees' ? 'Aucune validation pour le moment'
              : 'Aucune soumission rejetée'
            }
            sub={
              tab === 'attente' ? 'Tes gardiens n\'ont pas encore soumis de preuves.'
              : tab === 'validees' ? 'Les validations apparaîtront ici.'
              : 'Les rejets apparaîtront ici.'
            }
          />
        )}

        {!loading && tabData[tab].length > 0 && (
          <>
            <div className="px-4 py-2 bg-[#F7F8FA] border-b border-[#f0f0f0]">
              <span className="text-[11px] text-[#9b9ba8] font-bold uppercase tracking-wider">
                {tabData[tab].length} soumission{tabData[tab].length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="divide-y divide-[#f5f5f7]">
              {tabData[tab].map(sub => (
                <SubmissionRow key={sub.id} sub={sub} status={tab} showParish={isSentinelle} onClick={() => setSelected(sub)} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Panneau de détail ── */}
      {selected && (
        <ValidationPanel
          sub={selected}
          onClose={() => setSelected(null)}
          onValidated={onValidated}
        />
      )}
    </div>
  );
}

// ─── Ligne de soumission ──────────────────────────────────────────────────────

function SubmissionRow({ sub, status, showParish, onClick }: {
  sub: Submission;
  status: Tab;
  showParish: boolean;
  onClick: () => void;
}) {
  const cat       = sub.challenge.categorie as ChallengeCategory;
  const gardien   = sub.gardien;
  const preuveUrl = (sub as unknown as { preuveUrl?: string }).preuveUrl;
  const parish    = (sub as unknown as { gardien?: { parish?: { nom: string } } }).gardien?.parish;

  return (
    <button onClick={onClick}
      className="flex items-center w-full px-4 py-3.5 hover:bg-[#F5F5F5] transition-colors text-left group">

      {/* Avatar gardien */}
      <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#C62828] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        {gardien ? `${gardien.nom?.[0]}${gardien.prenoms?.[0]}`.toUpperCase() : '?'}
      </div>

      <div className="flex-1 min-w-0 ml-3 py-1 border-b border-[#F2F2F2]">
        <div className="flex justify-between items-baseline gap-2">
          <span className="font-semibold text-[15px] text-[#1F1B2E] truncate">
            {gardien?.prenoms} {gardien?.nom}
          </span>
          <span className="text-[12px] text-[#9b9ba8] flex-shrink-0">
            {formatDate(sub.submittedAt)}
          </span>
        </div>

        {/* Paroisse — visible uniquement pour la Sentinelle */}
        {showParish && parish && (
          <p className="text-[11px] text-[#6A1B9A] font-semibold mt-0.5">⛪ {parish.nom}</p>
        )}

        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[13px]">{CAT_EMOJI[cat] ?? '🎯'}</span>
          <span className="text-[13px] text-[#1F1B2E] truncate font-medium">{sub.challenge.titre}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Pill variant={CAT_PILL[cat]}>{CAT_LABEL[cat]}</Pill>
          {preuveUrl && <span className="text-[10px] text-[#6b6b78]">📸 Photo</span>}
          {status === 'attente' && (
            <span className="ml-auto text-[11px] font-bold text-[#C62828]">⏳ En attente</span>
          )}
          {status === 'validees' && (
            <span className="ml-auto text-[11px] font-bold text-[#2E7D32]">✓ Validée</span>
          )}
          {status === 'rejetees' && (
            <span className="ml-auto text-[11px] font-bold text-[#6b6b78]">✕ Rejetée</span>
          )}
        </div>
      </div>

      <svg className="w-4 h-4 text-[#c0c0cc] ml-2 flex-shrink-0 group-hover:text-[#6A1B9A] transition-colors"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ─── Panneau de validation ────────────────────────────────────────────────────

function ValidationPanel({ sub, onClose, onValidated }: {
  sub: Submission;
  onClose: () => void;
  onValidated: (id: string, approved: boolean) => void;
}) {
  const [comment, setComment]     = useState('');
  const [processing, setProcessing] = useState<'approve' | 'reject' | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);

  const cat      = sub.challenge.categorie as ChallengeCategory;
  const gardien  = sub.gardien;
  const isPending = sub.statut === 'EN_ATTENTE';
  const preuveUrl = (sub as unknown as { preuveUrl?: string }).preuveUrl;

  const handle = async (approved: boolean) => {
    setProcessing(approved ? 'approve' : 'reject');
    try {
      await challengesApi.validate(sub.id, { approved, comment: comment.trim() || undefined });
      onValidated(sub.id, approved);
    } catch { /* ignore */ }
    finally { setProcessing(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full max-w-lg rounded-t-3xl lg:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">

        {/* En-tête */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b-[3px] border-[#6A1B9A]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Pill variant={CAT_PILL[cat]}>{CAT_LABEL[cat]}</Pill>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  sub.statut === 'VALIDE' ? 'bg-[#e8f5e9] text-[#2E7D32]' :
                  sub.statut === 'EN_ATTENTE' ? 'bg-[#fff8e6] text-[#9c7218]' :
                  'bg-[#fff0f0] text-[#C62828]'
                }`}>
                  {sub.statut === 'VALIDE' ? '✓ Validée' : sub.statut === 'EN_ATTENTE' ? '⏳ En attente' : '✕ Rejetée'}
                </span>
              </div>
              <h2 className="text-[17px] font-black text-[#1F1B2E] leading-tight">
                {CAT_EMOJI[cat]} {sub.challenge.titre}
              </h2>
              <p className="text-sm font-bold text-[#6A1B9A] mt-0.5">+{sub.challenge.points} pts</p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#f3f3f5] flex items-center justify-center text-[#6b6b78] hover:bg-[#ebebf0] transition flex-shrink-0">
              ✕
            </button>
          </div>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Profil gardien */}
          <div className="flex items-center gap-3 bg-[#f7f7fa] rounded-xl px-3.5 py-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#C62828] flex items-center justify-center text-white font-bold flex-shrink-0">
              {gardien ? `${gardien.nom?.[0]}${gardien.prenoms?.[0]}`.toUpperCase() : '?'}
            </div>
            <div>
              <p className="text-sm font-bold text-[#1F1B2E]">{gardien?.prenoms} {gardien?.nom}</p>
              <p className="text-xs text-[#9b9ba8]">
                {gardien?.matricule ?? '—'} · Soumis le {formatDate(sub.submittedAt)}
              </p>
              {(() => {
                const parish = (sub as unknown as { gardien?: { parish?: { nom: string } } }).gardien?.parish;
                return parish ? (
                  <p className="text-xs font-semibold text-[#6A1B9A] mt-0.5">⛪ {parish.nom}</p>
                ) : null;
              })()}
            </div>
          </div>

          {/* Texte de la preuve */}
          {sub.texte && (
            <div>
              <p className="text-[10px] font-bold text-[#9b9ba8] uppercase tracking-wider mb-1.5">Preuve soumise</p>
              <div className="bg-[#f7f7fa] rounded-xl px-3.5 py-3 border border-[#ececf0]">
                <p className="text-sm text-[#1F1B2E] leading-relaxed italic">« {sub.texte} »</p>
              </div>
            </div>
          )}

          {/* Photo */}
          {preuveUrl && (
            <div>
              <p className="text-[10px] font-bold text-[#9b9ba8] uppercase tracking-wider mb-1.5">Photo jointe</p>
              <div className="rounded-xl overflow-hidden border border-[#ececf0]">
                <img
                  src={preuveUrl.startsWith('http') ? preuveUrl : `${API_BASE}${preuveUrl}`}
                  alt="Preuve photo"
                  className="w-full max-h-64 object-cover"
                />
              </div>
            </div>
          )}

          {/* Description du défi */}
          <div>
            <p className="text-[10px] font-bold text-[#9b9ba8] uppercase tracking-wider mb-1.5">Défi</p>
            <p className="text-sm text-[#6b6b78] leading-relaxed">{sub.challenge.description}</p>
            {sub.challenge.preuveDemandee && (
              <p className="text-[11px] text-[#9c7218] mt-1.5 italic">📸 {sub.challenge.preuveDemandee}</p>
            )}
          </div>

          {/* ── Zone d'action ── */}
          {isPending && (
            <>
              {!showRejectForm ? (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handle(true)}
                    disabled={!!processing}
                    className="flex-1 py-3.5 rounded-xl bg-[#2E7D32] text-white font-bold text-sm disabled:opacity-60 active:scale-95 transition">
                    {processing === 'approve' ? '…' : '✓ Valider'}
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={!!processing}
                    className="flex-1 py-3.5 rounded-xl bg-white border-2 border-[#C62828] text-[#C62828] font-bold text-sm disabled:opacity-60 active:scale-95 transition">
                    ✕ Rejeter
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-bold text-[#C62828] uppercase tracking-wider mb-2">
                    Motif du rejet (optionnel)
                  </p>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    autoFocus
                    placeholder="Explique au gardien pourquoi sa preuve est insuffisante…"
                    rows={3}
                    className="w-full px-3.5 py-3 border border-[#e6e6ea] rounded-xl text-sm font-sans resize-none focus:outline-none focus:border-[#C62828] transition"
                  />
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => setShowRejectForm(false)}
                      className="flex-1 py-3 rounded-xl border border-[#e6e6ea] text-sm font-bold text-[#6b6b78]">
                      Annuler
                    </button>
                    <button
                      onClick={() => handle(false)}
                      disabled={!!processing}
                      className="flex-1 py-3 rounded-xl bg-[#C62828] text-white font-bold text-sm disabled:opacity-60 active:scale-95 transition">
                      {processing === 'reject' ? '…' : 'Confirmer le rejet'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Statut final (non pending) */}
          {!isPending && (
            <div className={`rounded-xl px-3.5 py-4 text-center border ${
              sub.statut === 'VALIDE'
                ? 'bg-[#e8f5e9] border-[#a5d6a7]'
                : 'bg-[#fff0f0] border-[#f5c6c6]'
            }`}>
              <div className="text-2xl mb-1">{sub.statut === 'VALIDE' ? '✅' : '✕'}</div>
              <p className={`text-sm font-bold ${sub.statut === 'VALIDE' ? 'text-[#2E7D32]' : 'text-[#C62828]'}`}>
                {sub.statut === 'VALIDE' ? 'Soumission validée' : 'Soumission rejetée'}
              </p>
              {sub.statut === 'VALIDE' && (
                <p className="text-xs text-[#388e3c] mt-0.5">Le gardien a gagné +{sub.challenge.points} pts</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Utilitaire ───────────────────────────────────────────────────────────────

function EmptyState({ icon, title, sub, pulse }: { icon: string; title: string; sub: string; pulse?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className={`w-20 h-20 rounded-full bg-[#f3f3f5] flex items-center justify-center text-4xl mb-4 ${pulse ? 'animate-pulse' : ''}`}>
        {icon}
      </div>
      <p className="text-[15px] font-bold text-[#1F1B2E]">{title}</p>
      {sub && <p className="text-sm text-[#9b9ba8] mt-1 leading-relaxed max-w-xs">{sub}</p>}
    </div>
  );
}
