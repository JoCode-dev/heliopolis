'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { usersApi } from '@/lib/api';
import { Pagination } from '@/components/ui/Pagination';
import type { User, AdhesionStatus, Adhesion } from '@/types';

const PER_PAGE = 15;
const CURRENT_YEAR = new Date().getFullYear();
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:4000';

const STATUS_LABEL: Record<AdhesionStatus, string> = {
  A_JOUR:     'À jour',
  NON_A_JOUR: 'Non à jour',
  EN_ATTENTE: 'En attente',
};

const STATUS_CONFIG: Record<AdhesionStatus, { bg: string; text: string; border: string; icon: string; bar: string }> = {
  A_JOUR:     { bg: 'bg-[#e1f4e3]', text: 'text-[#2E7D32]', border: 'border-[#a5d6a7]', icon: '✅', bar: 'bg-[#2E7D32]' },
  NON_A_JOUR: { bg: 'bg-[#ffe6e6]', text: 'text-[#C62828]', border: 'border-[#ef9a9a]', icon: '❌', bar: 'bg-[#C62828]' },
  EN_ATTENTE: { bg: 'bg-[#fff8e1]', text: 'text-[#D9A441]', border: 'border-[#ffe082]', icon: '⏳', bar: 'bg-[#D9A441]' },
};

type FilterKey = 'tous' | AdhesionStatus | 'MANQUANT';

function AdhesionPill({ statut }: { statut?: AdhesionStatus }) {
  if (!statut) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f3f3f5] text-[#6b6b78] border border-[#e6e6ea]">
      ❓ Non renseigné
    </span>
  );
  const c = STATUS_CONFIG[statut];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text} border ${c.border}`}>
      {c.icon} {STATUS_LABEL[statut]}
    </span>
  );
}

function StatusSelector({
  value, onChange,
}: {
  value: AdhesionStatus | null;
  onChange: (s: AdhesionStatus) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(['A_JOUR', 'EN_ATTENTE', 'NON_A_JOUR'] as AdhesionStatus[]).map(s => {
        const c = STATUS_CONFIG[s];
        const active = value === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-[11px] font-semibold border-2 transition-all ${
              active
                ? `${c.bg} ${c.text} ${c.border} scale-[1.02] shadow-sm`
                : 'bg-white text-[#6b6b78] border-[#ececf0] hover:border-[#d0d0d8]'
            }`}
          >
            <span className="text-lg leading-none">{c.icon}</span>
            {STATUS_LABEL[s]}
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

