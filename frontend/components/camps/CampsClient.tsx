'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Camp, CampStatus } from '@/types';
import { CampCard } from '@/components/camps/CampCard';
import { useAuthStore } from '@/store/auth';

const PER_PAGE = 8;

type FilterKey = 'TOUS' | 'EN_COURS' | 'OUVERT' | 'A_VENIR' | 'CLOTURE';

const FILTERS: { key: FilterKey; label: string; statuts: CampStatus[] }[] = [
  { key: 'TOUS',    label: 'Tous',      statuts: [] },
  { key: 'EN_COURS',label: 'En cours',  statuts: ['EN_COURS'] },
  { key: 'OUVERT',  label: 'Ouverts',   statuts: ['OUVERT'] },
  { key: 'A_VENIR', label: 'À venir',   statuts: ['BROUILLON'] },
  { key: 'CLOTURE', label: 'Clôturés',  statuts: ['CLOTURE', 'ARCHIVE'] },
];

const FILTER_COLOR: Record<FilterKey, string> = {
  TOUS:    'bg-[#1F1B2E] text-white',
  EN_COURS:'bg-[#D9A441] text-white',
  OUVERT:  'bg-[#2E7D32] text-white',
  A_VENIR: 'bg-[#6A1B9A] text-white',
  CLOTURE: 'bg-[#6b6b78] text-white',
};

export function CampsClient({ initialCamps }: { initialCamps: Camp[] }) {
  const { user } = useAuthStore();
  const [filter, setFilter]   = useState<FilterKey>('TOUS');
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);

  const counts = useMemo(() => ({
    TOUS:    initialCamps.length,
    EN_COURS:initialCamps.filter(c => c.statut === 'EN_COURS').length,
    OUVERT:  initialCamps.filter(c => c.statut === 'OUVERT').length,
    A_VENIR: initialCamps.filter(c => c.statut === 'BROUILLON').length,
    CLOTURE: initialCamps.filter(c => ['CLOTURE','ARCHIVE'].includes(c.statut)).length,
  }), [initialCamps]);

  const filtered = useMemo(() => {
    let list = initialCamps;
    const f = FILTERS.find(x => x.key === filter);
    if (f && f.statuts.length > 0) list = list.filter(c => f.statuts.includes(c.statut));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.nom.toLowerCase().includes(q) ||
        c.lieu?.toLowerCase().includes(q) ||
        c.theme?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [initialCamps, filter, search]);

  const paginated  = filtered.slice(0, page * PER_PAGE);
  const hasMore    = paginated.length < filtered.length;
  const enCours    = initialCamps.filter(c => c.statut === 'EN_COURS');

  const handleFilter = (f: FilterKey) => { setFilter(f); setPage(1); };
  const handleSearch = (v: string)    => { setSearch(v);  setPage(1); };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-[#6A1B9A] to-[#4a1370] text-white px-4 pt-4 pb-5 flex-shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-xl font-black">⛺ Les Camps</h1>
            <p className="text-[11px] opacity-60 mt-0.5 uppercase tracking-widest">
              Héliopolis · Communauté Mahatma Gandhi
            </p>
          </div>
          {enCours.length > 0 && (
            <span className="flex items-center gap-1 bg-[#D9A441] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
              {enCours.length} en cours
            </span>
          )}
        </div>

        {/* Barre de recherche */}
        <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity=".7">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/50 outline-none"
            placeholder="Rechercher un camp, lieu, thème…"
          />
          {search && (
            <button onClick={() => handleSearch('')} className="text-white/70 text-base leading-none">✕</button>
          )}
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto max-w-5xl mx-auto px-4 pt-3 pb-1" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => handleFilter(f.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                filter === f.key
                  ? FILTER_COLOR[f.key] + ' shadow-sm scale-[1.03]'
                  : 'bg-white border border-[#e6e6ea] text-[#6b6b78] hover:border-[#c0c0cc]'
              }`}
            >
              {f.label}
              <span className={`text-[10px] font-bold ${filter === f.key ? 'opacity-70' : 'text-[#9b9ba8]'}`}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Banner auth */}
        <div className="max-w-5xl mx-auto px-4 pt-3">
          {!user ? (
            <AuthBanner />
          ) : user.role === 'GARDIEN' ? (
            <GardienBanner prenom={user.prenoms} />
          ) : null}
        </div>

        {/* Liste */}
        <div className="max-w-5xl mx-auto px-4 pt-2 pb-6">
          {filtered.length === 0 ? (
            <EmptyState hasSearch={!!search.trim()} />
          ) : (
            <>
              {/* Épinglés en cours */}
              {filter === 'TOUS' && enCours.length > 0 && (
                <div className="mb-1">
                  <SectionLabel icon="▶" label="En cours" color="text-[#D9A441]" />
                  <div className="lg:grid lg:grid-cols-2 lg:gap-3">
                    {enCours.map(c => <CampCard key={c.id} camp={c} />)}
                  </div>
                </div>
              )}

              {/* Reste de la liste filtrée (sans les EN_COURS si on est en TOUS) */}
              {(() => {
                const rest = filter === 'TOUS'
                  ? paginated.filter(c => c.statut !== 'EN_COURS')
                  : paginated;

                /* Regroupement par statut si TOUS */
                if (filter === 'TOUS' && rest.length > 0) {
                  const groups: { label: string; icon: string; color: string; items: Camp[] }[] = [
                    { label: 'Ouverts',  icon: '✓', color: 'text-[#2E7D32]', items: rest.filter(c => c.statut === 'OUVERT') },
                    { label: 'À venir',  icon: '◷', color: 'text-[#6A1B9A]', items: rest.filter(c => c.statut === 'BROUILLON') },
                    { label: 'Clôturés', icon: '✕', color: 'text-[#6b6b78]', items: rest.filter(c => ['CLOTURE','ARCHIVE'].includes(c.statut)) },
                  ].filter(g => g.items.length > 0);

                  return groups.map(g => (
                    <div key={g.label} className="mb-1">
                      <SectionLabel icon={g.icon} label={g.label} color={g.color} />
                      <div className="lg:grid lg:grid-cols-2 lg:gap-3">
                        {g.items.map(c => <CampCard key={c.id} camp={c} />)}
                      </div>
                    </div>
                  ));
                }

                return (
                  <div className="lg:grid lg:grid-cols-2 lg:gap-3">
                    {rest.map(c => <CampCard key={c.id} camp={c} />)}
                  </div>
                );
              })()}

              {/* Bouton charger plus */}
              {hasMore && (
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="w-full mt-2 py-3 rounded-2xl border border-[#e6e6ea] bg-white text-sm font-semibold text-[#6A1B9A] hover:bg-[#f0e8ff] transition-colors"
                >
                  Charger {Math.min(PER_PAGE, filtered.length - paginated.length)} camps de plus ↓
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Composants locaux ── */

function SectionLabel({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest ${color} mb-2 mt-3 first:mt-0`}>
      <span>{icon}</span>{label}
    </div>
  );
}

