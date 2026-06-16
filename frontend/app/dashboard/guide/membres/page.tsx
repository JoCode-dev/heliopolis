'use client';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth';
import { usersApi } from '@/lib/api';
import { deferEffect } from '@/lib/effects';
import { Pill } from '@/components/ui';
import { Pagination } from '@/components/ui/Pagination';
import { CreateUserModal } from '@/components/users/CreateUserModal';
import type { User } from '@/types';

const PER_PAGE = 20;

const ADHESION_PILL: Record<string, 'vert' | 'rouge' | 'or'> = {
  A_JOUR: 'vert', NON_A_JOUR: 'rouge', EN_ATTENTE: 'or',
};
const ADHESION_LABEL: Record<string, string> = {
  A_JOUR: 'À jour', NON_A_JOUR: 'Non à jour', EN_ATTENTE: 'En attente',
};
const STATUT_PILL: Record<string, 'vert' | 'rouge' | 'or' | 'gris'> = {
  ACTIF: 'vert', SUSPENDU: 'rouge', EN_ATTENTE_ACTIVATION: 'or', INACTIF: 'rouge', ARCHIVE: 'gris',
};
const STATUT_LABEL: Record<string, string> = {
  ACTIF: 'Actif', SUSPENDU: 'Suspendu', EN_ATTENTE_ACTIVATION: 'En attente', INACTIF: 'Inactif', ARCHIVE: 'Archivé',
};

// Couleur de gradient par index pour les avatars
const GRAD = [
  'from-[#F58A4B] via-[#E55A35] to-[#7A2820]',
  'from-[#6A1B9A] to-[#4a1370]',
  'from-[#2E7D32] to-[#1a5021]',
  'from-[#1F1B2E] to-[#3a1d4d]',
];

type SentinelleTab = 'guides' | 'gardiens';

