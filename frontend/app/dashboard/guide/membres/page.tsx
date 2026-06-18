'use client';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { usersApi } from '@/lib/api';
import { usePastoralYear } from '@/store/pastoralYear';
import { deferEffect } from '@/lib/effects';
import { Pagination } from '@/components/ui/Pagination';
import { CreateUserModal } from '@/components/users/CreateUserModal';
import type { User, AdhesionStatus, Adhesion } from '@/types';

const PER_PAGE = 20;
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:4000';

// ─── Config statuts ───────────────────────────────────────────────────────────

const STATUT_PILL: Record<string, string> = {
  ACTIF: 'bg-[#e8f5e9] text-[#2E7D32] border-[#a5d6a7]',
  SUSPENDU: 'bg-[#ffebee] text-[#E55A35] border-[#ef9a9a]',
  EN_ATTENTE_ACTIVATION: 'bg-[#fff8e1] text-[#D9A441] border-[#ffe082]',
  EN_ATTENTE_VALIDATION: 'bg-[#fff8e1] text-[#D9A441] border-[#ffe082]',
  INACTIF: 'bg-[#ffebee] text-[#E55A35] border-[#ef9a9a]',
  ARCHIVE: 'bg-[#f5f5f5] text-[#9b9ba8] border-[#e0e0e0]',
};
const STATUT_LABEL: Record<string, string> = {
  ACTIF: 'Actif', SUSPENDU: 'Suspendu', EN_ATTENTE_ACTIVATION: 'En attente',
  EN_ATTENTE_VALIDATION: 'En att. validation', INACTIF: 'Inactif', ARCHIVE: 'Archivé',
};

const ADH_CFG: Record<AdhesionStatus, { bg: string; text: string; border: string; icon: string; dot: string }> = {
  A_JOUR:     { bg: 'bg-[#e8f5e9]', text: 'text-[#2E7D32]', border: 'border-[#a5d6a7]', icon: '✅', dot: 'bg-[#2E7D32]' },
  NON_A_JOUR: { bg: 'bg-[#ffebee]', text: 'text-[#E55A35]', border: 'border-[#ef9a9a]', icon: '❌', dot: 'bg-[#E55A35]' },
  EN_ATTENTE: { bg: 'bg-[#fff8e1]', text: 'text-[#D9A441]', border: 'border-[#ffe082]', icon: '⏳', dot: 'bg-[#D9A441]' },
};
const ADH_LABEL: Record<AdhesionStatus, string> = {
  A_JOUR: 'À jour', NON_A_JOUR: 'Non à jour', EN_ATTENTE: 'En attente',
};

type FilterKey = 'tous' | AdhesionStatus | 'MANQUANT';
type SentTab   = 'guides' | 'gardiens';

const GRAD = [
  'from-[#F58A4B] via-[#E55A35] to-[#7A2820]',
  'from-[#6A1B9A] to-[#4a1370]',
  'from-[#2E7D32] to-[#1a5021]',
  'from-[#1F1B2E] to-[#3a1d4d]',
];

// ─── Sous-composants ──────────────────────────────────────────────────────────

function AdhBadge({ statut }: { statut?: AdhesionStatus }) {
  if (!statut) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f3f3f5] text-[#9b9ba8] border border-[#e6e6ea]">
      ❓ —
    </span>
  );
  const c = ADH_CFG[statut];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.bg} ${c.text} border ${c.border}`}>
      {c.icon} {ADH_LABEL[statut]}
    </span>
  );
}

function StatusPicker({ value, onChange }: { value: AdhesionStatus | null; onChange: (s: AdhesionStatus) => void }) {
  return (
    <div className="flex gap-2">
      {(['A_JOUR', 'EN_ATTENTE', 'NON_A_JOUR'] as AdhesionStatus[]).map(s => {
        const c = ADH_CFG[s];
        const active = value === s;
        return (
          <button key={s} type="button" onClick={() => onChange(s)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl text-[11px] font-semibold border-2 transition-all ${
              active ? `${c.bg} ${c.text} ${c.border} shadow-sm` : 'bg-white text-[#9b9ba8] border-[#ececf0] hover:border-[#c8c8d4]'
            }`}>
            <span className="text-base leading-none">{c.icon}</span>
            <span>{ADH_LABEL[s]}</span>
          </button>
        );
      })}
    </div>
  );
}