function AuthBanner() {
  return (
    <div className="flex items-center gap-3 bg-gradient-to-r from-[#FFF1DC] to-white border border-[#f0d98a] rounded-2xl p-3.5 mb-1 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#F58A4B] to-[#C62828] rounded-l-2xl" />
      <span className="text-xl ml-1 flex-shrink-0">⛺</span>
      <div className="flex-1 text-xs text-[#1F1B2E] leading-relaxed">
        Pour <strong>t&apos;inscrire à un camp</strong>, active ton profil de gardien.
      </div>
      <Link href="/activation" className="flex-shrink-0 bg-[#C62828] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg">
        Activer →
      </Link>
    </div>
  );
}

function GardienBanner({ prenom }: { prenom: string }) {
  return (
    <div className="flex items-center gap-3 bg-gradient-to-r from-[#e8f5e9] to-white border border-[#a5d6a7] rounded-2xl p-3.5 mb-1 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#4CAF50] to-[#2E7D32] rounded-l-2xl" />
      <span className="text-xl ml-1 flex-shrink-0">👋</span>
      <div className="flex-1 text-xs text-[#1F1B2E] leading-relaxed">
        Bonjour <strong>{prenom}</strong>. Contacte ton Guide pour t&apos;inscrire à un camp ouvert.
      </div>
    </div>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-16 h-16 rounded-full bg-[#f0e8ff] flex items-center justify-center text-3xl mb-3">⛺</div>
      <p className="font-bold text-[#1F1B2E] text-sm">
        {hasSearch ? 'Aucun camp trouvé' : 'Aucun camp pour le moment'}
      </p>
      <p className="text-xs text-[#6b6b78] mt-1.5 max-w-xs leading-relaxed">
        {hasSearch ? 'Essaie un autre mot-clé ou efface ta recherche.' : 'Les prochains camps apparaîtront ici dès qu\'ils seront publiés.'}
      </p>
    </div>
  );
}