export default function GuideAdhesionsPage() {
  const { user } = useAuthStore();
  const [gardiens, setGardiens]           = useState<User[]>([]);
  const [loadingGardiens, setLoadingGardiens] = useState(true);
  const [search, setSearch]               = useState('');
  const [filter, setFilter]               = useState<FilterKey>('tous');
  const [page, setPage]                   = useState(1);

  const [guideStatut, setGuideStatut]     = useState<AdhesionStatus | null>(null);
  const [guideFile, setGuideFile]         = useState<File | null>(null);
  const [guideLoading, setGuideLoading]   = useState(false);
  const [guideSuccess, setGuideSuccess]   = useState(false);
  const [guideError, setGuideError]       = useState('');
  const guideFileRef = useRef<HTMLInputElement>(null);

  const [activeRow, setActiveRow]         = useState<string | null>(null);
  const [rowStates, setRowStates]         = useState<Record<string, RowState>>({});
  const rowFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [adhesionCache, setAdhesionCache] = useState<Record<string, Adhesion | undefined>>({});

  useEffect(() => {
    (async () => {
      try {
        const { data } = await usersApi.list({ role: 'GARDIEN' });
        setGardiens(data);
        const cache: Record<string, Adhesion | undefined> = {};
        for (const g of data as User[]) {
          cache[g.id] = g.adhesions?.find(a => a.annee === CURRENT_YEAR) ?? g.adhesions?.[0];
        }
        setAdhesionCache(cache);
      } catch { /* ignore */ }
      finally { setLoadingGardiens(false); }
    })();
  }, []);

  const currentGuideAdhesion = user?.adhesions?.find(a => a.annee === CURRENT_YEAR) ?? user?.adhesions?.[0];

  const handleGuideSave = async () => {
    if (!user || !guideStatut) return;
    setGuideLoading(true); setGuideError(''); setGuideSuccess(false);
    try {
      await usersApi.updateAdhesion(user.id, CURRENT_YEAR, guideStatut, guideFile ?? undefined);
      setGuideSuccess(true); setGuideFile(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setGuideError(err?.response?.data?.message ?? 'Erreur lors de la mise à jour.');
    } finally { setGuideLoading(false); }
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
      const { data } = await usersApi.updateAdhesion(
        gardienId, CURRENT_YEAR, rs.selectedStatut, rs.file ?? undefined,
      );
      setAdhesionCache(prev => ({ ...prev, [gardienId]: data as Adhesion }));
      setRowState(gardienId, { loading: false, success: true, file: null });
      setTimeout(() => { setActiveRow(null); setRowState(gardienId, { success: false }); }, 1200);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setRowState(gardienId, { loading: false, error: err?.response?.data?.message ?? 'Erreur.' });
    }
  };

  /* ── Computed stats ── */
  const nbAJour     = gardiens.filter(g => adhesionCache[g.id]?.statut === 'A_JOUR').length;
  const nbNonAJour  = gardiens.filter(g => adhesionCache[g.id]?.statut === 'NON_A_JOUR').length;
  const nbAttente   = gardiens.filter(g => adhesionCache[g.id]?.statut === 'EN_ATTENTE').length;
  const nbManquant  = gardiens.filter(g => !adhesionCache[g.id]?.statut).length;
  const pct         = gardiens.length > 0 ? Math.round((nbAJour / gardiens.length) * 100) : 0;

  /* ── Filtering ── */
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

  /* ── Filter tabs ── */
  const FILTERS: { key: FilterKey; label: string; count: number; color: string }[] = [
    { key: 'tous',      label: 'Tous',          count: gardiens.length, color: 'text-[#1F1B2E]' },
    { key: 'A_JOUR',    label: 'À jour',         count: nbAJour,         color: 'text-[#2E7D32]' },
    { key: 'NON_A_JOUR',label: 'Non à jour',     count: nbNonAJour,      color: 'text-[#C62828]' },
    { key: 'EN_ATTENTE',label: 'En attente',     count: nbAttente,       color: 'text-[#D9A441]' },
    { key: 'MANQUANT',  label: 'Non renseignés', count: nbManquant,      color: 'text-[#6b6b78]' },
  ];

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f6f6fa]">
      <div className="max-w-3xl mx-auto px-4 py-4 lg:px-6 lg:py-6">

        {/* ── En-tête + stats globales ── */}
        <div className="bg-gradient-to-br from-[#6A1B9A] to-[#4a1370] rounded-2xl p-4 lg:p-5 mb-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-black">Adhésions {CURRENT_YEAR}</h1>
              <p className="text-xs opacity-75 mt-0.5">
                {user?.district?.nom ?? user?.parish?.nom ?? 'Mon territoire'} · {gardiens.length} gardien{gardiens.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black">{pct}%</div>
              <div className="text-[10px] opacity-70 uppercase tracking-wider">à jour</div>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Mini-stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'À jour',     value: nbAJour,    icon: '✅', color: 'bg-white/15' },
              { label: 'Non à jour', value: nbNonAJour, icon: '❌', color: 'bg-white/10' },
              { label: 'En attente', value: nbAttente,  icon: '⏳', color: 'bg-white/10' },
              { label: 'Manquant',   value: nbManquant, icon: '❓', color: 'bg-white/10' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-xl p-2 text-center`}>
                <div className="text-base leading-none mb-0.5">{s.icon}</div>
                <div className="text-lg font-black leading-none">{s.value}</div>
                <div className="text-[9px] opacity-70 mt-0.5 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Mon adhésion ── */}
        <div className="bg-white rounded-2xl border border-[#ececf0] p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#1F1B2E]">Mon adhésion</h2>
            <AdhesionPill statut={currentGuideAdhesion?.statut} />
          </div>

          <StatusSelector value={guideStatut} onChange={s => { setGuideStatut(s); setGuideSuccess(false); }} />

          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => guideFileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-medium text-[#6A1B9A] hover:text-[#4a1370] transition-colors"
            >
              <span>📎</span> Joindre une preuve
            </button>
            {guideFile && (
              <span className="text-xs text-[#6b6b78] truncate max-w-[200px]">{guideFile.name}</span>
            )}
            {!guideFile && currentGuideAdhesion?.preuveUrl && (
              <a
                href={`${API_BASE}${currentGuideAdhesion.preuveUrl}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#6A1B9A] hover:underline"
              >
                Voir la preuve
              </a>
            )}
            <input ref={guideFileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setGuideFile(f); setGuideSuccess(false); } e.target.value = ''; }} />
          </div>

          {guideSuccess && <p className="text-xs text-[#2E7D32] font-medium mt-2">✓ Adhésion mise à jour avec succès.</p>}
          {guideError  && <p className="text-xs text-[#C62828] mt-2">{guideError}</p>}

          <button
            onClick={handleGuideSave}
            disabled={guideLoading || !guideStatut}
            className="w-full mt-3 bg-[#6A1B9A] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#5a1280] transition-colors disabled:opacity-40"
          >
            {guideLoading ? 'Enregistrement…' : 'Enregistrer mon adhésion'}
          </button>
        </div>

        {/* ── Mes Gardiens ── */}
        <div className="bg-white rounded-2xl border border-[#ececf0] overflow-hidden">

          {/* Entête section */}
          <div className="px-4 pt-4 pb-3 border-b border-[#f0f0f4]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#1F1B2E]">
                Mes Gardiens
                {user?.district?.nom ? ` — ${user.district.nom}` : user?.parish?.nom ? ` — ${user.parish.nom}` : ''}
              </h2>
              <span className="text-xs text-[#6b6b78]">{afterFilter.length} résultat{afterFilter.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Barre de recherche */}
            <div className="flex items-center gap-2 bg-[#f6f6fa] rounded-xl px-3 py-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-[#1F1B2E] placeholder:text-[#9b9ba8]"
                placeholder="Rechercher par nom ou matricule…"
              />
              {search && (
                <button onClick={() => handleSearch('')} className="text-[#9b9ba8] text-base leading-none">✕</button>
              )}
            </div>

            {/* Filtres rapides */}
            <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => handleFilterChange(f.key)}
                  className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                    filter === f.key
                      ? 'bg-[#1F1B2E] text-white border-[#1F1B2E]'
                      : `bg-white ${f.color} border-[#e6e6ea] hover:border-[#c0c0cc]`
                  }`}
                >
                  {f.label}
                  <span className={`text-[10px] font-bold px-1 rounded-full ${filter === f.key ? 'text-white/70' : 'text-[#6b6b78]'}`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Liste */}
          {loadingGardiens ? (
            <div className="flex items-center justify-center py-12 text-[#9b9ba8] text-sm">
              <div className="text-3xl mb-3 animate-pulse">👥</div>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#9b9ba8]">
              <div className="text-4xl mb-2">🌿</div>
              <p className="text-sm font-medium">Aucun gardien trouvé</p>
            </div>
          ) : (
            <div>
              {paginated.map((g, i) => {
                const adhesion  = adhesionCache[g.id];
                const statut    = adhesion?.statut;
                const rs        = getRowState(g.id);
                const isActive  = activeRow === g.id;
                const cfg       = statut ? STATUS_CONFIG[statut] : null;

                return (
                  <div key={g.id} className={i > 0 ? 'border-t border-[#f0f0f4]' : ''}>

                    {/* Ligne principale */}
                    <div className={`flex items-center gap-3 px-4 py-3 ${isActive ? 'bg-[#faf8ff]' : 'hover:bg-[#fafafa]'} transition-colors`}>

                      {/* Indicateur coloré */}
                      <div className={`w-1 h-10 rounded-full flex-shrink-0 ${cfg ? cfg.bar : 'bg-[#e0e0e8]'}`} />

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #6A1B9A, #3d1163)' }}>
                        {g.avatarUrl
                          ? <img src={g.avatarUrl} className="w-full h-full object-cover" alt="" />
                          : `${g.nom[0]}${g.prenoms[0]}`}
                      </div>

                      {/* Nom + matricule */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-[#1F1B2E] truncate">{g.prenoms} {g.nom}</div>
                        <div className="text-[11px] text-[#9b9ba8] font-mono">{g.matricule ?? '—'}</div>
                      </div>

                      {/* Pill statut */}
                      <AdhesionPill statut={statut} />

                      {/* Bouton toggle */}
                      <button
                        onClick={() => {
                          if (isActive) {
                            setActiveRow(null);
                          } else {
                            setActiveRow(g.id);
                            setRowState(g.id, { selectedStatut: statut ?? null, file: null, success: false, error: '' });
                          }
                        }}
                        className={`text-xs font-semibold transition-colors flex-shrink-0 ml-1 ${
                          isActive ? 'text-[#9b9ba8]' : 'text-[#6A1B9A] hover:text-[#4a1370]'
                        }`}
                      >
                        {isActive ? 'Fermer' : 'Mettre à jour'}
                      </button>
                    </div>

                    {/* Panel inline d'édition */}
                    {isActive && (
                      <div className="bg-[#faf8ff] border-t border-[#ece8f8] px-4 py-3">
                        <StatusSelector
                          value={rs.selectedStatut}
                          onChange={s => setRowState(g.id, { selectedStatut: s, success: false, error: '' })}
                        />

                        <div className="flex items-center gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => rowFileRefs.current[g.id]?.click()}
                            className="flex items-center gap-1 text-xs font-medium text-[#6A1B9A] hover:text-[#4a1370] transition-colors"
                          >
                            <span>📎</span> Joindre une preuve
                          </button>
                          {rs.file && (
                            <span className="text-xs text-[#6b6b78] truncate max-w-[180px]">{rs.file.name}</span>
                          )}
                          {!rs.file && adhesion?.preuveUrl && (
                            <a href={`${API_BASE}${adhesion.preuveUrl}`} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-[#6A1B9A] hover:underline">
                              Voir la preuve
                            </a>
                          )}
                          <input
                            ref={el => { rowFileRefs.current[g.id] = el; }}
                            type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) setRowState(g.id, { file: f, success: false }); e.target.value = ''; }}
                          />
                        </div>

                        {rs.success && <p className="text-xs text-[#2E7D32] font-medium mt-2">✓ Adhésion mise à jour.</p>}
                        {rs.error   && <p className="text-xs text-[#C62828] mt-2">{rs.error}</p>}

                        <button
                          onClick={() => handleRowSave(g.id)}
                          disabled={rs.loading || !rs.selectedStatut}
                          className="w-full mt-3 bg-[#6A1B9A] text-white py-2 rounded-xl text-xs font-semibold hover:bg-[#5a1280] transition-colors disabled:opacity-40"
                        >
                          {rs.loading ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-[#f0f0f4] px-4 py-3">
              <Pagination page={page} total={totalPages} onChange={setPage} />
            </div>
          )}
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
