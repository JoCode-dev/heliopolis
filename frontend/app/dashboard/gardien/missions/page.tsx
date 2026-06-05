'use client';
import { useEffect, useState, useCallback } from 'react';
import { challengesApi } from '@/lib/api';
import { Pill, Progress } from '@/components/ui';
import type { Challenge, ChallengeCategory, Submission } from '@/types';

// ─── Constantes ───────────────────────────────────────────────────────────────

const CAT: Record<ChallengeCategory, { border: string; pill: 'rouge' | 'vert' | 'violet' | 'or'; accent: string }> = {
  PERSONNEL:     { border: 'border-l-[#C62828]', pill: 'rouge',  accent: '#C62828' },
  COMMUNAUTAIRE: { border: 'border-l-[#2E7D32]', pill: 'vert',   accent: '#2E7D32' },
  SPIRITUEL:     { border: 'border-l-[#6A1B9A]', pill: 'violet', accent: '#6A1B9A' },
  LONG:          { border: 'border-l-[#D9A441]', pill: 'or',     accent: '#D9A441' },
};
const CAT_LABEL: Record<ChallengeCategory, string> = {
  PERSONNEL: 'Personnel', COMMUNAUTAIRE: 'Communautaire', SPIRITUEL: 'Spirituel', LONG: 'Défi long',
};
const CAT_EMOJI: Record<ChallengeCategory, string> = {
  PERSONNEL: '🌿', COMMUNAUTAIRE: '🤝', SPIRITUEL: '🔥', LONG: '🏔️',
};
const FILTERS: { label: string; value: ChallengeCategory | 'ALL' }[] = [
  { label: 'Tous', value: 'ALL' },
  { label: 'Personnel', value: 'PERSONNEL' },
  { label: 'Communautaire', value: 'COMMUNAUTAIRE' },
  { label: 'Spirituel', value: 'SPIRITUEL' },
  { label: 'Long', value: 'LONG' },
];