export default function GuideMembresPage() {
  const { user: actor } = useAuthStore();
  const isSentinelle = actor?.role === 'SENTINELLE';
  const isGuide      = actor?.role === 'GUIDE';

  // Guide : ses gardiens / Sentinelle : ses guides
  const [membres, setMembres]           = useState<User[]>([]);
  // Sentinelle uniquement : tous les gardiens du district
  const [gardiens, setGardiens]         = useState<User[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [createOpen, setCreateOpen]     = useState(false);
  const [sentTab, setSentTab]           = useState<SentinelleTab>('guides');
  // Sentinelle : guide sélectionné pour voir ses gardiens
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      if (isSentinelle) {
        const params: Record<string, string> = { role: 'GUIDE' };
        if (actor?.district?.id) params.districtId = actor.district.id;
        const [guidesRes, gardiensRes] = await Promise.all([
          usersApi.list(params),
          usersApi.list({ role: 'GARDIEN', ...(actor?.district?.id ? { districtId: actor.district.id } : {}) }),
        ]);
        setMembres(guidesRes.data);
        setGardiens(gardiensRes.data);
      } else {
        const params: Record<string, string> = { role: 'GARDIEN' };
        if (actor?.parish?.id) params.parishId = actor.parish.id;
        const res = await usersApi.list(params);
        setMembres(res.data);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [actor, isSentinelle]);

  useEffect(() => deferEffect(reload), [reload]);

  const handleCreated = (u: User) => setMembres(prev => [u, ...prev]);

  // --- Source active selon l'onglet Sentinelle ---
  const activeList = isSentinelle
    ? (sentTab === 'guides' ? membres : gardiens)
    : membres;

  const filtered = activeList.filter(m => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      m.nom.toLowerCase().includes(q) ||
      m.prenoms.toLowerCase().includes(q) ||
      (m.matricule ?? '').toLowerCase().includes(q) ||
      (m.email ?? '').toLowerCase().includes(q) ||
      (m.parish?.nom ?? '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Stats
  const nbAJour   = activeList.filter(m => m.adhesions?.[0]?.statut === 'A_JOUR').length;
  const nbNonAJour = activeList.filter(m => m.adhesions?.[0]?.statut !== 'A_JOUR').length;

  const changeTab = (t: SentinelleTab) => {
    setSentTab(t);
    setPage(1);
    setSearch('');
    setExpandedGuide(null);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Header avec onglets (Sentinelle) ── */}
      {isSentinelle ? (
        <div className="bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] flex-shrink-0">
          <div className="px-4 pt-3 pb-0">
            <h1 className="text-[18px] font-black text-white tracking-tight">Membres</h1>
            <p className="text-[11px] text-white/50 mt-0.5 pb-2">
              {actor?.district?.nom ?? 'Mon district'} · {membres.length} guide{membres.length > 1 ? 's' : ''}, {gardiens.length} gardien{gardiens.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex border-t border-white/10">
            {([
              { key: 'guides',   label: 'Guides',   count: membres.length },
              { key: 'gardiens', label: 'Gardiens', count: gardiens.length },
            ] as { key: SentinelleTab; label: string; count: number }[]).map(t => (
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
            <p className="text-[11px] opacity-75 mt-0.5">{actor?.parish?.nom ?? 'Ma paroisse'}</p>
          </div>
          <button onClick={() => setCreateOpen(true)}
            className="bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-white/30 transition">
            + Ajouter
          </button>
        </div>
      )}

      {/* ── Contenu ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">

        {/* Barre recherche + stats */}
        <div className="px-4 pt-3 pb-0">
          {/* Stats rapides */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-[#f7f7fa] rounded-xl p-2.5 text-center border border-[#ececf0]">
              <div className="text-lg font-black text-[#1F1B2E]">{activeList.length}</div>
              <div className="text-[9px] text-[#6b6b78] uppercase tracking-wide">Total</div>
            </div>
            <div className="bg-[#e8f5e9] rounded-xl p-2.5 text-center border border-[#a5d6a7]">
              <div className="text-lg font-black text-[#2E7D32]">{nbAJour}</div>
              <div className="text-[9px] text-[#2E7D32] uppercase tracking-wide">À jour</div>
            </div>
            <div className="bg-[#fff8f3] rounded-xl p-2.5 text-center border border-[#ef9a9a]">
              <div className="text-lg font-black text-[#E55A35]">{nbNonAJour}</div>
              <div className="text-[9px] text-[#E55A35] uppercase tracking-wide">Non à jour</div>
            </div>
          </div>

          {/* Recherche */}
          <div className="flex items-center bg-[#F0F2F5] rounded-full px-3.5 py-2 gap-2 mb-3">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#9b9ba8]"
              placeholder={`Rechercher${isSentinelle && sentTab === 'gardiens' ? ' par nom, matricule, paroisse…' : ' par nom ou matricule…'}`} />
            {search && <button onClick={() => { setSearch(''); setPage(1); }} className="text-[#9b9ba8]">✕</button>}
          </div>

          {isSentinelle && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-[#9b9ba8]">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
              <button onClick={() => setCreateOpen(true)}
                className="text-[11px] font-bold text-[#6A1B9A] bg-[#f0e8ff] px-3 py-1 rounded-full">
                + Ajouter {sentTab === 'guides' ? 'un guide' : 'un gardien'}
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-[#9b9ba8] text-sm animate-pulse">
            <div className="text-3xl">👥</div>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="text-4xl mb-3">{isSentinelle ? '🛡️' : '🤝'}</div>
            <p className="text-[15px] font-bold text-[#1F1B2E]">Aucun résultat</p>
            <p className="text-sm text-[#9b9ba8] mt-1">{search ? `Aucun membre ne correspond à « ${search} »` : 'Aucun membre enregistré'}</p>
          </div>
        )}

        {/* ── Liste ── */}
        {!loading && paginated.length > 0 && (
          <>
            {/* Sentinelle tab Guides : avec indicateur expandable */}
            {isSentinelle && sentTab === 'guides' ? (
              <div className="divide-y divide-[#f5f5f7]">
                {paginated.map(guide => {
                  const adh = guide.adhesions?.[0];
                  const guideGardiensCount = gardiens.filter(
                    g => g.parish?.id === guide.parish?.id
                  ).length;
                  const isExpanded = expandedGuide === guide.id;
                  const guideGardiensLocal = isExpanded
                    ? gardiens.filter(g => g.parish?.id === guide.parish?.id)
                    : [];

                  return (
                    <div key={guide.id}>
                      <button onClick={() => setExpandedGuide(isExpanded ? null : guide.id)}
                        className="flex items-center w-full px-4 py-3.5 hover:bg-[#F5F5F5] transition-colors text-left">
                        <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#3d1163] flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden relative">
                          {guide.avatarUrl
                            ? <Image src={guide.avatarUrl} fill className="object-cover" alt="" sizes="50px" />
                            : `${guide.nom?.[0] ?? ''}${guide.prenoms?.[0] ?? ''}`}
                        </div>
                        <div className="flex-1 min-w-0 ml-3 py-1 border-b border-[#F2F2F2]">
                          <div className="flex justify-between items-baseline gap-2">
                            <span className="font-semibold text-[15px] text-[#1F1B2E] truncate">{guide.prenoms} {guide.nom}</span>
                            <span className="text-[12px] text-[#9b9ba8] flex-shrink-0">{guide.matricule ?? '—'}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[12px] text-[#9b9ba8] truncate">⛪ {guide.parish?.nom ?? '—'}</span>
                            <span className="text-[11px] text-[#6b6b78] ml-auto flex-shrink-0">
                              🤝 {guideGardiensCount} gardien{guideGardiensCount > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Pill variant={STATUT_PILL[guide.statutProfil] ?? 'gris'}>
                              {STATUT_LABEL[guide.statutProfil] ?? guide.statutProfil}
                            </Pill>
                            {adh ? (
                              <Pill variant={ADHESION_PILL[adh.statut] ?? 'gris'}>
                                {ADHESION_LABEL[adh.statut] ?? adh.statut}
                              </Pill>
                            ) : <span className="text-[10px] text-[#b0b0bc]">Adhés. —</span>}
                          </div>
                        </div>
                        <svg className={`w-4 h-4 text-[#c0c0cc] ml-2 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Sous-liste des gardiens */}
                      {isExpanded && (
                        <div className="bg-[#f7f7fa] border-t border-b border-[#ececf0]">
                          {guideGardiensLocal.length === 0 ? (
                            <p className="text-xs text-[#9b9ba8] text-center py-4">Aucun gardien dans cette paroisse.</p>
                          ) : (
                            guideGardiensLocal.map((g, idx) => {
                              const gAdh = g.adhesions?.[0];
                              const color = GRAD[idx % GRAD.length];
                              return (
                                <div key={g.id} className="flex items-center px-6 py-2.5 border-b border-[#ececf0] last:border-0">
                                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 overflow-hidden relative`}>
                                    {g.avatarUrl
                                      ? <Image src={g.avatarUrl} fill className="object-cover" alt="" sizes="32px" />
                                      : `${g.nom?.[0] ?? ''}${g.prenoms?.[0] ?? ''}`}
                                  </div>
                                  <div className="flex-1 min-w-0 ml-2.5">
                                    <p className="text-sm font-medium text-[#1F1B2E] truncate">{g.prenoms} {g.nom}</p>
                                    <p className="text-[10px] text-[#9b9ba8] font-mono">{g.matricule ?? '—'}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0 ml-2">
                                    <Pill variant={STATUT_PILL[g.statutProfil] ?? 'gris'}>
                                      {STATUT_LABEL[g.statutProfil] ?? g.statutProfil}
                                    </Pill>
                                    {gAdh ? (
                                      <Pill variant={ADHESION_PILL[gAdh.statut] ?? 'gris'}>
                                        {ADHESION_LABEL[gAdh.statut]}
                                      </Pill>
                                    ) : <span className="text-[10px] text-[#b0b0bc]">—</span>}
                                  </div>
                                </div>
                              );
                            })
                          )}
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
                  const adh   = m.adhesions?.[0];
                  const color = GRAD[idx % GRAD.length];
                  return (
                    <div key={m.id} className="flex items-center px-4 py-3.5 hover:bg-[#F5F5F5] transition-colors">
                      <div className={`w-[50px] h-[50px] rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden relative`}>
                        {m.avatarUrl
                          ? <Image src={m.avatarUrl} fill className="object-cover" alt="" sizes="50px" />
                          : `${m.nom?.[0] ?? ''}${m.prenoms?.[0] ?? ''}`}
                      </div>
                      <div className="flex-1 min-w-0 ml-3 py-1 border-b border-[#F2F2F2]">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="font-semibold text-[15px] text-[#1F1B2E] truncate">{m.prenoms} {m.nom}</span>
                          <span className="text-[12px] text-[#9b9ba8] flex-shrink-0 font-mono">{m.matricule ?? '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {isSentinelle && m.parish && (
                            <span className="text-[12px] text-[#9b9ba8] truncate">⛪ {m.parish.nom}</span>
                          )}
                          <Pill variant={STATUT_PILL[m.statutProfil] ?? 'gris'}>
                            {STATUT_LABEL[m.statutProfil] ?? m.statutProfil}
                          </Pill>
                          {adh ? (
                            <Pill variant={ADHESION_PILL[adh.statut] ?? 'gris'}>
                              {ADHESION_LABEL[adh.statut] ?? adh.statut}
                            </Pill>
                          ) : <span className="text-[10px] text-[#b0b0bc]">Adhés. —</span>}
                          {m.telephone && (
                            <span className="text-[11px] text-[#9b9ba8] ml-auto truncate hidden sm:block">{m.telephone}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-4 border-t border-[#f0f0f0]">
                <Pagination page={page} totalItems={filtered.length} perPage={PER_PAGE} onChange={p => { setPage(p); }} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Guide : crée uniquement des Gardiens (rôle verrouillé)
          Sentinelle : choisit entre Guide et Gardien (modal avec sélecteur)
          Admin/Région : tous les rôles (géré par la matrice du modal) */}
      <CreateUserModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        defaultRole={isGuide ? 'GARDIEN' : undefined}
      />
    </div>
  );
}
