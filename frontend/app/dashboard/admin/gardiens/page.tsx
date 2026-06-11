'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { territoriesApi, usersApi } from '@/lib/api';
import { Pill } from '@/components/ui';
import { Pagination } from '@/components/ui/Pagination';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { CreateUserModal } from '@/components/users/CreateUserModal';
import { usePaginationUrl } from '@/hooks/usePaginationUrl';
import {
  DataTable,
  DataTableExportButtons,
  DataTableFilters,
  DataTableToolbar,
  useDataTable,
  useTableExport,
  useTableFilters,
  type TableFilterConfig,
} from '@/components/data-table';
import {
  ADHESION_LABEL,
  ADHESION_PILL,
  createGardienColumns,
  STATUT_LABEL,
} from '@/components/data-table/columns/user-columns';
import { filterUsers } from '@/components/data-table/utils/filter-users';
import type { District, Parish, User } from '@/types';

const PER_PAGE = 10;

const STATUT_OPTIONS = Object.entries(STATUT_LABEL).map(([value, label]) => ({ value, label }));
const ADHESION_OPTIONS = Object.entries(ADHESION_LABEL).map(([value, label]) => ({ value, label }));

function GardiensContent() {
  const [gardiens, setGardiens] = useState<User[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [parishes, setParishes] = useState<Parish[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingSuspend, setPendingSuspend] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [page, setPage] = usePaginationUrl();

  const parishDistrictMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of parishes) map.set(p.id, p.district.id);
    return map;
  }, [parishes]);

  const { values, setFilter, resetFilters, hasActiveFilters } = useTableFilters(
    [
      { id: 'search', type: 'search', placeholder: 'Nom, matricule, paroisse…' },
      { id: 'districtId', type: 'select', placeholder: 'Tous les districts', options: [], resetOnChange: ['parishId'] },
      { id: 'parishId', type: 'select', placeholder: 'Toutes paroisses', options: [] },
      { id: 'statut', type: 'select', placeholder: 'Tous les statuts', options: STATUT_OPTIONS },
      { id: 'adhesion', type: 'select', placeholder: 'Toutes adhésions', options: ADHESION_OPTIONS },
    ],
    () => setPage(1),
  );

  const visibleParishes = useMemo(
    () => (values.districtId ? parishes.filter(p => p.district.id === values.districtId) : parishes),
    [parishes, values.districtId],
  );

  const dynamicFilterConfigs = useMemo<TableFilterConfig[]>(() => [
    { id: 'search', type: 'search', placeholder: 'Nom, matricule, paroisse…' },
    {
      id: 'districtId',
      type: 'select',
      placeholder: 'Tous les districts',
      options: districts.map(d => ({ value: d.id, label: d.nom })),
      resetOnChange: ['parishId'],
    },
    {
      id: 'parishId',
      type: 'select',
      placeholder: 'Toutes paroisses',
      options: visibleParishes.map(p => ({ value: p.id, label: p.nom })),
      disabled: visibleParishes.length === 0,
    },
    { id: 'statut', type: 'select', placeholder: 'Tous les statuts', options: STATUT_OPTIONS },
    { id: 'adhesion', type: 'select', placeholder: 'Toutes adhésions', options: ADHESION_OPTIONS },
  ], [districts, visibleParishes]);

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

  const filtered = useMemo(
    () => filterUsers(gardiens, values, { parishDistrictMap }),
    [gardiens, values, parishDistrictMap],
  );

  const handleStatut = async (user: User, newStatut: 'SUSPENDU' | 'ACTIF') => {
    setActionLoading(user.id);
    setPendingSuspend(null);
    try {
      const { data } = await usersApi.updateStatut(user.id, newStatut);
      setGardiens(prev => prev.map(u => u.id === user.id ? { ...u, statutProfil: data.statutProfil } : u));
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const columns = useMemo(
    () => createGardienColumns({
      onEdit: setEditUser,
      onSuspend: u => handleStatut(u, 'SUSPENDU'),
      onReactivate: u => handleStatut(u, 'ACTIF'),
      pendingSuspend,
      setPendingSuspend,
      actionLoading,
    }),
    [actionLoading, pendingSuspend],
  );

  const { table } = useDataTable({
    data: filtered,
    columns,
    pageSize: PER_PAGE,
    page,
    onPageChange: setPage,
  });

  const { exportExcel, exportPdf, exportCsv, disabled: exportDisabled } = useTableExport({
    data: filtered,
    columns,
    options: { filename: 'gardiens', title: 'Liste des gardiens' },
  });

  const paginatedRows = table.getRowModel().rows;

  const nbActifs = gardiens.filter(u => u.statutProfil === 'ACTIF').length;
  const nbAJour = gardiens.filter(u => u.adhesions?.[0]?.statut === 'A_JOUR').length;
  const nbNonAJour = gardiens.filter(u => u.adhesions?.[0]?.statut === 'NON_A_JOUR').length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-[#ececf0] px-4 pt-3.5 pb-3 shrink-0">
        <DataTableToolbar
          title="🤝 Gardiens"
          count={gardiens.length}
          exports={
            <DataTableExportButtons
              compact
              onExportExcel={exportExcel}
              onExportPdf={exportPdf}
              onExportCsv={exportCsv}
              disabled={exportDisabled}
            />
          }
          actions={
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1 bg-[#1F1B2E] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#2d2640] transition-colors shrink-0"
            >
              + Ajouter
            </button>
          }
          filters={
            <DataTableFilters
              configs={dynamicFilterConfigs}
              values={values}
              onChange={setFilter}
              onReset={resetFilters}
              hasActiveFilters={hasActiveFilters}
            />
          }
        />

        <div className="grid grid-cols-4 gap-1.5 mt-2.5">
          {[
            { label: 'Total', value: gardiens.length, color: 'text-[#1F1B2E]' },
            { label: 'Actifs', value: nbActifs, color: 'text-[#2E7D32]' },
            { label: 'À jour', value: nbAJour, color: 'text-[#2E7D32]' },
            { label: 'Non à j.', value: nbNonAJour, color: 'text-[#E55A35]' },
          ].map(k => (
            <div key={k.label} className="bg-[#f9f9fc] rounded-xl p-2 text-center">
              <div className={`text-base font-black leading-none ${k.color}`}>{k.value}</div>
              <div className="text-[9px] text-[#9b9ba8] uppercase tracking-wide mt-0.5 leading-tight">{k.label}</div>
            </div>
          ))}
        </div>
      </div>

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
            <div className="lg:hidden flex flex-col gap-2">
              {paginatedRows.map(({ original: u }) => {
                const isLoading = actionLoading === u.id;
                const isPending = pendingSuspend === u.id;
                const canSuspend = u.statutProfil === 'ACTIF';
                const canReact = u.statutProfil === 'SUSPENDU';
                const adhesion = u.adhesions?.[0];
                const adhStatut = adhesion?.statut;

                return (
                  <div key={u.id} className="bg-white border border-[#ececf0] rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex items-center gap-3 px-3.5 py-3">
                      <UserAvatar
                        avatarUrl={u.avatarUrl}
                        initials={`${u.nom[0]}${u.prenoms[0]}`}
                        sizeClass="w-10 h-10 shrink-0"
                        bgClass="bg-[#E55A35]"
                        textClass="text-xs font-bold text-white"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[13px] text-[#1F1B2E] truncate">{u.prenoms} {u.nom}</div>
                        <div className="text-[11px] text-[#9b9ba8] truncate mt-0.5">
                          {u.matricule ?? '—'} · {u.parish?.nom ?? '—'}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Pill variant={u.statutProfil === 'ACTIF' ? 'vert' : u.statutProfil === 'SUSPENDU' ? 'rouge' : 'gris'} className="text-[10px]">
                          {STATUT_LABEL[u.statutProfil] ?? u.statutProfil}
                        </Pill>
                        {adhStatut && (
                          <Pill variant={ADHESION_PILL[adhStatut] ?? 'gris'} className="text-[10px]">
                            {ADHESION_LABEL[adhStatut]}
                          </Pill>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 px-3.5 pb-3">
                      <button type="button" onClick={() => setEditUser(u)}
                        className="flex-1 py-1.5 rounded-xl text-[11px] font-semibold bg-[#f0e8ff] text-[#6A1B9A] hover:bg-[#6A1B9A] hover:text-white transition-colors">
                        ✎ Modifier
                      </button>
                      {canReact && (
                        <button type="button" onClick={() => handleStatut(u, 'ACTIF')} disabled={isLoading}
                          className="flex-1 py-1.5 rounded-xl text-[11px] font-semibold bg-[#e8f5e9] text-[#2E7D32] hover:bg-[#2E7D32] hover:text-white transition-colors disabled:opacity-40">
                          {isLoading ? '…' : '✓ Réactiver'}
                        </button>
                      )}
                      {canSuspend && !isPending && (
                        <button type="button" onClick={() => setPendingSuspend(u.id)} disabled={isLoading}
                          className="py-1.5 px-3 rounded-xl text-[11px] font-semibold bg-[#f5f5f5] text-[#9b9ba8] hover:bg-[#ffebee] hover:text-[#E55A35] transition-colors disabled:opacity-40">
                          Suspendre
                        </button>
                      )}
                      {canSuspend && isPending && (
                        <>
                          <button type="button" onClick={() => setPendingSuspend(null)}
                            className="flex-1 py-1.5 rounded-xl text-[11px] font-semibold bg-[#f5f5f5] text-[#6b6b78]">
                            Annuler
                          </button>
                          <button type="button" onClick={() => handleStatut(u, 'SUSPENDU')} disabled={isLoading}
                            className="flex-1 py-1.5 rounded-xl text-[11px] font-bold bg-[#E55A35] text-white hover:bg-[#a82020] disabled:opacity-40">
                            {isLoading ? '…' : 'Confirmer'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <DataTable
              table={table}
              page={page}
              perPage={PER_PAGE}
              onPageChange={setPage}
              totalItems={filtered.length}
              hidePagination
            />
            <Pagination
              page={page}
              totalItems={filtered.length}
              perPage={PER_PAGE}
              onChange={setPage}
            />
          </>
        )}
        <div className="h-4" />
      </div>

      <CreateUserModal isOpen={createOpen} onClose={() => setCreateOpen(false)}
        onCreated={u => { if (u.role === 'GARDIEN') setGardiens(prev => [u, ...prev]); }}
        defaultRole="GARDIEN" />
      <CreateUserModal isOpen={!!editUser} onClose={() => setEditUser(null)}
        onCreated={u => { if (u.role === 'GARDIEN') setGardiens(prev => [u, ...prev]); }}
        onUpdated={u => setGardiens(prev => prev.map(x => x.id === u.id ? { ...x, ...u } : x))}
        editUser={editUser ?? undefined} />
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