interface RowState { selectedStatut: AdhesionStatus | null; file: File | null; loading: boolean; success: boolean; error: string }

// ─── Page principale ──────────────────────────────────────────────────────────

export default function GuideMembresPage() {
  const { user: actor } = useAuthStore();
  const CURRENT_YEAR    = usePastoralYear(s => s.annee);
  const isSentinelle    = actor?.role === 'SENTINELLE';
  const isGuide         = actor?.role === 'GUIDE';

  const [membres, setMembres]   = useState<User[]>([]);
  const [gardiens, setGardiens] = useState<User[]>([]); // sentinelle : gardiens du district
  const [loading, setLoading]   = useState(true);

  const [search, setSearch]               = useState('');
  const [filter, setFilter]               = useState<FilterKey>('tous');
  const [page, setPage]                   = useState(1);
  const [sentTab, setSentTab]             = useState<SentTab>('guides');
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [createOpen, setCreateOpen]       = useState(false);

  // Adhésions
  const [adhesionCache, setAdhesionCache]   = useState<Record<string, Adhesion | undefined>>({});
  const [activeRow, setActiveRow]           = useState<string | null>(null);
  const [rowStates, setRowStates]           = useState<Record<string, RowState>>({});
  const rowFileRefs                          = useRef<Record<string, HTMLInputElement | null>>({});

  // Mon adhésion
  const [myOpen, setMyOpen]       = useState(false);
  const [myStatut, setMyStatut]   = useState<AdhesionStatus | null>(null);
  const [myFile, setMyFile]       = useState<File | null>(null);
  const [myLoading, setMyLoading] = useState(false);
  const [mySuccess, setMySuccess] = useState(false);
  const [myError, setMyError]     = useState('');
  const myFileRef                  = useRef<HTMLInputElement>(null);

  // ── Chargement ──
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const membresParams: Record<string, string> = { role: isSentinelle ? 'GUIDE' : 'GARDIEN' };
      if (isSentinelle && actor?.district?.id) membresParams.districtId = actor.district.id;
      if (isGuide && actor?.parish?.id)         membresParams.parishId   = actor.parish.id;

      const promises: Promise<{ data: User[] }>[] = [usersApi.list(membresParams)];
      if (isSentinelle) {
        const gParams: Record<string, string> = { role: 'GARDIEN' };
        if (actor?.district?.id) gParams.districtId = actor.district.id;
        promises.push(usersApi.list(gParams));
      }
      const [membresRes, gardiensRes] = await Promise.all(promises);
      const membresData: User[] = membresRes.data;
      const gardiensData: User[] = gardiensRes?.data ?? [];
      setMembres(membresData);
      setGardiens(gardiensData);

      const cache: Record<string, Adhesion | undefined> = {};
      for (const u of [...membresData, ...gardiensData]) {
        cache[u.id] = u.adhesions?.find(a => a.annee === CURRENT_YEAR) ?? u.adhesions?.[0];
      }
      setAdhesionCache(cache);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [actor, isSentinelle, isGuide, CURRENT_YEAR]);

  useEffect(() => deferEffect(reload), [reload]);

  // ── Adhésions ──
  const getRS = (id: string): RowState =>
    rowStates[id] ?? { selectedStatut: null, file: null, loading: false, success: false, error: '' };
  const setRS = (id: string, patch: Partial<RowState>) =>
    setRowStates(prev => ({ ...prev, [id]: { ...getRS(id), ...patch } }));

  const handleRowSave = async (userId: string) => {
    const rs = getRS(userId);
    if (!rs.selectedStatut) return;
    setRS(userId, { loading: true, error: '', success: false });
    try {
      const { data } = await usersApi.updateAdhesion(userId, CURRENT_YEAR, rs.selectedStatut, rs.file ?? undefined);
      setAdhesionCache(prev => ({ ...prev, [userId]: data as Adhesion }));
      setRS(userId, { loading: false, success: true, file: null });
      setTimeout(() => { setActiveRow(null); setRS(userId, { success: false }); }, 900);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setRS(userId, { loading: false, error: err?.response?.data?.message ?? 'Erreur.' });
    }
  };

  const myAdhesion = actor?.adhesions?.find(a => a.annee === CURRENT_YEAR) ?? actor?.adhesions?.[0];
  const handleMySave = async () => {
    if (!actor || !myStatut) return;
    setMyLoading(true); setMyError(''); setMySuccess(false);
    try {
      await usersApi.updateAdhesion(actor.id, CURRENT_YEAR, myStatut, myFile ?? undefined);
      setMySuccess(true); setMyFile(null);
      setTimeout(() => setMyOpen(false), 1000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setMyError(err?.response?.data?.message ?? 'Erreur lors de la mise à jour.');
    } finally { setMyLoading(false); }
  };

  // ── Source + filtre ──
  const activeList = isSentinelle ? (sentTab === 'guides' ? membres : gardiens) : membres;
  const canEditAdhesion = !isSentinelle || sentTab === 'guides'; // sentinelle édite les guides, pas les gardiens

  const getAdhStatut = (u: User) => adhesionCache[u.id]?.statut;

  const afterSearch = activeList.filter(m => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return m.nom.toLowerCase().includes(q) ||
      m.prenoms.toLowerCase().includes(q) ||
      (m.matricule ?? '').toLowerCase().includes(q) ||
      (m.email ?? '').toLowerCase().includes(q) ||
      (m.parish?.nom ?? '').toLowerCase().includes(q);
  });
  const afterFilter = afterSearch.filter(m => {
    if (filter === 'tous')     return true;
    if (filter === 'MANQUANT') return !getAdhStatut(m);
    return getAdhStatut(m) === filter;
  });
  const totalPages = Math.max(1, Math.ceil(afterFilter.length / PER_PAGE));
  const paginated  = afterFilter.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const changeTab = (t: SentTab) => { setSentTab(t); setPage(1); setSearch(''); setFilter('tous'); setExpandedGuide(null); setActiveRow(null); };
  const changeFilter = (f: FilterKey) => { setFilter(f); setPage(1); };
  const changeSearch = (v: string) => { setSearch(v); setPage(1); };

  // ── Stats ──
  const nbAJour    = activeList.filter(m => getAdhStatut(m) === 'A_JOUR').length;
  const nbNonAJour = activeList.filter(m => getAdhStatut(m) === 'NON_A_JOUR').length;
  const nbAttente  = activeList.filter(m => getAdhStatut(m) === 'EN_ATTENTE').length;
  const nbManquant = activeList.filter(m => !getAdhStatut(m)).length;
  const pct        = activeList.length > 0 ? Math.round((nbAJour / activeList.length) * 100) : 0;

  const FILTERS: { key: FilterKey; label: string; count: number; dot: string }[] = [
    { key: 'tous',       label: `Tous (${activeList.length})`, count: activeList.length, dot: '' },
    { key: 'A_JOUR',     label: `À jour (${nbAJour})`,         count: nbAJour,           dot: 'bg-[#2E7D32]' },
    { key: 'NON_A_JOUR', label: `Non à j. (${nbNonAJour})`,   count: nbNonAJour,        dot: 'bg-[#E55A35]' },
    { key: 'EN_ATTENTE', label: `Attente (${nbAttente})`,      count: nbAttente,         dot: 'bg-[#D9A441]' },
    { key: 'MANQUANT',   label: `— (${nbManquant})`,           count: nbManquant,        dot: 'bg-[#9b9ba8]' },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Header ── */}
      {isSentinelle ? (
        <div className="bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] flex-shrink-0">
          <div className="px-4 pt-3 pb-0">
            <h1 className="text-[18px] font-black text-white tracking-tight">Membres</h1>
            <p className="text-[11px] text-white/60 mt-0.5 pb-2">
              {actor?.district?.nom ?? 'Mon district'} · {membres.length} guide{membres.length !== 1 ? 's' : ''}, {gardiens.length} gardien{gardiens.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex border-t border-white/10">
            {([
              { key: 'guides',   label: 'Guides',   count: membres.length },
              { key: 'gardiens', label: 'Gardiens', count: gardiens.length },
            ] as { key: SentTab; label: string; count: number }[]).map(t => (
              <button key={t.key} onClick={() => changeTab(t.key)}
                className={`flex-1 py-2.5 text-[12px] font-bold uppercase tracking-widest transition-colors relative flex items-center justify-center gap-1.5 ${
                  sentTab === t.key ? 'text-white' : 'text-white/40'
                }`}>
                {t.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  sentTab === t.key ? 'bg-white text-[#1F1B2E]' : 'bg-white/15 text-white/60'
                }`}>{t.count}</span>
                {sentTab === t.key && <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-t-sm" />}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] text-white px-4 pt-4 pb-4 flex-shrink-0 flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-black">Mes Gardiens</h1>
            <p className="text-[11px] opacity-70 mt-0.5">{actor?.parish?.nom ?? 'Ma paroisse'}</p>
          </div>
          <button onClick={() => setCreateOpen(true)}
            className="bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-white/30 transition">
            + Ajouter
          </button>
        </div>
      )}

      {/* ── Contenu scrollable ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f5f5fa]">
        <div className="max-w-2xl mx-auto px-3 py-3 lg:px-5 lg:py-4 space-y-3">

          {/* ── Stats + barre de progression ── */}
          <div className="bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] rounded-2xl p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] opacity-70">Adhésions {CURRENT_YEAR}</p>
              <div className="text-right">
                <span className="text-3xl font-black leading-none">{pct}</span>
                <span className="text-base opacity-70">%</span>
                <p className="text-[9px] opacity-60 mt-0.5">à jour</p>
              </div>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'À jour',   value: nbAJour,    bg: 'bg-white/20' },
                { label: 'Non à j.', value: nbNonAJour, bg: 'bg-white/10' },
                { label: 'Attente',  value: nbAttente,  bg: 'bg-white/10' },
                { label: '—',        value: nbManquant, bg: 'bg-white/10' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl py-2 text-center`}>
                  <div className="text-lg font-black leading-none">{s.value}</div>
                  <div className="text-[9px] opacity-70 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Mon adhésion ── */}
          <div className="bg-white rounded-2xl border border-[#ececf0] overflow-hidden">
            <button
              onClick={() => { setMyOpen(v => !v); if (!myOpen) { setMyStatut(myAdhesion?.statut ?? null); setMySuccess(false); setMyError(''); } }}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#fafafa] transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F58A4B] to-[#7A2820] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {actor ? `${actor.nom?.[0] ?? ''}${actor.prenoms?.[0] ?? ''}` : '?'}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-[#1F1B2E]">Mon adhésion</div>
                  <div className="text-[11px] text-[#9b9ba8]">{actor?.prenoms} {actor?.nom}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AdhBadge statut={myAdhesion?.statut} />
                <span className={`text-[#9b9ba8] text-xs transition-transform ${myOpen ? 'rotate-180' : ''}`}>▾</span>
              </div>
            </button>

            {myOpen && (
              <div className="border-t border-[#f0f0f4] px-4 py-3 bg-[#fff8f3]">
                <StatusPicker value={myStatut} onChange={s => { setMyStatut(s); setMySuccess(false); }} />
                <div className="flex items-center gap-2 mt-2.5">
                  <button type="button" onClick={() => myFileRef.current?.click()}
                    className="flex items-center gap-1 text-xs font-medium text-[#E55A35]">
                    <span>📎</span>
                    {myFile ? <span className="truncate max-w-[150px]">{myFile.name}</span> : 'Joindre une preuve'}
                  </button>
                  {!myFile && myAdhesion?.preuveUrl && (
                    <a href={`${API_BASE}${myAdhesion.preuveUrl}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[#E55A35] underline">Voir</a>
                  )}
                  <input ref={myFileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setMyFile(f); setMySuccess(false); } e.target.value = ''; }} />
                </div>
                {mySuccess && <p className="text-xs text-[#2E7D32] font-medium mt-2">✓ Mis à jour.</p>}
                {myError   && <p className="text-xs text-[#E55A35] mt-1.5">{myError}</p>}
                <button onClick={handleMySave} disabled={myLoading || !myStatut}
                  className="w-full mt-3 bg-gradient-to-r from-[#F58A4B] to-[#E55A35] text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition-all">
                  {myLoading ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            )}
          </div>

          {/* ── Liste membres ── */}
          <div className="bg-white rounded-2xl border border-[#ececf0] overflow-hidden">

            {/* Recherche + filtres */}
            <div className="px-4 pt-3 pb-2 border-b border-[#f0f0f4]">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-sm font-bold text-[#1F1B2E]">
                  {isSentinelle ? (sentTab === 'guides' ? 'Mes Guides' : 'Gardiens du district') : 'Mes Gardiens'}
                </h2>
                {isSentinelle && (
                  <button onClick={() => setCreateOpen(true)}
                    className="text-[11px] font-bold text-[#E55A35] bg-[#fff8f3] px-3 py-1 rounded-full border border-[#F58A4B]/30">
                    + Ajouter
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 bg-[#f5f5fa] rounded-xl px-3 py-2 mb-2.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input value={search} onChange={e => changeSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none text-[#1F1B2E] placeholder:text-[#b0b0bc]"
                  placeholder="Nom, matricule, paroisse…" />
                {search && <button onClick={() => changeSearch('')} className="text-[#b0b0bc] text-sm">✕</button>}
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
                {FILTERS.map(f => (
                  <button key={f.key} onClick={() => changeFilter(f.key)}
                    className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                      filter === f.key ? 'bg-[#E55A35] text-white border-[#E55A35]' : 'bg-white text-[#6b6b78] border-[#e6e6ea]'
                    }`}>
                    {f.dot && <span className={`w-1.5 h-1.5 rounded-full ${filter === f.key ? 'bg-white/70' : f.dot}`} />}
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Corps de liste */}
            {loading ? (
              <div className="flex items-center justify-center py-12 text-[#9b9ba8] animate-pulse">
                <div className="text-3xl">👥</div>
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-[#9b9ba8]">
                <div className="text-3xl mb-2">{isSentinelle ? '🛡️' : '🤝'}</div>
                <p className="text-sm font-medium">{search ? `Aucun résultat pour « ${search} »` : 'Aucun membre'}</p>
              </div>
            ) : (
              <>
                {/* Sentinelle onglet Guides : expandable avec leurs gardiens */}
                {isSentinelle && sentTab === 'guides' ? (
                  <div className="divide-y divide-[#f5f5f7]">
                    {paginated.map(guide => {
                      const isExpanded      = expandedGuide === guide.id;
                      const isEditing       = activeRow === guide.id;
                      const guideGardiens   = isExpanded ? gardiens.filter(g => g.parish?.id === guide.parish?.id) : [];
                      const rs              = getRS(guide.id);
                      return (
                        <div key={guide.id}>
                          {/* Ligne guide */}
                          <div className={`flex items-center px-4 py-3 gap-3 transition-colors ${isEditing ? 'bg-[#fff8f3]' : 'hover:bg-[#fafafa]'}`}>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F58A4B] to-[#7A2820] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden relative">
                              {guide.avatarUrl ? <Image src={guide.avatarUrl} fill className="object-cover" alt="" sizes="40px" /> : `${guide.nom?.[0] ?? ''}${guide.prenoms?.[0] ?? ''}`}
                            </div>
                            <button onClick={() => setExpandedGuide(isExpanded ? null : guide.id)}
                              className="flex-1 min-w-0 text-left">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-sm text-[#1F1B2E] truncate">{guide.prenoms} {guide.nom}</span>
                                <span className="text-[10px] text-[#9b9ba8] font-mono">{guide.matricule ?? '—'}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[11px] text-[#9b9ba8]">⛪ {guide.parish?.nom ?? '—'}</span>
                                <AdhBadge statut={getAdhStatut(guide)} />
                              </div>
                            </button>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={() => {
                                  if (isEditing) setActiveRow(null);
                                  else { setActiveRow(guide.id); setRS(guide.id, { selectedStatut: getAdhStatut(guide) ?? null, file: null, success: false, error: '' }); }
                                }}
                                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                                  isEditing ? 'bg-[#f0f0f4] text-[#9b9ba8]' : 'bg-[#fff8f3] text-[#E55A35] border border-[#F58A4B]/30 hover:bg-[#E55A35] hover:text-white'
                                }`}>
                                {isEditing ? 'Fermer' : 'Adhésion'}
                              </button>
                              <button onClick={() => setExpandedGuide(isExpanded ? null : guide.id)}
                                className="text-[#9b9ba8] text-xs w-6 h-6 rounded-lg hover:bg-[#f3f3f5] flex items-center justify-center">
                                <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Panel adhésion inline */}
                          {isEditing && (
                            <div className="bg-[#fff8f3] border-t border-[#ece8f0] px-4 py-3">
                              <p className="text-[11px] font-semibold text-[#6b6b78] mb-2 uppercase tracking-wider">Statut adhésion {CURRENT_YEAR}</p>
                              <StatusPicker value={rs.selectedStatut} onChange={s => setRS(guide.id, { selectedStatut: s, success: false, error: '' })} />
                              <div className="flex items-center gap-2 mt-2.5">
                                <button type="button" onClick={() => rowFileRefs.current[guide.id]?.click()}
                                  className="flex items-center gap-1 text-xs font-medium text-[#E55A35]">
                                  <span>📎</span>
                                  {rs.file ? <span className="truncate max-w-[150px]">{rs.file.name}</span> : 'Joindre une preuve'}
                                </button>
                                {!rs.file && adhesionCache[guide.id]?.preuveUrl && (
                                  <a href={`${API_BASE}${adhesionCache[guide.id]!.preuveUrl}`} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-[#E55A35] underline">Voir</a>
                                )}
                                <input ref={el => { rowFileRefs.current[guide.id] = el; }}
                                  type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                                  onChange={e => { const f = e.target.files?.[0]; if (f) setRS(guide.id, { file: f, success: false }); e.target.value = ''; }} />
                              </div>
                              {rs.success && <p className="text-xs text-[#2E7D32] font-medium mt-2">✓ Mis à jour.</p>}
                              {rs.error   && <p className="text-xs text-[#E55A35] mt-1.5">{rs.error}</p>}
                              <div className="flex gap-2 mt-3">
                                <button onClick={() => setActiveRow(null)}
                                  className="flex-1 py-2 rounded-xl text-xs font-semibold border border-[#ececf0] text-[#6b6b78] hover:bg-[#f7f7fa] transition-colors">
                                  Annuler
                                </button>
                                <button onClick={() => handleRowSave(guide.id)} disabled={rs.loading || !rs.selectedStatut}
                                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#F58A4B] to-[#E55A35] text-white disabled:opacity-60 transition-all">
                                  {rs.loading ? '…' : 'Enregistrer'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Sous-liste gardiens du guide */}
                          {isExpanded && !isEditing && (
                            <div className="bg-[#f7f7fa] border-t border-b border-[#ececf0]">
                              {guideGardiens.length === 0 ? (
                                <p className="text-xs text-[#9b9ba8] text-center py-3">Aucun gardien dans cette paroisse.</p>
                              ) : guideGardiens.map((g, idx) => (
                                <div key={g.id} className="flex items-center px-6 py-2.5 border-b border-[#ececf0] last:border-0">
                                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${GRAD[idx % GRAD.length]} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 overflow-hidden relative`}>
                                    {g.avatarUrl ? <Image src={g.avatarUrl} fill className="object-cover" alt="" sizes="32px" /> : `${g.nom?.[0] ?? ''}${g.prenoms?.[0] ?? ''}`}
                                  </div>
                                  <div className="flex-1 min-w-0 ml-2.5">
                                    <p className="text-sm font-medium text-[#1F1B2E] truncate">{g.prenoms} {g.nom}</p>
                                    <p className="text-[10px] text-[#9b9ba8] font-mono">{g.matricule ?? '—'}</p>
                                  </div>
                                  <AdhBadge statut={getAdhStatut(g)} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Gardiens (Guide ou onglet Gardiens Sentinelle) */
                  <div className="divide-y divide-[#f5f5f7]">
                    {paginated.map((m, idx) => {
                      const isEditing = activeRow === m.id && canEditAdhesion;
                      const rs        = getRS(m.id);
                      return (
                        <div key={m.id}>
                          <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${isEditing ? 'bg-[#fff8f3]' : 'hover:bg-[#fafafa]'}`}>
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getAdhStatut(m) ? ADH_CFG[getAdhStatut(m)!].dot : 'bg-[#ddd]'}`} />
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${GRAD[idx % GRAD.length]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden relative`}>
                              {m.avatarUrl ? <Image src={m.avatarUrl} fill className="object-cover" alt="" sizes="40px" /> : `${m.nom?.[0] ?? ''}${m.prenoms?.[0] ?? ''}`}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="font-semibold text-sm text-[#1F1B2E] truncate">{m.prenoms} {m.nom}</span>
                                <span className="text-[11px] text-[#9b9ba8] font-mono flex-shrink-0">{m.matricule ?? '—'}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {isSentinelle && m.parish && <span className="text-[11px] text-[#9b9ba8]">⛪ {m.parish.nom}</span>}
                                <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUT_PILL[m.statutProfil] ?? 'bg-[#f5f5f5] text-[#9b9ba8] border-[#e0e0e0]'}`}>
                                  {STATUT_LABEL[m.statutProfil] ?? m.statutProfil}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <AdhBadge statut={getAdhStatut(m)} />
                              {canEditAdhesion && (
                                <button
                                  onClick={() => {
                                    if (isEditing) setActiveRow(null);
                                    else { setActiveRow(m.id); setRS(m.id, { selectedStatut: getAdhStatut(m) ?? null, file: null, success: false, error: '' }); }
                                  }}
                                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                                    isEditing ? 'bg-[#f0f0f4] text-[#9b9ba8]' : 'bg-[#fff8f3] text-[#E55A35] border border-[#F58A4B]/30 hover:bg-[#E55A35] hover:text-white'
                                  }`}>
                                  {isEditing ? 'Fermer' : 'Modifier'}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Panel inline adhésion */}
                          {isEditing && (
                            <div className="bg-[#fff8f3] border-t border-[#ece8f0] px-4 py-3">
                              <p className="text-[11px] font-semibold text-[#6b6b78] mb-2 uppercase tracking-wider">Statut adhésion {CURRENT_YEAR}</p>
                              <StatusPicker value={rs.selectedStatut} onChange={s => setRS(m.id, { selectedStatut: s, success: false, error: '' })} />
                              <div className="flex items-center gap-2 mt-2.5">
                                <button type="button" onClick={() => rowFileRefs.current[m.id]?.click()}
                                  className="flex items-center gap-1 text-xs font-medium text-[#E55A35]">
                                  <span>📎</span>
                                  {rs.file ? <span className="truncate max-w-[150px]">{rs.file.name}</span> : 'Joindre une preuve'}
                                </button>
                                {!rs.file && adhesionCache[m.id]?.preuveUrl && (
                                  <a href={`${API_BASE}${adhesionCache[m.id]!.preuveUrl}`} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-[#E55A35] underline">Voir</a>
                                )}
                                <input ref={el => { rowFileRefs.current[m.id] = el; }}
                                  type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                                  onChange={e => { const f = e.target.files?.[0]; if (f) setRS(m.id, { file: f, success: false }); e.target.value = ''; }} />
                              </div>
                              {rs.success && <p className="text-xs text-[#2E7D32] font-medium mt-2">✓ Adhésion mise à jour.</p>}
                              {rs.error   && <p className="text-xs text-[#E55A35] mt-1.5">{rs.error}</p>}
                              <div className="flex gap-2 mt-3">
                                <button onClick={() => setActiveRow(null)}
                                  className="flex-1 py-2 rounded-xl text-xs font-semibold border border-[#ececf0] text-[#6b6b78] hover:bg-[#f7f7fa] transition-colors">
                                  Annuler
                                </button>
                                <button onClick={() => handleRowSave(m.id)} disabled={rs.loading || !rs.selectedStatut}
                                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#F58A4B] to-[#E55A35] text-white disabled:opacity-60 transition-all">
                                  {rs.loading ? '…' : 'Enregistrer'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="border-t border-[#f0f0f4] px-4 py-3">
                    <Pagination page={page} totalItems={afterFilter.length} perPage={PER_PAGE} onChange={p => setPage(p)} />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="h-4" />
        </div>
      </div>

      <CreateUserModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(u: User) => setMembres(prev => [u, ...prev])}
        defaultRole={isGuide ? 'GARDIEN' : undefined}
      />
    </div>
  );
}
