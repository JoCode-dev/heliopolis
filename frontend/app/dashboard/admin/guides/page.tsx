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
  useDataTable,
  useTableExport,
  useTableFilters,
  type TableFilterConfig,
} from '@/components/data-table';
import {
  ADHESION_LABEL,
  ADHESION_PILL,
  createGuideColumns,
  ROLE_LABEL,
  ROLE_PILL,
  STATUT_LABEL,
  STATUT_PILL,
} from '@/components/data-table/columns/user-columns';
import { filterUsers } from '@/components/data-table/utils/filter-users';
import type { District, Parish, User } from '@/types';

const PER_PAGE = 10;
const ROLE_ALL = 'TOUS';

const STATUT_OPTIONS = Object.entries(STATUT_LABEL).map(([value, label]) => ({ value, label }));
const ADHESION_OPTIONS = Object.entries(ADHESION_LABEL).map(([value, label]) => ({ value, label }));

function GuidesContent() {
  const [guides, setGuides] = useState<User[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [parishes, setParishes] = useState<Parish[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingSuspend, setPendingSuspend] = useState<string | null>(null);
  const [page, setPage] = usePaginationUrl();

  const { values, setFilter, resetFilters, hasActiveFilters } = useTableFilters(
    [
      { id: 'search', type: 'search', placeholder: 'Rechercher par nom, matricule, paroisse…' },
      { id: 'role', type: 'toggle', options: [
        { value: ROLE_ALL, label: 'Tous' },
        { value: 'GUIDE', label: 'Guide' },
        { value: 'SENTINELLE', label: 'Sentinelle' },
      ]},
      { id: 'districtId', type: 'select', placeholder: 'Tous les districts', options: [], resetOnChange: ['parishId'] },
      { id: 'parishId', type: 'select', placeholder: 'Toutes les paroisses', options: [] },
      { id: 'statut', type: 'select', placeholder: 'Tous les statuts', options: STATUT_OPTIONS },
      { id: 'adhesion', type: 'select', placeholder: 'Toutes adhésions', options: ADHESION_OPTIONS },
    ],
    () => setPage(1),
  );

  const parishDistrictMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of parishes) map.set(p.id, p.district.id);
    return map;
  }, [parishes]);

  const visibleParishes = useMemo(
    () => (values.districtId ? parishes.filter(p => p.district.id === values.districtId) : parishes),
    [parishes, values.districtId],
  );

  const filterConfigs = useMemo<TableFilterConfig[]>(() => [
    { id: 'search', type: 'search', placeholder: 'Rechercher par nom, matricule, paroisse…' },
    { id: 'role', type: 'toggle', options: [
      { value: ROLE_ALL, label: 'Tous' },
      { value: 'GUIDE', label: 'Guide' },
      { value: 'SENTINELLE', label: 'Sentinelle' },
    ]},
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
      placeholder: 'Toutes les paroisses',
      options: visibleParishes.map(p => ({ value: p.id, label: p.nom })),
      disabled: visibleParishes.length === 0,
    },
    { id: 'statut', type: 'select', placeholder: 'Tous les statuts', options: STATUT_OPTIONS },
    { id: 'adhesion', type: 'select', placeholder: 'Toutes adhésions', options: ADHESION_OPTIONS },
  ], [districts, visibleParishes]);

  useEffect(() => {
    (async () => {
      try {
        const [g, s, d, p] = await Promise.all([
          usersApi.list({ role: 'GUIDE' }),
          usersApi.list({ role: 'SENTINELLE' }),
          territoriesApi.districts(),
          territoriesApi.parishes(),
        ]);
        setGuides([...g.data, ...s.data]);
        setDistricts(d.data);
        setParishes(p.data);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(
    () => filterUsers(guides, values, { parishDistrictMap, roleAllValue: ROLE_ALL }),
    [guides, values, parishDistrictMap],
  );

  const handleStatut = async (user: User, newStatut: 'SUSPENDU' | 'ACTIF') => {
    setActionLoading(user.id);
    setPendingSuspend(null);
    try {
      const { data } = await usersApi.updateStatut(user.id, newStatut);
      setGuides(prev => prev.map(u => u.id === user.id ? { ...u, statutProfil: data.statutProfil } : u));
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const columns = useMemo(
    () => createGuideColumns({
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
    options: { filename: 'encadrants', title: 'Liste des encadrants' },
  });

  const paginatedRows = table.getRowModel().rows;

  const nbGuides = guides.filter(u => u.role === 'GUIDE').length;
  const nbSentinelles = guides.filter(u => u.role === 'SENTINELLE').length;
  const nbActifs = guides.filter(u => u.statutProfil === 'ACTIF').length;
  const nbSuspendus = guides.filter(u => u.statutProfil === 'SUSPENDU').length;
  const nbAdhAJour = guides.filter(u => u.adhesions?.[0]?.statut === 'A_JOUR').length;
  const nbAdhNonAJour = guides.filter(u => u.adhesions?.[0]?.statut === 'NON_A_JOUR').length;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6">
      <div className="flex justify-between items-center mb-5 border-b border-[#ececf0] pb-4">
        <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E]">📖 Encadrants</h1>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-[#6b6b78]">{guides.length} encadrant{guides.length > 1 ? 's' : ''}</span>
          <DataTableExportButtons
            onExportExcel={exportExcel}
            onExportPdf={exportPdf}
            onExportCsv={exportCsv}
            disabled={exportDisabled}
          />
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="bg-[#1F1B2E] text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#2d2640] transition-colors"
          >
            + Ajouter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-5">
        {[
          { label: 'Guides', value: nbGuides, color: '#6A1B9A' },
          { label: 'Sentinelles', value: nbSentinelles, color: '#D9A441' },
          { label: 'Actifs', value: nbActifs, color: '#2E7D32' },
          { label: 'Suspendus', value: nbSuspendus, color: '#E55A35' },
          { label: 'Adhés. à jour', value: nbAdhAJour, color: '#2E7D32' },
          { label: 'Non à jour', value: nbAdhNonAJour, color: '#E55A35' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-[#ececf0] rounded-xl p-3">
            <div className="text-xl font-black" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-[10px] text-[#6b6b78] uppercase tracking-wide mt-0.5 leading-tight">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-5">
        <DataTableFilters
          configs={filterConfigs}
          values={values}
          onChange={setFilter}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-[#6b6b78] text-sm">Chargement…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-[#6b6b78]">
          <div className="text-5xl mb-3">📖</div>
          <p className="font-semibold">Aucun encadrant trouvé</p>
          <p className="text-sm mt-1">Modifiez les filtres ou la recherche</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <div className="lg:hidden flex flex-col gap-2">
            {paginatedRows.map(({ original: u }) => {
              const isLoading = actionLoading === u.id;
              const isPending = pendingSuspend === u.id;
              const canSuspend = u.statutProfil === 'ACTIF';
              const canReactivate = u.statutProfil === 'SUSPENDU';

              return (
                <div key={u.id} className="bg-white border border-[#ececf0] rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      avatarUrl={u.avatarUrl}
                      initials={`${u.nom[0]}${u.prenoms[0]}`}
                      sizeClass="w-10 h-10"
                      bgClass={u.role === 'GUIDE' ? 'bg-[#6A1B9A]' : 'bg-[#D9A441]'}
                      textClass="text-xs font-bold text-white"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-[#1F1B2E] truncate">{u.prenoms} {u.nom}</div>
                      <div className="text-[11px] text-[#6b6b78] truncate">
                        {u.matricule ?? '—'} · {u.parish?.nom ?? u.district?.nom ?? '—'}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Pill variant={ROLE_PILL[u.role as 'GUIDE' | 'SENTINELLE']} className="text-[10px]">
                        {ROLE_LABEL[u.role as 'GUIDE' | 'SENTINELLE']}
                      </Pill>
                      <Pill variant={STATUT_PILL[u.statutProfil] ?? 'gris'} className="text-[10px]">
                        {STATUT_LABEL[u.statutProfil] ?? u.statutProfil}
                      </Pill>
                      {u.adhesions?.[0] && (
                        <Pill variant={ADHESION_PILL[u.adhesions[0].statut] ?? 'gris'} className="text-[10px]">
                          {ADHESION_LABEL[u.adhesions[0].statut] ?? '—'}
                        </Pill>
                      )}
                    </div>
                  </div>
                  {(canSuspend || canReactivate) && (
                    <div className="mt-2.5 pt-2.5 border-t border-[#f0f0f4]">
                      {canReactivate && (
                        <button type="button" onClick={() => handleStatut(u, 'ACTIF')} disabled={isLoading}
                          className="w-full text-xs font-semibold py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50">
                          {isLoading ? '…' : '✓ Réactiver le compte'}
                        </button>
                      )}
                      {canSuspend && !isPending && (
                        <button type="button" onClick={() => setPendingSuspend(u.id)} disabled={isLoading}
                          className="w-full text-xs font-semibold py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50">
                          Suspendre le compte
                        </button>
                      )}
                      {canSuspend && isPending && (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setPendingSuspend(null)}
                            className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-[#f6f6fa] text-[#6b6b78] hover:bg-[#ececf0] transition-colors">
                            Annuler
                          </button>
                          <button type="button" onClick={() => handleStatut(u, 'SUSPENDU')} disabled={isLoading}
                            className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-[#E55A35] text-white hover:bg-[#a82020] transition-colors disabled:opacity-50">
                            {isLoading ? '…' : 'Confirmer'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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

      <CreateUserModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={u => {
          if (u.role === 'GUIDE' || u.role === 'SENTINELLE') setGuides(prev => [u, ...prev]);
        }}
        defaultRole="GUIDE"
        allowedRoles={['GUIDE', 'SENTINELLE']}
      />
    </div>
  );
}

export default function AdminGuidesPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-[#6b6b78] text-sm">Chargement…</div>}>
      <GuidesContent />
    </Suspense>
  );
}
