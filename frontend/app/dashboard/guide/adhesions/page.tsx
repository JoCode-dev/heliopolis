'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { usersApi } from '@/lib/api';
import { usePastoralYear } from '@/store/pastoralYear';
import { Pagination } from '@/components/ui/Pagination';
import type { User, AdhesionStatus, Adhesion } from '@/types';

const PER_PAGE = 15;
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:4000';

const STATUS_LABEL: Record<AdhesionStatus, string> = {
  A_JOUR: 'À jour', NON_A_JOUR: 'Non à jour', EN_ATTENTE: 'En attente',
};
const STATUS_CONFIG: Record<AdhesionStatus, {
  bg: string; text: string; border: string; icon: string; bar: string; dot: string;
}> = {
  A_JOUR:     { bg: 'bg-[#e8f5e9]', text: 'text-[#2E7D32]', border: 'border-[#a5d6a7]', icon: '✅', bar: 'bg-[#2E7D32]', dot: 'bg-[#2E7D32]' },
  NON_A_JOUR: { bg: 'bg-[#ffebee]', text: 'text-[#C62828]', border: 'border-[#ef9a9a]', icon: '❌', bar: 'bg-[#C62828]', dot: 'bg-[#C62828]' },
  EN_ATTENTE: { bg: 'bg-[#fff8e1]', text: 'text-[#D9A441]', border: 'border-[#ffe082]', icon: '⏳', bar: 'bg-[#D9A441]', dot: 'bg-[#D9A441]' },
};

type FilterKey = 'tous' | AdhesionStatus | 'MANQUANT';

function AdhesionBadge({ statut }: { statut?: AdhesionStatus }) {
  if (!statut) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f3f3f5] text-[#9b9ba8] border border-[#e6e6ea]">
      ❓ —
    </span>
  );
  const c = STATUS_CONFIG[statut];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.bg} ${c.text} border ${c.border}`}>
      {c.icon} {STATUS_LABEL[statut]}
    </span>
  );
}

function StatusPicker({ value, onChange }: { value: AdhesionStatus | null; onChange: (s: AdhesionStatus) => void }) {
  return (
    <div className="flex gap-2">
      {(['A_JOUR', 'EN_ATTENTE', 'NON_A_JOUR'] as AdhesionStatus[]).map(s => {
        const c = STATUS_CONFIG[s];
        const active = value === s;
        return (
          <button key={s} type="button" onClick={() => onChange(s)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl text-[11px] font-semibold border-2 transition-all ${
              active
                ? `${c.bg} ${c.text} ${c.border} shadow-sm`
                : 'bg-white text-[#9b9ba8] border-[#ececf0] hover:border-[#c8c8d4]'
            }`}>
            <span className="text-base leading-none">{c.icon}</span>
            <span>{STATUS_LABEL[s]}</span>
          </button>
        );
      })}
    </div>
  );
}

interface RowState {
  selectedStatut: AdhesionStatus | null;
  file: File | null;
  loading: boolean;
  success: boolean;
  error: string;
}

const ADHESION_SCOPE: Record<string, { role: string; label: string; sing: string }> = {
  GUIDE:      { role: 'GARDIEN',    label: 'Mes Gardiens',    sing: 'gardien'    },
  SENTINELLE: { role: 'GUIDE',      label: 'Mes Guides',      sing: 'guide'      },
  REGION:     { role: 'SENTINELLE', label: 'Mes Sentinelles', sing: 'sentinelle' },
  ADMIN:      { role: 'SENTINELLE', label: 'Les Sentinelles',  sing: 'sentinelle' },
};

