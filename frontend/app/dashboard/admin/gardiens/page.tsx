'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { territoriesApi, usersApi } from '@/lib/api';
import { Pill } from '@/components/ui';
import { Pagination } from '@/components/ui/Pagination';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { CreateUserModal } from '@/components/users/CreateUserModal';
import { usePaginationUrl } from '@/hooks/usePaginationUrl';
import { downloadCsv } from '@/lib/csvExport';
import type { District, Parish, User } from '@/types';

const PER_PAGE = 10;

const ADHESION_PILL: Record<string, 'vert' | 'rouge' | 'or'> = {
  A_JOUR: 'vert', NON_A_JOUR: 'rouge', EN_ATTENTE: 'or',
};
const ADHESION_LABEL: Record<string, string> = {
  A_JOUR: 'À jour', NON_A_JOUR: 'Non à jour', EN_ATTENTE: 'En attente',
};
const STATUT_PILL: Record<string, 'vert' | 'rouge' | 'or' | 'gris'> = {
  ACTIF: 'vert', INACTIF: 'rouge', EN_ATTENTE_ACTIVATION: 'or',
  SUSPENDU: 'rouge', ARCHIVE: 'gris',
};
const STATUT_LABEL: Record<string, string> = {
  ACTIF: 'Actif', INACTIF: 'Inactif', EN_ATTENTE_ACTIVATION: 'En attente',
  SUSPENDU: 'Suspendu', ARCHIVE: 'Archivé',
};