type Tab = 'defis' | 'en-cours' | 'accomplies';
const TAB_KEY     = 'gardien-missions-tab';
const STARTED_KEY = 'gardien-missions-started';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function loadStarted(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(STARTED_KEY) ?? '[]')); }
  catch { return new Set(); }
}
function saveStarted(s: Set<string>) {
  localStorage.setItem(STARTED_KEY, JSON.stringify([...s]));
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function MissionsPage() {
  const [tab, setTab]               = useState<Tab>('defis');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [startedIds, setStartedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Challenge | null>(null);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

  const totalPoints = submissions
    .filter(s => s.statut === 'VALIDE')
    .reduce((acc, s) => acc + (s.challenge?.points ?? 0), 0);

  // Persistance des onglets et des missions démarrées
  useEffect(() => {
    const savedTab = localStorage.getItem(TAB_KEY) as Tab;
    if (['defis', 'en-cours', 'accomplies'].includes(savedTab)) setTab(savedTab);
    setStartedIds(loadStarted());
  }, []);

  const changeTab = (t: Tab) => { setTab(t); localStorage.setItem(TAB_KEY, t); };

  const reload = useCallback(() => {
    Promise.all([challengesApi.list(), challengesApi.mySubmissions()])
      .then(([cr, sr]) => { setChallenges(cr.data); setSubmissions(sr.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // Soumissions par défi (ordre chronologique)
  const subsByChallenge = new Map<string, Submission[]>();
  for (const s of submissions) {
    const arr = subsByChallenge.get(s.challengeId) ?? [];
    subsByChallenge.set(s.challengeId, [...arr, s]);
  }

  const getSubs        = (id: string) => subsByChallenge.get(id) ?? [];
  const getValidCount  = (id: string) => getSubs(id).filter(s => s.statut === 'VALIDE').length;
  const submittedToday = (id: string) =>
    getSubs(id).some(s => isSameDay(new Date(s.submittedAt), new Date()));
  const isComplete = (c: Challenge) => c.duree
    ? getValidCount(c.id) >= c.duree
    : getSubs(c.id).some(s => s.statut === 'VALIDE');
  const isInProgress = (c: Challenge) =>
    !isComplete(c) && (startedIds.has(c.id) || getSubs(c.id).length > 0);

  // Partitions des défis
  const completedSet  = challenges.filter(c => isComplete(c));
  const inProgressSet = challenges.filter(c => isInProgress(c));
  const availableSet  = challenges.filter(c => !isComplete(c) && !isInProgress(c));

  // Actions
  const handleStart = (challengeId: string) => {
    const next = new Set(startedIds);
    next.add(challengeId);
    setStartedIds(next);
    saveStarted(next);
    setSelected(null);
    changeTab('en-cours');
    showToast('Mission démarrée ! Soumets ta preuve dans l\'onglet En cours.', true);
  };

  const handleSubmitted = (newSub: Submission) => {
    setSubmissions(prev => [...prev, newSub]);
    showToast(
      selected?.duree ? 'Jour soumis ! En attente de validation.' : 'Preuve soumise ! En attente de validation.',
      true,
    );
  };

  const handleRetracted = (submissionId: string) => {
    setSubmissions(prev => prev.filter(s => s.id !== submissionId));
    showToast('Soumission annulée. Tu peux modifier et renvoyer.', true);
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
      <div className="bg-[#1F1B2E] flex-shrink-0">
        <div className="flex items-end gap-3 px-4 pt-3 pb-0">
          <div>
            <h1 className="text-[18px] font-black text-white tracking-tight">Missions</h1>
            <p className="text-[11px] text-white/50 mt-0.5 pb-2">{challenges.length} défis disponibles</p>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3 pb-2">
            {inProgressSet.length > 0 && (
              <div className="text-center">
                <div className="text-sm font-black text-[#D9A441]">{inProgressSet.length}</div>
                <div className="text-[9px] text-white/50 uppercase tracking-wide">En cours</div>
              </div>
            )}
            {completedSet.length > 0 && (
              <div className="text-center">
                <div className="text-sm font-black text-[#2E7D32]">{completedSet.length}</div>
                <div className="text-[9px] text-white/50 uppercase tracking-wide">Accomplis</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex border-t border-white/10">
          {([
            { key: 'defis',      label: 'Défis',     count: availableSet.length },
            { key: 'en-cours',   label: 'En cours',  count: inProgressSet.length },
            { key: 'accomplies', label: 'Accomplis',  count: completedSet.length },
          ] as { key: Tab; label: string; count: number }[]).map(t => (
            <button key={t.key} onClick={() => changeTab(t.key)}
              className={`flex-1 py-2.5 text-[12px] font-bold uppercase tracking-widest transition-colors relative flex items-center justify-center gap-1.5 ${
                tab === t.key ? 'text-white' : 'text-white/40'
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  tab === t.key ? 'bg-white text-[#1F1B2E]' : 'bg-white/15 text-white/60'
                }`}>{t.count}</span>
              )}
              {tab === t.key && <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-t-sm" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu par onglet ── */}
      {tab === 'defis' && (
        <DefisTab challenges={availableSet} loading={loading} totalPoints={totalPoints} onOpen={c => setSelected(c)} />
      )}
      {tab === 'en-cours' && (
        <EnCoursTab challenges={inProgressSet} loading={loading}
          subsByChallenge={subsByChallenge} getValidCount={getValidCount}
          submittedToday={submittedToday} onOpen={c => setSelected(c)} />
      )}
      {tab === 'accomplies' && (
        <AccompliesTab challenges={completedSet} loading={loading}
          subsByChallenge={subsByChallenge} getValidCount={getValidCount}
          onOpen={c => setSelected(c)} />
      )}

      {/* ── Panneau de détail ── */}
      {selected && (
        <DetailPanel
          challenge={selected}
          subs={getSubs(selected.id)}
          submittedToday={submittedToday(selected.id)}
          isComplete={isComplete(selected)}
          isInProgress={isInProgress(selected)}
          onClose={() => setSelected(null)}
          onStart={() => handleStart(selected.id)}
          onSubmitted={newSub => { handleSubmitted(newSub); setSelected(null); }}
          onRetracted={handleRetracted}
          onError={msg => showToast(msg, false)}
        />
      )}
    </div>
  );
}

// ─── Onglet 1 : Défis disponibles (cartes + bouton "Voir les détails") ────────

function DefisTab({ challenges, loading, totalPoints, onOpen }: {
  challenges: Challenge[];
  loading: boolean;
  totalPoints: number;
  onOpen: (c: Challenge) => void;
}) {
  const [filter, setFilter] = useState<ChallengeCategory | 'ALL'>('ALL');
  const filtered = filter === 'ALL' ? challenges : challenges.filter(c => c.categorie === filter);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
      <div className="px-3 py-2.5 border-b border-[#f0f0f0] flex gap-2 overflow-x-auto">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === f.value ? 'bg-[#1F1B2E] text-white' : 'bg-[#f3f3f5] text-[#6b6b78]'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && <EmptyState icon="⚔️" title="Chargement…" sub="" pulse />}
      {!loading && filtered.length === 0 && (
        <EmptyState icon="🎯" title="Aucun défi disponible"
          sub="Tous les défis sont en cours ou accomplis." />
      )}

      <div className="p-3 grid gap-3 sm:grid-cols-2">
        {filtered.map(c => (
          <DefiCard key={c.id} challenge={c} totalPoints={totalPoints} onOpen={() => onOpen(c)} />
        ))}
      </div>
    </div>
  );
}

// ─── Carte défi ───────────────────────────────────────────────────────────────

function DefiCard({ challenge: c, totalPoints, onOpen }: {
  challenge: Challenge;
  totalPoints: number;
  onOpen: () => void;
}) {
  const cat     = c.categorie as ChallengeCategory;
  const style   = CAT[cat];
  const locked  = (c.pointsRequis ?? 0) > 0 && totalPoints < (c.pointsRequis ?? 0);

  return (
    <div className={`rounded-2xl border border-l-4 shadow-sm flex flex-col transition-all ${
      locked
        ? 'bg-[#f9f9fc] border-[#ddd] border-l-[#ccc] opacity-75'
        : `bg-white border-[#ececf0] ${style.border}`
    }`}>
      <div className="p-3.5 flex-1">
        <div className="flex items-start gap-2 mb-2">
          <span className="text-2xl flex-shrink-0">{locked ? '🔒' : CAT_EMOJI[cat]}</span>
          <h4 className={`font-bold text-sm leading-tight ${locked ? 'text-[#9b9ba8]' : 'text-[#1F1B2E]'}`}>
            {c.titre}
          </h4>
        </div>
        <p className="text-[11px] text-[#6b6b78] leading-relaxed line-clamp-2 mb-3">{c.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Pill variant={locked ? 'gris' : style.pill}>{CAT_LABEL[cat]}</Pill>
            {c.duree && <Pill variant="gris">{c.duree}j</Pill>}
          </div>
          <span className="text-sm font-black" style={{ color: locked ? '#9b9ba8' : style.accent }}>
            +{c.points} pts
          </span>
        </div>
        {locked && (
          <div className="mt-2 flex items-center gap-1.5 bg-[#fff8e6] border border-[#f0d98a] rounded-lg px-2.5 py-1.5">
            <span className="text-base">⭐</span>
            <span className="text-[11px] text-[#9c7218] font-semibold">
              Requis : {c.pointsRequis} pts · Tu as {totalPoints} pts
            </span>
          </div>
        )}
      </div>
      <button
        onClick={locked ? undefined : onOpen}
        disabled={locked}
        className={`w-full py-2.5 text-xs font-bold border-t rounded-b-2xl transition-all ${
          locked
            ? 'border-[#e8e8ec] text-[#b0b0bc] cursor-not-allowed'
            : 'border-[#ececf0] hover:bg-[#f7f7fa] active:scale-[0.99]'
        }`}
        style={{ color: locked ? undefined : style.accent }}
      >
        {locked ? '🔒 Défi verrouillé' : 'Voir les détails →'}
      </button>
    </div>
  );
}

// ─── Onglet 2 : En cours ──────────────────────────────────────────────────────

function EnCoursTab({ challenges, loading, subsByChallenge, getValidCount, submittedToday, onOpen }: {
  challenges: Challenge[];
  loading: boolean;
  subsByChallenge: Map<string, Submission[]>;
  getValidCount: (id: string) => number;
  submittedToday: (id: string) => boolean;
  onOpen: (c: Challenge) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
      {loading && <EmptyState icon="⏳" title="Chargement…" sub="" pulse />}
      {!loading && challenges.length === 0 && (
        <EmptyState icon="🎯" title="Aucune mission en cours"
          sub="Va dans l'onglet Défis, choisis une mission et clique sur « Commencer »." />
      )}
      {!loading && challenges.length > 0 && (
        <>
          <div className="px-4 py-2 bg-[#F7F8FA] border-b border-[#f0f0f0]">
            <span className="text-[11px] text-[#9b9ba8] font-bold uppercase tracking-wider">
              {challenges.length} mission{challenges.length > 1 ? 's' : ''} en cours
            </span>
          </div>
          <div className="divide-y divide-[#f5f5f7]">
            {challenges.map(c => (
              <ChallengeRow key={c.id} challenge={c}
                subs={subsByChallenge.get(c.id) ?? []}
                validCount={getValidCount(c.id)}
                todayDone={submittedToday(c.id)}
                onClick={() => onOpen(c)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Onglet 3 : Accomplies ────────────────────────────────────────────────────

function AccompliesTab({ challenges, loading, subsByChallenge, getValidCount, onOpen }: {
  challenges: Challenge[];
  loading: boolean;
  subsByChallenge: Map<string, Submission[]>;
  getValidCount: (id: string) => number;
  onOpen: (c: Challenge) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
      {loading && <EmptyState icon="🏅" title="Chargement…" sub="" pulse />}
      {!loading && challenges.length === 0 && (
        <EmptyState icon="🏁" title="Aucune mission accomplie"
          sub="Continue tes missions en cours pour les voir apparaître ici." />
      )}
      {!loading && challenges.length > 0 && (
        <>
          <div className="px-4 py-2 bg-[#F7F8FA] border-b border-[#f0f0f0]">
            <span className="text-[11px] text-[#9b9ba8] font-bold uppercase tracking-wider">
              {challenges.length} mission{challenges.length > 1 ? 's' : ''} accomplie{challenges.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-[#f5f5f7]">
            {challenges.map(c => {
              const cat   = c.categorie as ChallengeCategory;
              const style = CAT[cat];
              const subs  = subsByChallenge.get(c.id) ?? [];
              const validCount = getValidCount(c.id);
              const lastValidated = [...subs].reverse().find(s => s.statut === 'VALIDE');
              const dateStr = lastValidated?.validatedAt
                ? new Date(lastValidated.validatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                : null;

              return (
                <button key={c.id} onClick={() => onOpen(c)}
                  className="flex items-center w-full px-4 py-3.5 hover:bg-[#F5F5F5] transition-colors text-left">
                  <div className="w-[50px] h-[50px] rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${style.accent}22, ${style.accent}44)`, border: `2px solid ${style.accent}40` }}>
                    {CAT_EMOJI[cat]}
                  </div>
                  <div className="flex-1 min-w-0 ml-3 py-1 border-b border-[#F2F2F2]">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-semibold text-[15px] text-[#1F1B2E] truncate">{c.titre}</span>
                      <span className="text-[12px] text-[#9b9ba8] flex-shrink-0">{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Pill variant={style.pill}>{CAT_LABEL[cat]}</Pill>
                      {c.duree && <span className="text-[12px] text-[#9b9ba8]">{validCount}/{c.duree}j</span>}
                      <span className="ml-auto text-[13px] font-black text-[#2E7D32]">+{c.points} pts</span>
                    </div>
                  </div>
                  <span className="text-xl ml-3">✅</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Ligne challenge (onglets En cours / Accomplies) ──────────────────────────

function ChallengeRow({ challenge: c, subs, validCount, todayDone, onClick }: {
  challenge: Challenge; subs: Submission[]; validCount: number; todayDone: boolean; onClick: () => void;
}) {
  const cat    = c.categorie as ChallengeCategory;
  const style  = CAT[cat];
  const lastSub = subs[subs.length - 1];
  const isDuration = !!c.duree;

  return (
    <button onClick={onClick}
      className="flex items-center w-full px-4 py-3.5 hover:bg-[#F5F5F5] transition-colors text-left group">
      <div className="w-[50px] h-[50px] rounded-full flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${style.accent}22, ${style.accent}44)`, border: `2px solid ${style.accent}40` }}>
        {CAT_EMOJI[cat]}
      </div>
      <div className="flex-1 min-w-0 ml-3 py-1 border-b border-[#F2F2F2]">
        <div className="flex justify-between items-baseline gap-2">
          <span className="font-semibold text-[15px] text-[#1F1B2E] truncate">{c.titre}</span>
          <span className="text-[13px] font-black flex-shrink-0" style={{ color: style.accent }}>+{c.points}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Pill variant={style.pill}>{CAT_LABEL[cat]}</Pill>
          {isDuration
            ? todayDone
              ? <span className="text-[12px] text-[#D9A441] font-semibold ml-auto">⏳ Soumis aujourd'hui</span>
              : subs.length > 0
                ? <span className="text-[12px] text-[#C62828] font-semibold ml-auto">● Jour {subs.length + 1} à soumettre</span>
                : <span className="text-[12px] text-[#9b9ba8] ml-auto">Pas encore soumis</span>
            : lastSub
              ? <span className={`text-[12px] font-semibold ml-auto ${lastSub.statut === 'EN_ATTENTE' ? 'text-[#D9A441]' : 'text-[#C62828]'}`}>
                  {lastSub.statut === 'EN_ATTENTE' ? '⏳ En attente' : '✕ À corriger'}
                </span>
              : <span className="text-[12px] text-[#9b9ba8] ml-auto">Prêt à soumettre</span>
          }
        </div>
        {isDuration && subs.length > 0 && (
          <div className="mt-1.5">
            <Progress value={validCount} max={c.duree!} />
            <span className="text-[10px] text-[#9b9ba8] mt-0.5 inline-block">{validCount}/{c.duree} jours validés</span>
          </div>
        )}
      </div>
      <svg className="w-4 h-4 text-[#c0c0cc] ml-2 flex-shrink-0 group-hover:text-[#1F1B2E] transition-colors"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ─── Panneau de détail ────────────────────────────────────────────────────────

function DetailPanel({ challenge: c, subs, submittedToday, isComplete, isInProgress, onClose, onStart, onSubmitted, onRetracted, onError }: {
  challenge: Challenge;
  subs: Submission[];
  submittedToday: boolean;
  isComplete: boolean;
  isInProgress: boolean;
  onClose: () => void;
  onStart: () => void;
  onSubmitted: (sub: Submission) => void;
  onRetracted: (subId: string) => void;
  onError: (msg: string) => void;
}) {
  const [proofText, setProofText]   = useState('');
  const [photo, setPhoto]           = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retracting, setRetracting] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    } else {
      setPhotoPreview(null);
    }
  };
  const removePhoto = () => { setPhoto(null); setPhotoPreview(null); };

  const cat        = c.categorie as ChallengeCategory;
  const style      = CAT[cat];
  const isDuration = !!c.duree;
  const validCount = subs.filter(s => s.statut === 'VALIDE').length;
  const lastSub    = subs[subs.length - 1];
  const nextDay    = subs.length + 1;
  const notStarted = !isInProgress && !isComplete;

  const canSubmitSimple = isInProgress && !isDuration &&
    (!lastSub || ['REJETE', 'CORRECTION_DEMANDEE'].includes(lastSub.statut));
  const canSubmitDay = isInProgress && isDuration && !isComplete && !submittedToday;

  const handleSubmit = async () => {
    if (!proofText.trim() && !photo) return;
    setSubmitting(true);
    try {
      const { data } = await challengesApi.submit(c.id, { texte: proofText.trim() }, photo);
      onSubmitted({ ...data, challenge: c });
      setProofText('');
      setPhoto(null);
      setPhotoPreview(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Erreur lors de la soumission.';
      onError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetract = async (subId: string) => {
    setRetracting(subId);
    try {
      await challengesApi.retractSubmission(subId);
      onRetracted(subId);
    } catch {
      onError('Impossible d\'annuler cette soumission.');
    } finally {
      setRetracting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full max-w-lg rounded-t-3xl lg:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">

        {/* En-tête */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b-[3px]" style={{ borderColor: style.accent }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <Pill variant={style.pill}>{CAT_LABEL[cat]}</Pill>
                {isDuration && <Pill variant="gris">{c.duree} jours</Pill>}
                {isComplete && <Pill variant="vert">✓ Accompli</Pill>}
              </div>
              <h2 className="text-[18px] font-black text-[#1F1B2E] leading-tight">{CAT_EMOJI[cat]} {c.titre}</h2>
              <p className="text-base font-black mt-1" style={{ color: style.accent }}>+{c.points} pts</p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#f3f3f5] flex items-center justify-center text-[#6b6b78] hover:bg-[#ebebf0] transition flex-shrink-0">
              ✕
            </button>
          </div>
          {isDuration && isInProgress && (
            <div className="mt-3">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-[#6b6b78]">Progression</span>
                <span className="text-xs font-bold" style={{ color: style.accent }}>{validCount} / {c.duree} jours validés</span>
              </div>
              <Progress value={validCount} max={c.duree!} />
            </div>
          )}
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Description */}
          <div>
            <p className="text-[10px] font-bold text-[#9b9ba8] uppercase tracking-wider mb-1.5">Description</p>
            <p className="text-sm text-[#1F1B2E] leading-relaxed">{c.description}</p>
          </div>

          {/* Preuve requise */}
          {c.preuveDemandee && (
            <div className="bg-[#fff8e6] rounded-xl px-3.5 py-3 border border-[#f0d88a]">
              <p className="text-[10px] font-bold text-[#9c7218] uppercase tracking-wider mb-1">
                {isDuration ? 'Preuve requise chaque jour' : 'Preuve requise'}
              </p>
              <p className="text-sm text-[#7a5a00]">📸 {c.preuveDemandee}</p>
            </div>
          )}

          {/* === Mission pas encore commencée : bouton Commencer === */}
          {notStarted && (
            <button onClick={onStart}
              className="w-full py-4 rounded-2xl text-white font-bold text-sm active:scale-95 transition shadow-md"
              style={{ background: `linear-gradient(135deg, ${style.accent}, ${style.accent}cc)` }}>
              🚀 Commencer la mission
            </button>
          )}

          {/* === Mission en cours === */}
          {isInProgress && (
            <>
              {/* Calendrier journalier */}
              {isDuration && subs.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-[#9b9ba8] uppercase tracking-wider mb-2">Historique des jours</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: c.duree! }, (_, i) => {
                      const sub    = subs[i];
                      const status = !sub ? 'empty'
                        : sub.statut === 'VALIDE' ? 'valide'
                        : ['REJETE', 'CORRECTION_DEMANDEE'].includes(sub.statut) ? 'rejete'
                        : 'attente';
                      return (
                        <div key={i} title={`Jour ${i + 1}`}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold border ${
                            status === 'valide'  ? 'bg-[#2E7D32] text-white border-[#2E7D32]' :
                            status === 'attente' ? 'bg-[#fff8e6] text-[#9c7218] border-[#D9A441]' :
                            status === 'rejete'  ? 'bg-[#fff0f0] text-[#C62828] border-[#C62828]' :
                            'bg-[#f3f3f5] text-[#c0c0c8] border-[#ececf0]'
                          }`}>
                          {status === 'valide' ? '✓' : status === 'attente' ? '⏳' : status === 'rejete' ? '✕' : i + 1}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-2 text-[10px] text-[#9b9ba8]">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#2E7D32] inline-block" />Validé</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#D9A441] inline-block" />En attente</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#C62828] inline-block" />Rejeté</span>
                  </div>
                </div>
              )}

              {/* Soumission en attente (défi simple) avec bouton Annuler */}
              {!isDuration && lastSub?.statut === 'EN_ATTENTE' && (
                <div className="bg-[#fff8e6] rounded-xl px-3.5 py-3.5 border border-[#f0d88a]">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[10px] font-bold text-[#9c7218] uppercase tracking-wider">En attente de validation</p>
                    <button
                      onClick={() => handleRetract(lastSub.id)}
                      disabled={retracting === lastSub.id}
                      className="text-[10px] font-bold text-[#C62828] bg-white border border-[#f5c6c6] px-2.5 py-1 rounded-full flex-shrink-0 hover:bg-[#fff0f0] transition disabled:opacity-50">
                      {retracting === lastSub.id ? '…' : '✕ Annuler'}
                    </button>
                  </div>
                  <p className="text-sm text-[#7a5a00] italic">« {lastSub.texte} »</p>
                  <p className="text-[11px] text-[#9c7218] mt-1">Annule pour modifier et renvoyer.</p>
                </div>
              )}

              {/* Soumission rejetée / correction */}
              {!isDuration && lastSub && ['REJETE', 'CORRECTION_DEMANDEE'].includes(lastSub.statut) && (
                <div className="bg-[#fff5f5] rounded-xl px-3.5 py-3 border border-[#f5c6c6]">
                  <p className="text-[10px] font-bold text-[#C62828] uppercase tracking-wider mb-1">
                    {lastSub.statut === 'REJETE' ? 'Soumission rejetée' : 'Correction demandée'}
                  </p>
                  {lastSub.texte && <p className="text-sm text-[#7a1717] italic">« {lastSub.texte} »</p>}
                </div>
              )}

              {/* Défi à durée : déjà soumis aujourd'hui */}
              {isDuration && submittedToday && !isComplete && (
                <>
                  {/* Annuler la soumission du jour */}
                  {lastSub?.statut === 'EN_ATTENTE' && (
                    <div className="flex items-center justify-between bg-[#fff8e6] rounded-xl px-3.5 py-3 border border-[#f0d88a]">
                      <div>
                        <p className="text-sm font-bold text-[#9c7218]">⏳ Preuve du jour soumise</p>
                        <p className="text-xs text-[#7a5a00] mt-0.5">Reviens demain pour le jour {subs.length + 1}.</p>
                      </div>
                      <button
                        onClick={() => handleRetract(lastSub.id)}
                        disabled={retracting === lastSub.id}
                        className="text-[10px] font-bold text-[#C62828] bg-white border border-[#f5c6c6] px-2.5 py-1.5 rounded-full flex-shrink-0 hover:bg-[#fff0f0] transition ml-3 disabled:opacity-50">
                        {retracting === lastSub.id ? '…' : '✕ Annuler'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Formulaire soumission */}
              {(canSubmitSimple || canSubmitDay) && (
                <div>
                  <p className="text-[10px] font-bold text-[#1F1B2E] uppercase tracking-wider mb-2">
                    {isDuration ? `Preuve du jour ${nextDay} sur ${c.duree}` : lastSub ? 'Nouvelle soumission' : 'Soumettre ma preuve'}
                  </p>

                  <textarea
                    value={proofText}
                    onChange={e => setProofText(e.target.value)}
                    autoFocus
                    placeholder={isDuration
                      ? `Décris ce que tu as accompli aujourd'hui (jour ${nextDay})…`
                      : 'Décris ce que tu as accompli et comment tu l\'as réalisé…'}
                    rows={3}
                    className="w-full px-3.5 py-3 border border-[#e6e6ea] rounded-xl text-sm font-sans resize-none focus:outline-none focus:border-[#6A1B9A] transition"
                  />

                  {/* Zone photo optionnelle */}
                  <div className="mt-2">
                    {photoPreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-[#ececf0]">
                        <img src={photoPreview} alt="Aperçu" className="w-full max-h-48 object-cover" />
                        <button
                          onClick={removePhoto}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center text-xs font-bold hover:bg-black/80 transition">
                          ✕
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                          📸 {photo?.name}
                        </div>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2.5 w-full px-3.5 py-3 border border-dashed border-[#c8c8d4] rounded-xl cursor-pointer hover:border-[#6A1B9A] hover:bg-[#f5f0ff] transition group">
                        <span className="text-xl">📸</span>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-[#6b6b78] group-hover:text-[#6A1B9A] transition">Ajouter une photo <span className="font-normal text-[#9b9ba8]">(optionnel)</span></p>
                          <p className="text-[10px] text-[#9b9ba8] mt-0.5">JPEG, PNG, WebP · max 10 Mo</p>
                        </div>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={handlePhotoChange}
                        />
                      </label>
                    )}
                  </div>

                  <button onClick={handleSubmit}
                    disabled={submitting || (!proofText.trim() && !photo)}
                    className="w-full mt-3 py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition"
                    style={{ background: style.accent }}>
                    {submitting ? 'Envoi en cours…'
                      : isDuration ? `Soumettre — Jour ${nextDay} sur ${c.duree}`
                      : lastSub ? 'Renvoyer ma preuve'
                      : 'Soumettre ma preuve'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* === Accomplie === */}
          {isComplete && (
            <div className="bg-[#e8f5e9] rounded-xl px-3.5 py-4 border border-[#a5d6a7] text-center">
              <div className="text-3xl mb-1">✅</div>
              <p className="text-sm font-bold text-[#2E7D32]">Mission accomplie !</p>
              <p className="text-xs text-[#388e3c] mt-0.5">+{c.points} points gagnés</p>
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