export default function GuideAdhesionsPage() {
  const { user } = useAuthStore();
  const CURRENT_YEAR = usePastoralYear(s => s.annee);
  const scope           = ADHESION_SCOPE[user?.role ?? 'GUIDE'] ?? ADHESION_SCOPE['GUIDE'];
  const isSentinelle    = user?.role === 'SENTINELLE';
  const isAdminOrRegion = user?.role === 'ADMIN' || user?.role === 'REGION';

  const [gardiens, setGardiens]               = useState<User[]>([]);
  const [loadingGardiens, setLoadingGardiens] = useState(true);
  const [search, setSearch]                   = useState('');
  const [filter, setFilter]                   = useState<FilterKey>('tous');
  const [page, setPage]                       = useState(1);

  const [myStatut, setMyStatut]     = useState<AdhesionStatus | null>(null);
  const [myFile, setMyFile]         = useState<File | null>(null);
  const [myLoading, setMyLoading]   = useState(false);
  const [mySuccess, setMySuccess]   = useState(false);
  const [myError, setMyError]       = useState('');
  const [myOpen, setMyOpen]         = useState(false);
  const myFileRef = useRef<HTMLInputElement>(null);

  const [activeRow, setActiveRow]   = useState<string | null>(null);
  const [rowStates, setRowStates]   = useState<Record<string, RowState>>({});
  const rowFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [adhesionCache, setAdhesionCache] = useState<Record<string, Adhesion | undefined>>({});

  useEffect(() => {
    (async () => {
      try {
        const params: Record<string, string> = { role: scope.role };
        if (isSentinelle && user?.district?.id)           params.districtId = user.district.id;
        if (!isSentinelle && !isAdminOrRegion && user?.parish?.id) params.parishId = user.parish.id;
        const { data } = await usersApi.list(params);
        setGardiens(data);
        const cache: Record<string, Adhesion | undefined> = {};
        for (const g of data as User[]) {
          cache[g.id] = g.adhesions?.find(a => a.annee === CURRENT_YEAR) ?? g.adhesions?.[0];
        }
        setAdhesionCache(cache);
      } catch { /* ignore */ }
      finally { setLoadingGardiens(false); }
    })();
  }, [user]);

  const myAdhesion = user?.adhesions?.find(a => a.annee === CURRENT_YEAR) ?? user?.adhesions?.[0];

  const handleMySave = async () => {
    if (!user || !myStatut) return;
    setMyLoading(true); setMyError(''); setMySuccess(false);
    try {
      await usersApi.updateAdhesion(user.id, CURRENT_YEAR, myStatut, myFile ?? undefined);
      setMySuccess(true); setMyFile(null); setTimeout(() => setMyOpen(false), 1000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setMyError(err?.response?.data?.message ?? 'Erreur lors de la mise à jour.');
    } finally { setMyLoading(false); }
  };

  const getRowState = (id: string): RowState =>
    rowStates[id] ?? { selectedStatut: null, file: null, loading: false, success: false, error: '' };
  const setRowState = (id: string, patch: Partial<RowState>) =>
    setRowStates(prev => ({ ...prev, [id]: { ...getRowState(id), ...patch } }));

  const handleRowSave = async (gardienId: string) => {
    const rs = getRowState(gardienId);
    if (!rs.selectedStatut) return;
    setRowState(gardienId, { loading: true, error: '', success: false });
    try {
      const { data } = await usersApi.updateAdhesion(gardienId, CURRENT_YEAR, rs.selectedStatut, rs.file ?? undefined);
      setAdhesionCache(prev => ({ ...prev, [gardienId]: data as Adhesion }));
      setRowState(gardienId, { loading: false, success: true, file: null });
      setTimeout(() => { setActiveRow(null); setRowState(gardienId, { success: false }); }, 900);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setRowState(gardienId, { loading: false, error: err?.response?.data?.message ?? 'Erreur.' });
    }
  };

  const nbAJour    = gardiens.filter(g => adhesionCache[g.id]?.statut === 'A_JOUR').length;
  const nbNonAJour = gardiens.filter(g => adhesionCache[g.id]?.statut === 'NON_A_JOUR').length;
  const nbAttente  = gardiens.filter(g => adhesionCache[g.id]?.statut === 'EN_ATTENTE').length;
  const nbManquant = gardiens.filter(g => !adhesionCache[g.id]?.statut).length;
  const pct        = gardiens.length > 0 ? Math.round((nbAJour / gardiens.length) * 100) : 0;

  const afterSearch = gardiens.filter(g => {
    const q = search.trim().toLowerCase();
    return !q || g.nom.toLowerCase().includes(q) || g.prenoms.toLowerCase().includes(q) || (g.matricule ?? '').toLowerCase().includes(q);
  });
  const afterFilter = afterSearch.filter(g => {
    if (filter === 'tous')     return true;
    if (filter === 'MANQUANT') return !adhesionCache[g.id]?.statut;
    return adhesionCache[g.id]?.statut === filter;
  });

  const totalPages = Math.max(1, Math.ceil(afterFilter.length / PER_PAGE));
  const paginated  = afterFilter.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const handleFilterChange = (f: FilterKey) => { setFilter(f); setPage(1); };
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  const FILTERS: { key: FilterKey; label: string; count: number; dot?: string }[] = [
    { key: 'tous',       label: 'Tous',     count: gardiens.length },
    { key: 'A_JOUR',     label: 'À jour',   count: nbAJour,    dot: 'bg-[#2E7D32]' },
    { key: 'NON_A_JOUR', label: 'Non à j.', count: nbNonAJour, dot: 'bg-[#C62828]' },
    { key: 'EN_ATTENTE', label: 'Attente',  count: nbAttente,  dot: 'bg-[#D9A441]' },
    { key: 'MANQUANT',   label: '—',        count: nbManquant, dot: 'bg-[#9b9ba8]' },
  ];

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f5f5fa]">
      <div className="max-w-2xl mx-auto px-3 py-3 lg:px-6 lg:py-6 space-y-3">

        {/* ── Bandeau stats ── */}
        <div className="bg-gradient-to-br from-[#6A1B9A] to-[#4a1370] rounded-2xl p-4 text-white">
          <div className="flex items-start justify-between mb-2.5">
            <div>
              <p className="text-[10px] opacity-60 uppercase tracking-widest">Adhésions {CURRENT_YEAR}</p>
              <h1 className="text-base font-black mt-0.5">
                {isAdminOrRegion
                  ? (user?.district?.nom ?? 'Tous les doyennés')
                  : (user?.district?.nom ?? user?.parish?.nom ?? 'Mon territoire')}
              </h1>
              <p className="text-[11px] opacity-60 mt-0.5">
                {gardiens.length} {scope.sing}{gardiens.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black leading-none">{pct}<span className="text-2xl">%</span></div>
              <div className="text-[10px] opacity-60 mt-0.5">à jour</div>
            </div>
          </div>

          <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'À jour',  value: nbAJour,    icon: '✅', c: 'bg-white/15' },
              { label: 'Non à j.', value: nbNonAJour, icon: '❌', c: 'bg-white/10' },
              { label: 'Attente', value: nbAttente,  icon: '⏳', c: 'bg-white/10' },
              { label: '—',       value: nbManquant, icon: '❓', c: 'bg-white/10' },
            ].map(s => (
              <div key={s.label} className={`${s.c} rounded-xl py-2 text-center`}>
                <div className="text-sm leading-none mb-0.5">{s.icon}</div>
                <div className="text-xl font-black leading-none">{s.value}</div>
                <div className="text-[9px] opacity-60 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Mon adhésion (accordéon) ── */}
        <div className="bg-white rounded-2xl border border-[#ececf0] overflow-hidden">
          <button
            onClick={() => { setMyOpen(v => !v); if (!myOpen) setMyStatut(myAdhesion?.statut ?? null); }}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#fafafa] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#3d1163] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user ? `${user.nom[0]}${user.prenoms[0]}` : '?'}
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-[#1F1B2E]">Mon adhésion</div>
                <div className="text-[11px] text-[#9b9ba8]">{user?.prenoms} {user?.nom}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AdhesionBadge statut={myAdhesion?.statut} />
              <span className={`text-[#9b9ba8] text-xs transition-transform ${myOpen ? 'rotate-180' : ''}`}>▾</span>
            </div>
          </button>

          {myOpen && (
            <div className="border-t border-[#f0f0f4] px-4 py-3 bg-[#faf8ff]">
              <StatusPicker value={myStatut} onChange={s => { setMyStatut(s); setMySuccess(false); }} />
              <div className="flex items-center gap-2 mt-2.5">
                <button type="button" onClick={() => myFileRef.current?.click()}
                  className="flex items-center gap-1 text-xs font-medium text-[#6A1B9A]">
                  <span>📎</span>
                  {myFile ? <span className="truncate max-w-[150px]">{myFile.name}</span> : 'Joindre une preuve'}
                </button>
                {!myFile && myAdhesion?.preuveUrl && (
                  <a href={`${API_BASE}${myAdhesion.preuveUrl}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#6A1B9A] underline">Voir</a>
                )}
                <input ref={myFileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setMyFile(f); setMySuccess(false); } e.target.value = ''; }} />
              </div>
              {mySuccess && <p className="text-xs text-[#2E7D32] font-medium mt-2">✓ Mis à jour.</p>}
              {myError   && <p className="text-xs text-[#C62828] mt-1.5">{myError}</p>}
              <button onClick={handleMySave} disabled={myLoading || !myStatut}
                className="w-full mt-3 bg-[#6A1B9A] text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors hover:bg-[#5a1280]">
                {myLoading ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          )}
        </div>

        {/* ── Liste des membres ── */}
        <div className="bg-white rounded-2xl border border-[#ececf0] overflow-hidden">

          {/* En-tête + recherche + filtres */}
          <div className="px-4 pt-3 pb-2 border-b border-[#f0f0f4]">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-bold text-[#1F1B2E]">{scope.label}</h2>
              <span className="text-[11px] text-[#9b9ba8]">{afterFilter.length} résultat{afterFilter.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Recherche */}
            <div className="flex items-center gap-2 bg-[#f5f5fa] rounded-xl px-3 py-2 mb-2.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input value={search} onChange={e => handleSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-[#1F1B2E] placeholder:text-[#b0b0bc]"
                placeholder="Nom ou matricule…" />
              {search && <button onClick={() => handleSearch('')} className="text-[#b0b0bc] text-sm">✕</button>}
            </div>

            {/* Filtres */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => handleFilterChange(f.key)}
                  className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                    filter === f.key
                      ? 'bg-[#1F1B2E] text-white border-[#1F1B2E]'
                      : 'bg-white text-[#6b6b78] border-[#e6e6ea]'
                  }`}>
                  {f.dot && <span className={`w-1.5 h-1.5 rounded-full ${filter === f.key ? 'bg-white/70' : f.dot}`} />}
                  {f.label}
                  <span className={`font-bold ${filter === f.key ? 'text-white/70' : 'text-[#9b9ba8]'}`}>{f.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Liste */}
          {loadingGardiens ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#9b9ba8]">
              <div className="text-3xl animate-pulse">👥</div>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-[#9b9ba8]">
              <div className="text-3xl mb-2">🌿</div>
              <p className="text-sm font-medium">Aucun {scope.sing} trouvé</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f5f5f7]">
              {paginated.map(g => {
                const adhesion = adhesionCache[g.id];
                const statut   = adhesion?.statut;
                const rs       = getRowState(g.id);
                const isActive = activeRow === g.id;
                const cfg      = statut ? STATUS_CONFIG[statut] : null;

                return (
                  <div key={g.id}>
                    {/* Ligne */}
                    <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${isActive ? 'bg-[#faf8ff]' : 'hover:bg-[#fafafa]'}`}>

                      {/* Dot statut */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg ? cfg.dot : 'bg-[#ddd]'}`} />

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden"
                        style={{ background: 'linear-gradient(135deg,#6A1B9A,#3d1163)' }}>
                        {g.avatarUrl
                          ? <img src={g.avatarUrl} className="w-full h-full object-cover" alt="" />
                          : `${g.nom[0]}${g.prenoms[0]}`}
                      </div>

                      {/* Nom + matricule */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-[#1F1B2E] truncate">{g.prenoms} {g.nom}</div>
                        <div className="text-[11px] text-[#9b9ba8] font-mono">{g.matricule ?? '—'}</div>
                      </div>

                      <AdhesionBadge statut={statut} />

                      <button
                        onClick={() => {
                          if (isActive) { setActiveRow(null); }
                          else {
                            setActiveRow(g.id);
                            setRowState(g.id, { selectedStatut: statut ?? null, file: null, success: false, error: '' });
                          }
                        }}
                        className={`text-[11px] font-semibold flex-shrink-0 px-2.5 py-1 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-[#f0f0f4] text-[#9b9ba8]'
                            : 'bg-[#EDE7F6] text-[#6A1B9A] hover:bg-[#6A1B9A] hover:text-white'
                        }`}
                      >
                        {isActive ? 'Fermer' : 'Modifier'}
                      </button>
                    </div>

                    {/* Panel inline */}
                    {isActive && (
                      <div className="bg-[#faf8ff] border-t border-[#ece8f8] px-4 py-3">
                        <p className="text-[11px] font-semibold text-[#6b6b78] mb-2 uppercase tracking-wider">
                          Statut adhésion {CURRENT_YEAR}
                        </p>
                        <StatusPicker
                          value={rs.selectedStatut}
                          onChange={s => setRowState(g.id, { selectedStatut: s, success: false, error: '' })}
                        />

                        <div className="flex items-center gap-2 mt-2.5">
                          <button type="button" onClick={() => rowFileRefs.current[g.id]?.click()}
                            className="flex items-center gap-1 text-xs font-medium text-[#6A1B9A]">
                            <span>📎</span>
                            {rs.file
                              ? <span className="truncate max-w-[150px]">{rs.file.name}</span>
                              : 'Joindre une preuve'}
                          </button>
                          {!rs.file && adhesion?.preuveUrl && (
                            <a href={`${API_BASE}${adhesion.preuveUrl}`} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-[#6A1B9A] underline">Voir</a>
                          )}
                          <input ref={el => { rowFileRefs.current[g.id] = el; }}
                            type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) setRowState(g.id, { file: f, success: false }); e.target.value = ''; }} />
                        </div>

                        {rs.success && <p className="text-xs text-[#2E7D32] font-medium mt-2">✓ Adhésion mise à jour.</p>}
                        {rs.error   && <p className="text-xs text-[#C62828] mt-1.5">{rs.error}</p>}

                        <div className="flex gap-2 mt-3">
                          <button onClick={() => setActiveRow(null)}
                            className="flex-1 py-2 rounded-xl text-xs font-semibold border border-[#ececf0] text-[#6b6b78] hover:bg-[#f7f7fa] transition-colors">
                            Annuler
                          </button>
                          <button onClick={() => handleRowSave(g.id)} disabled={rs.loading || !rs.selectedStatut}
                            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#6A1B9A] text-white disabled:opacity-40 hover:bg-[#5a1280] transition-colors">
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
              <Pagination page={page} totalItems={afterFilter.length} perPage={PER_PAGE} onChange={setPage} />
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