function GardiensContent() {
  const [gardiens, setGardiens]   = useState<User[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [parishes, setParishes]   = useState<Parish[]>([]);
  const [loading, setLoading]     = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingSuspend, setPendingSuspend] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser]     = useState<User | null>(null);

  const [search, setSearch]         = useState('');
  const [districtId, setDistrictId] = useState('');
  const [parishId, setParishId]     = useState('');
  const [page, setPage]             = usePaginationUrl();

  useEffect(() => {
    (async () => {
      try {
        const [g, d, p] = await Promise.all([
          usersApi.list({ role: 'GARDIEN' }),
          territoriesApi.districts(),
          territoriesApi.parishes(),
        ]);
        setGardiens(g.data);
        setDistricts(d.data);
        setParishes(p.data);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const parishDistrictMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of parishes) map.set(p.id, p.district.id);
    return map;
  }, [parishes]);

  const visibleParishes = useMemo(
    () => districtId ? parishes.filter(p => p.district.id === districtId) : parishes,
    [parishes, districtId],
  );

  const filtered = useMemo(() => gardiens.filter(u => {
    if (districtId) {
      const userDistrict = u.district?.id ?? (u.parish?.id ? parishDistrictMap.get(u.parish.id) : undefined);
      if (userDistrict !== districtId) return false;
    }
    if (parishId && u.parish?.id !== parishId) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      `${u.prenoms ?? ''} ${u.nom ?? ''}`.toLowerCase().includes(q) ||
      (u.matricule ?? '').toLowerCase().includes(q) ||
      (u.parish?.nom ?? '').toLowerCase().includes(q)
    );
  }), [gardiens, districtId, parishId, search, parishDistrictMap]);

  const handleStatut = async (user: User, newStatut: 'SUSPENDU' | 'ACTIF') => {
    setActionLoading(user.id);
    setPendingSuspend(null);
    try {
      const { data } = await usersApi.updateStatut(user.id, newStatut);
      setGardiens(prev => prev.map(u => u.id === user.id ? { ...u, statutProfil: data.statutProfil } : u));
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const handleCreated = (newUser: User) => {
    if (newUser.role === 'GARDIEN') setGardiens(prev => [newUser, ...prev]);
  };
  const handleUpdated = (updated: User) => {
    setGardiens(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
  };
  const handleExport = () => {
    const headers = ['Prénoms', 'Nom', 'Matricule', 'Email', 'Téléphone', 'Paroisse', 'District', 'Région', 'Adhésion', 'Statut'];
    const rows = filtered.map(u => [
      u.prenoms, u.nom, u.matricule ?? '', u.email ?? '', u.telephone ?? '',
      u.parish?.nom ?? '', u.district?.nom ?? '', u.region?.nom ?? '',
      u.adhesions?.[0]?.statut ?? '', u.statutProfil,
    ]);
    downloadCsv(`gardiens-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const nbActifs   = gardiens.filter(u => u.statutProfil === 'ACTIF').length;
  const nbSusp     = gardiens.filter(u => u.statutProfil === 'SUSPENDU').length;
  const nbAJour    = gardiens.filter(u => u.adhesions?.[0]?.statut === 'A_JOUR').length;
  const nbNonAJour = gardiens.filter(u => u.adhesions?.[0]?.statut === 'NON_A_JOUR').length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Header compact ── */}
      <div className="bg-white border-b border-[#ececf0] px-4 pt-3.5 pb-3 flex-shrink-0">

        {/* Titre + actions */}
        <div className="flex items-center gap-2 mb-2.5">
          <h1 className="text-base font-black text-[#1F1B2E] flex-1">🤝 Gardiens</h1>
          <span className="text-[11px] text-[#9b9ba8] font-medium flex-shrink-0">{gardiens.length}</span>
          <button onClick={handleExport} disabled={filtered.length === 0}
            className="w-8 h-8 flex items-center justify-center bg-[#f3f3f5] rounded-lg text-sm hover:bg-[#ececf0] disabled:opacity-60 flex-shrink-0"
            title="Exporter CSV">
            📥
          </button>
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1 bg-[#1F1B2E] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#2d2640] transition-colors flex-shrink-0">
            + Ajouter
          </button>
        </div>

        {/* Stats inline */}
        <div className="grid grid-cols-4 gap-1.5 mb-2.5">
          {[
            { label: 'Total',    value: gardiens.length, color: 'text-[#1F1B2E]' },
            { label: 'Actifs',   value: nbActifs,        color: 'text-[#2E7D32]' },
            { label: 'À jour',   value: nbAJour,         color: 'text-[#2E7D32]' },
            { label: 'Non à j.', value: nbNonAJour,      color: 'text-[#C62828]' },
          ].map(k => (
            <div key={k.label} className="bg-[#f9f9fc] rounded-xl p-2 text-center">
              <div className={`text-base font-black leading-none ${k.color}`}>{k.value}</div>
              <div className="text-[9px] text-[#9b9ba8] uppercase tracking-wide mt-0.5 leading-tight">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Recherche */}
        <div className="flex items-center bg-[#f5f5fa] rounded-xl px-3 py-2 gap-2 mb-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#b0b0bc]"
            placeholder="Nom, matricule, paroisse…" />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }} className="text-[#b0b0bc] text-sm">✕</button>
          )}
        </div>

        {/* Filtres territoire */}
        <div className="flex gap-1.5">
          <select value={districtId} onChange={e => { setDistrictId(e.target.value); setParishId(''); setPage(1); }}
            className="flex-1 bg-[#f5f5fa] border-0 rounded-xl px-2.5 py-2 text-xs outline-none text-[#1F1B2E] min-w-0">
            <option value="">Tous les districts</option>
            {districts.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
          </select>
          <select value={parishId} onChange={e => { setParishId(e.target.value); setPage(1); }}
            disabled={visibleParishes.length === 0}
            className="flex-1 bg-[#f5f5fa] border-0 rounded-xl px-2.5 py-2 text-xs outline-none text-[#1F1B2E] min-w-0 disabled:opacity-60">
            <option value="">Toutes paroisses</option>
            {visibleParishes.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
          {(districtId || parishId || search) && (
            <button onClick={() => { setDistrictId(''); setParishId(''); setSearch(''); setPage(1); }}
              className="w-8 h-8 flex items-center justify-center bg-[#f5f5fa] rounded-xl text-[#9b9ba8] text-sm flex-shrink-0">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Zone scrollable ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f6f6fa] px-3 py-3 lg:px-6 lg:py-4">

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-[#9b9ba8]">
            <div className="text-4xl animate-pulse mb-3">🤝</div>
            <p className="text-sm">Chargement…</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[#9b9ba8]">
            <div className="text-4xl mb-3">🤝</div>
            <p className="font-semibold text-sm text-[#1F1B2E]">Aucun gardien trouvé</p>
            <p className="text-xs mt-1">Modifiez les filtres ou ajoutez un gardien.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            {/* Mobile : cartes compactes */}
            <div className="lg:hidden flex flex-col gap-2">
              {paginated.map(u => {
                const isLoading  = actionLoading === u.id;
                const isPending  = pendingSuspend === u.id;
                const canSuspend = u.statutProfil === 'ACTIF';
                const canReact   = u.statutProfil === 'SUSPENDU';
                const adhesion   = u.adhesions?.[0];
                const adhStatut  = adhesion?.statut;

                return (
                  <div key={u.id} className="bg-white border border-[#ececf0] rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex items-center gap-3 px-3.5 py-3">
                      <UserAvatar
                        avatarUrl={u.avatarUrl}
                        initials={`${u.nom[0]}${u.prenoms[0]}`}
                        sizeClass="w-10 h-10 flex-shrink-0"
                        bgClass="bg-[#C62828]"
                        textClass="text-xs font-bold text-white"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[13px] text-[#1F1B2E] truncate">{u.prenoms} {u.nom}</div>
                        <div className="text-[11px] text-[#9b9ba8] truncate mt-0.5">
                          {u.matricule ?? '—'} · {u.parish?.nom ?? '—'}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          u.statutProfil === 'ACTIF'    ? 'bg-[#e8f5e9] text-[#2E7D32]' :
                          u.statutProfil === 'SUSPENDU' ? 'bg-[#ffebee] text-[#C62828]' :
                          'bg-[#f5f5f5] text-[#9b9ba8]'
                        }`}>
                          {STATUT_LABEL[u.statutProfil] ?? u.statutProfil}
                        </span>
                        {adhStatut && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            adhStatut === 'A_JOUR'    ? 'bg-[#e8f5e9] text-[#2E7D32]' :
                            adhStatut === 'NON_A_JOUR'? 'bg-[#ffebee] text-[#C62828]' :
                            'bg-[#fff8e1] text-[#D9A441]'
                          }`}>
                            {ADHESION_LABEL[adhStatut]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 px-3.5 pb-3">
                      <button onClick={() => setEditUser(u)}
                        className="flex-1 py-1.5 rounded-xl text-[11px] font-semibold bg-[#f0e8ff] text-[#6A1B9A] hover:bg-[#6A1B9A] hover:text-white transition-colors">
                        ✎ Modifier
                      </button>
                      {canReact && (
                        <button onClick={() => handleStatut(u, 'ACTIF')} disabled={isLoading}
                          className="flex-1 py-1.5 rounded-xl text-[11px] font-semibold bg-[#e8f5e9] text-[#2E7D32] hover:bg-[#2E7D32] hover:text-white transition-colors disabled:opacity-60">
                          {isLoading ? '…' : '✓ Réactiver'}
                        </button>
                      )}
                      {canSuspend && !isPending && (
                        <button onClick={() => setPendingSuspend(u.id)} disabled={isLoading}
                          className="py-1.5 px-3 rounded-xl text-[11px] font-semibold bg-[#f5f5f5] text-[#9b9ba8] hover:bg-[#ffebee] hover:text-[#C62828] transition-colors disabled:opacity-60">
                          Suspendre
                        </button>
                      )}
                      {canSuspend && isPending && (
                        <>
                          <button onClick={() => setPendingSuspend(null)}
                            className="flex-1 py-1.5 rounded-xl text-[11px] font-semibold bg-[#f5f5f5] text-[#6b6b78]">
                            Annuler
                          </button>
                          <button onClick={() => handleStatut(u, 'SUSPENDU')} disabled={isLoading}
                            className="flex-1 py-1.5 rounded-xl text-[11px] font-bold bg-[#C62828] text-white hover:bg-[#a82020] disabled:opacity-60">
                            {isLoading ? '…' : 'Confirmer'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop : table */}
            <div className="hidden lg:block bg-white border border-[#ececf0] rounded-2xl overflow-hidden">
              <table className="w-full text-xs border-collapse table-fixed">
                <colgroup>
                  <col className="w-[24%]" /><col className="w-[12%]" /><col className="w-[20%]" />
                  <col className="w-[12%]" /><col className="w-[11%]" /><col className="w-[11%]" /><col className="w-[10%]" />
                </colgroup>
                <thead>
                  <tr className="bg-[#f9f9fc] text-[#6b6b78] uppercase tracking-wide">
                    {['Gardien', 'Matricule', 'Paroisse / District', 'Adhésion', 'Statut', 'Suspendus', 'Action', ''].map(h => (
                      <th key={h} className="text-left px-3 py-3 font-semibold border-b border-[#ececf0]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(u => {
                    const isLoading  = actionLoading === u.id;
                    const isPending  = pendingSuspend === u.id;
                    const canSuspend = u.statutProfil === 'ACTIF';
                    const canReact   = u.statutProfil === 'SUSPENDU';
                    const adhesion   = u.adhesions?.[0];
                    return (
                      <tr key={u.id} className="border-b border-[#f0f0f4] hover:bg-[#fafafc]">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <UserAvatar avatarUrl={u.avatarUrl} initials={`${u.nom[0]}${u.prenoms[0]}`}
                              sizeClass="w-7 h-7 flex-shrink-0" bgClass="bg-[#C62828]" textClass="text-[10px] font-bold text-white" />
                            <span className="font-semibold text-[#1F1B2E] truncate">{u.prenoms} {u.nom}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[#6b6b78] truncate">{u.matricule ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-[#1F1B2E] truncate">{u.parish?.nom ?? '—'}</div>
                          {u.district && <div className="text-[10px] text-[#6b6b78] truncate">{u.district.nom}</div>}
                        </td>
                        <td className="px-3 py-2.5">
                          {adhesion
                            ? <Pill variant={ADHESION_PILL[adhesion.statut] ?? 'gris'}>{ADHESION_LABEL[adhesion.statut] ?? adhesion.statut}</Pill>
                            : <span className="text-[10px] text-[#b0b0bc]">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <Pill variant={STATUT_PILL[u.statutProfil] ?? 'gris'}>{STATUT_LABEL[u.statutProfil] ?? u.statutProfil}</Pill>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] text-[#b0b0bc]">{nbSusp > 0 ? nbSusp : '—'}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          {canReact && (
                            <button onClick={() => handleStatut(u, 'ACTIF')} disabled={isLoading}
                              className="w-full text-[11px] font-semibold px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-60">
                              {isLoading ? '…' : '✓ Réactiver'}
                            </button>
                          )}
                          {canSuspend && !isPending && (
                            <button onClick={() => setPendingSuspend(u.id)} disabled={isLoading}
                              className="w-full text-[11px] font-semibold px-2 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60">
                              Suspendre
                            </button>
                          )}
                          {canSuspend && isPending && (
                            <div className="flex gap-1">
                              <button onClick={() => handleStatut(u, 'SUSPENDU')} disabled={isLoading}
                                className="flex-1 text-[11px] font-bold py-1 rounded-lg bg-[#C62828] text-white hover:bg-[#a82020] disabled:opacity-60">
                                {isLoading ? '…' : 'Oui'}
                              </button>
                              <button onClick={() => setPendingSuspend(null)}
                                className="flex-1 text-[11px] font-semibold py-1 rounded-lg bg-[#f0f0f4] text-[#6b6b78]">Non</button>
                            </div>
                          )}
                          {!canSuspend && !canReact && <span className="text-[10px] text-[#b0b0bc]">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <button onClick={() => setEditUser(u)}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#f0e8ff] text-[#6A1B9A] hover:bg-[#6A1B9A] hover:text-white transition-colors">
                            ✎ Modifier
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination page={page} totalItems={filtered.length} perPage={PER_PAGE} onChange={setPage} />
          </>
        )}

        <div className="h-4" />
      </div>

      <CreateUserModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        defaultRole="GARDIEN"
      />
      <CreateUserModal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        editUser={editUser ?? undefined}
      />
    </div>
  );
}

export default function AdminGardiensPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-[#6b6b78] text-sm">Chargement…</div>}>
      <GardiensContent />
    </Suspense>
  );
}
