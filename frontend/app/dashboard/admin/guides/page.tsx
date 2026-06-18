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
  const [promoting, setPromoting] = useState<User | null>(null);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [resetPwdTarget, setResetPwdTarget] = useState<User | null>(null);
  const [resetPwdValue, setResetPwdValue] = useState('');
  const [resetPwdShow, setResetPwdShow] = useState(false);
  const [resetPwdLoading, setResetPwdLoading] = useState(false);
  const [resetPwdError, setResetPwdError] = useState('');
  const [page, setPage] = usePaginationUrl();

  const { values, setFilter, resetFilters, hasActiveFilters } = useTableFilters(
    [
      { id: 'search', type: 'search', placeholder: 'Rechercher par nom, matricule, paroisse…' },
      { id: 'role', type: 'toggle', options: [
        { value: ROLE_ALL, label: 'Tous' },
        { value: 'GUIDE', label: 'Guide' },
        { value: 'SENTINELLE', label: 'Sentinelle' },
        { value: 'REGION', label: 'Région' },
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
      { value: 'REGION', label: 'Région' },
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
        const [g, s, r, d, p] = await Promise.all([
          usersApi.list({ role: 'GUIDE' }),
          usersApi.list({ role: 'SENTINELLE' }),
          usersApi.list({ role: 'REGION' }),
          territoriesApi.districts(),
          territoriesApi.parishes(),
        ]);
        setGuides([...g.data, ...s.data, ...r.data]);
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

  const handlePromouvoir = async (targetRole: 'GUIDE' | 'SENTINELLE' | 'REGION') => {
    if (!promoting) return;
    setPromoteLoading(true);
    try {
      const { data } = await usersApi.promouvoir(promoting.id, targetRole);
      setGuides(prev => prev.map(u => u.id === promoting.id ? { ...u, role: (data as User).role } : u));
      setPromoting(null);
    } catch { /* ignore */ }
    finally { setPromoteLoading(false); }
  };

  const handlePurger = async (user: User) => {
    setActionLoading(user.id);
    try {
      await usersApi.purger(user.id);
      setGuides(prev => prev.filter(u => u.id !== user.id));
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const openResetPwd = (user: User) => {
    setResetPwdTarget(user);
    setResetPwdValue('');
    setResetPwdShow(false);
    setResetPwdError('');
  };

  const handleResetPassword = async () => {
    if (!resetPwdTarget) return;
    if (resetPwdValue.length < 6) { setResetPwdError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    setResetPwdLoading(true);
    setResetPwdError('');
    try {
      const { data } = await usersApi.resetPassword(resetPwdTarget.id, resetPwdValue);
      setGuides(prev => prev.map(u => u.id === resetPwdTarget.id ? { ...u, statutProfil: (data as User).statutProfil } : u));
      setResetPwdTarget(null);
    } catch { setResetPwdError('Une erreur est survenue. Vérifiez le mot de passe et réessayez.'); }
    finally { setResetPwdLoading(false); }
  };

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
      onPromote: u => setPromoting(u),
      onResetPassword: u => openResetPwd(u),
      onPurger: handlePurger,
      pendingSuspend,
      setPendingSuspend,
      pendingDelete,
      setPendingDelete,
      actionLoading,
    }),
    [actionLoading, pendingSuspend, pendingDelete],
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
  const nbRegion = guides.filter(u => u.role === 'REGION').length;
  const nbActifs = guides.filter(u => u.statutProfil === 'ACTIF').length;
  const nbSuspendus = guides.filter(u => u.statutProfil === 'SUSPENDU').length;
  const nbAdhAJour = guides.filter(u => u.adhesions?.[0]?.statut === 'A_JOUR').length;
  const nbAdhNonAJour = guides.filter(u => u.adhesions?.[0]?.statut === 'NON_A_JOUR').length;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6">
      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-5 border-b border-[#ececf0] pb-4">
        <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E]">📖 Encadrants</h1>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-[#6b6b78] hidden sm:inline">{guides.length} encadrant{guides.length > 1 ? 's' : ''}</span>
          <div className="hidden lg:flex items-center gap-2">
            <DataTableExportButtons
              onExportExcel={exportExcel}
              onExportPdf={exportPdf}
              onExportCsv={exportCsv}
              disabled={exportDisabled}
            />
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="bg-[#1F1B2E] text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#2d2640] transition-colors"
          >
            + Ajouter
          </button>
        </div>
      </div>

      {/* ── KPIs : scroll horizontal sur mobile, grille sur desktop ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-7 lg:overflow-visible lg:pb-0">
        {[
          { label: 'Guides', value: nbGuides, color: '#6A1B9A' },
          { label: 'Sentinelles', value: nbSentinelles, color: '#D9A441' },
          { label: 'Région', value: nbRegion, color: '#1F1B2E' },
          { label: 'Actifs', value: nbActifs, color: '#2E7D32' },
          { label: 'Suspendus', value: nbSuspendus, color: '#E55A35' },
          { label: 'À jour', value: nbAdhAJour, color: '#2E7D32' },
          { label: 'Non à jour', value: nbAdhNonAJour, color: '#E55A35' },
        ].map(kpi => (
          <div key={kpi.label} className="flex-shrink-0 min-w-[76px] lg:min-w-0 bg-white border border-[#ececf0] rounded-xl p-3">
            <div className="text-xl font-black" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-[10px] text-[#6b6b78] uppercase tracking-wide mt-0.5 leading-tight">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filtres desktop ── */}
      <div className="hidden lg:block mb-5">
        <DataTableFilters
          configs={filterConfigs}
          values={values}
          onChange={setFilter}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {/* ── Filtres mobile : recherche + toggle + avancés repliables ── */}
      <div className="lg:hidden mb-5 flex flex-col gap-2">
        <input
          type="text"
          value={(values.search as string) ?? ''}
          onChange={e => setFilter('search', e.target.value)}
          placeholder="Rechercher par nom, matricule, paroisse…"
          className="w-full bg-white border border-[#e6e6ea] rounded-xl px-3.5 py-2.5 text-sm text-[#1F1B2E] placeholder:text-[#b0b0bc]"
        />
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {[
            { value: ROLE_ALL, label: 'Tous' },
            { value: 'GUIDE', label: 'Guide' },
            { value: 'SENTINELLE', label: 'Sentinelle' },
            { value: 'REGION', label: 'Région' },
          ].map(opt => (
            <button key={opt.value} type="button"
              onClick={() => setFilter('role', opt.value)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                ((values.role as string) ?? ROLE_ALL) === opt.value
                  ? 'bg-[#1F1B2E] text-white'
                  : 'bg-[#f0f0f4] text-[#6b6b78]'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setMobileFiltersOpen(v => !v)}
          className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
            hasActiveFilters ? 'border-[#1F1B2E]/30 bg-[#f0f0f4] text-[#1F1B2E]' : 'border-[#e6e6ea] bg-white text-[#6b6b78]'
          }`}>
          <span>Filtres avancés{hasActiveFilters ? ' ·' : ''}</span>
          <span className={`transition-transform duration-200 text-xs ${mobileFiltersOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {mobileFiltersOpen && (
          <div className="flex flex-col gap-2 pt-1">
            <select value={(values.districtId as string) ?? ''} onChange={e => setFilter('districtId', e.target.value)}
              className="w-full bg-white border border-[#e6e6ea] rounded-xl px-3.5 py-2.5 text-sm text-[#1F1B2E]">
              <option value="">Tous les districts</option>
              {districts.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
            </select>
            <select value={(values.parishId as string) ?? ''} onChange={e => setFilter('parishId', e.target.value)}
              disabled={visibleParishes.length === 0}
              className="w-full bg-white border border-[#e6e6ea] rounded-xl px-3.5 py-2.5 text-sm text-[#1F1B2E] disabled:opacity-40">
              <option value="">Toutes les paroisses</option>
              {visibleParishes.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
            <select value={(values.statut as string) ?? ''} onChange={e => setFilter('statut', e.target.value)}
              className="w-full bg-white border border-[#e6e6ea] rounded-xl px-3.5 py-2.5 text-sm text-[#1F1B2E]">
              <option value="">Tous les statuts</option>
              {STATUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={(values.adhesion as string) ?? ''} onChange={e => setFilter('adhesion', e.target.value)}
              className="w-full bg-white border border-[#e6e6ea] rounded-xl px-3.5 py-2.5 text-sm text-[#1F1B2E]">
              <option value="">Toutes adhésions</option>
              {ADHESION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {hasActiveFilters && (
              <button type="button" onClick={resetFilters}
                className="text-xs font-semibold text-[#E55A35] text-center py-1">
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}
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
              const isLoading  = actionLoading === u.id;
              const isPending  = pendingSuspend === u.id;
              const isPendDel  = pendingDelete === u.id;
              const canSuspend    = u.statutProfil === 'ACTIF';
              const canReactivate = u.statutProfil === 'SUSPENDU';
              const canActivate   = u.statutProfil === 'EN_ATTENTE_ACTIVATION';

              return (
                <div key={u.id} className="bg-white border border-[#ececf0] rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      avatarUrl={u.avatarUrl}
                      initials={`${u.nom?.[0] ?? ''}${u.prenoms?.[0] ?? ''}`}
                      sizeClass="w-10 h-10"
                      bgClass={u.role === 'GUIDE' ? 'bg-[#6A1B9A]' : u.role === 'REGION' ? 'bg-[#1F1B2E]' : 'bg-[#D9A441]'}
                      textClass="text-xs font-bold text-white"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-[#1F1B2E] truncate">{u.prenoms} {u.nom}</div>
                      <div className="text-[11px] text-[#6b6b78] truncate">
                        {u.matricule ?? '—'} · {u.parish?.nom ?? u.district?.nom ?? '—'}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Pill variant={ROLE_PILL[u.role as 'GUIDE' | 'SENTINELLE' | 'REGION']} className="text-[10px]">
                        {ROLE_LABEL[u.role as 'GUIDE' | 'SENTINELLE' | 'REGION']}
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
                  {((canSuspend || canReactivate || canActivate) || (u.role === 'GUIDE' || u.role === 'SENTINELLE' || u.role === 'REGION')) && (
                    <div className="mt-2.5 pt-2.5 border-t border-[#f0f0f4] flex flex-col gap-1.5">
                      {!isPending && (
                        <button type="button" onClick={() => setPromoting(u)} disabled={isLoading}
                          className="w-full text-xs font-semibold py-1.5 rounded-lg bg-[#e8f0fe] text-[#1a56db] hover:bg-[#d0e0fc] transition-colors disabled:opacity-50">
                          Changer le rôle
                        </button>
                      )}
                      {!isPending && (
                        <button type="button" onClick={() => openResetPwd(u)} disabled={isLoading}
                          className="w-full text-xs font-semibold py-1.5 rounded-lg bg-[#fff3e0] text-[#e65100] hover:bg-[#ffe0b2] transition-colors disabled:opacity-50">
                          🔑 Réinitialiser le mot de passe
                        </button>
                      )}
                      {canActivate && (
                        <button type="button" onClick={() => handleStatut(u, 'ACTIF')} disabled={isLoading}
                          className="w-full text-xs font-semibold py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50">
                          {isLoading ? '…' : '✓ Activer le compte'}
                        </button>
                      )}
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
                      {!isPendDel && !isPending && (
                        <button type="button" onClick={() => setPendingDelete(u.id)} disabled={isLoading}
                          className="w-full text-xs font-semibold py-1.5 rounded-lg bg-[#fff0f0] text-[#C62828] hover:bg-[#C62828] hover:text-white transition-colors disabled:opacity-50">
                          🗑 Supprimer définitivement
                        </button>
                      )}
                      {isPendDel && (
                        <div className="flex gap-2">
                          <span className="flex-1 text-[11px] text-[#C62828] font-semibold flex items-center">Supprimer ?</span>
                          <button type="button" onClick={() => setPendingDelete(null)}
                            className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-[#f6f6fa] text-[#6b6b78]">
                            Annuler
                          </button>
                          <button type="button" onClick={() => handlePurger(u)} disabled={isLoading}
                            className="py-1.5 px-3 rounded-lg text-xs font-bold bg-[#C62828] text-white hover:bg-[#a82020] disabled:opacity-50">
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
          if (u.role === 'GUIDE') setGuides(prev => [u, ...prev]);
        }}
        defaultRole="GUIDE"
        allowedRoles={['GUIDE']}
      />

      {/* ── Modal réinitialisation mot de passe ── */}
      {resetPwdTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-[60]" onClick={() => !resetPwdLoading && setResetPwdTarget(null)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg mx-auto shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 pt-4 pb-3 border-b border-[#f0f0f4]">
              <p className="text-[11px] text-[#9b9ba8] mb-0.5">{resetPwdTarget.prenoms} {resetPwdTarget.nom}</p>
              <p className="text-sm font-bold text-[#1F1B2E]">Réinitialiser le mot de passe</p>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div className="relative">
                <input
                  type={resetPwdShow ? 'text' : 'password'}
                  value={resetPwdValue}
                  onChange={e => { setResetPwdValue(e.target.value); setResetPwdError(''); }}
                  placeholder="Nouveau mot de passe (min. 6 caractères)"
                  className="w-full border border-[#e6e6ea] rounded-xl px-3.5 py-2.5 text-sm text-[#1F1B2E] pr-10 focus:outline-none focus:border-[#1F1B2E]"
                  disabled={resetPwdLoading}
                />
                <button type="button" onClick={() => setResetPwdShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9b9ba8] text-xs">
                  {resetPwdShow ? '🙈' : '👁'}
                </button>
              </div>
              {resetPwdError && <p className="text-xs text-red-600">{resetPwdError}</p>}
              <p className="text-[11px] text-[#9b9ba8]">
                Le compte sera automatiquement activé après la réinitialisation.
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setResetPwdTarget(null)} disabled={resetPwdLoading}
                  className="flex-1 py-2.5 rounded-xl border border-[#e6e6ea] text-sm font-semibold text-[#6b6b78]">
                  Annuler
                </button>
                <button type="button" onClick={handleResetPassword} disabled={resetPwdLoading || resetPwdValue.length < 6}
                  className="flex-1 py-2.5 rounded-xl bg-[#1F1B2E] text-white text-sm font-bold disabled:opacity-50">
                  {resetPwdLoading ? 'Enregistrement…' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal promotion ── */}
      {promoting && (() => {
        const role = promoting.role as 'GUIDE' | 'SENTINELLE' | 'REGION';
        const ROLES = {
          GUIDE:      { icon: '📖', label: 'Guide',         desc: 'Responsable d\'une paroisse', bg: 'bg-[#f5eeff]', border: 'border-[#6A1B9A]/20', iconBg: 'bg-[#6A1B9A]' },
          SENTINELLE: { icon: '🛡️', label: 'Sentinelle',   desc: 'Responsable d\'un district',  bg: 'bg-[#fdf8ec]', border: 'border-[#D9A441]/30', iconBg: 'bg-[#D9A441]' },
          REGION:     { icon: '🌍', label: 'Membre Région', desc: 'Conseil régional',             bg: 'bg-[#f0f0f4]', border: 'border-[#1F1B2E]/10', iconBg: 'bg-[#1F1B2E]' },
        };
        const promotions   = role === 'GUIDE' ? (['SENTINELLE', 'REGION'] as const)  : role === 'SENTINELLE' ? (['REGION'] as const) : [];
        const retrogrades  = role === 'REGION' ? (['SENTINELLE', 'GUIDE'] as const) : role === 'SENTINELLE' ? (['GUIDE'] as const)  : [];
        return (
          <div className="fixed inset-0 bg-black/50 flex items-end z-[60]" onClick={() => !promoteLoading && setPromoting(null)}>
            <div className="bg-white rounded-t-2xl w-full max-w-lg mx-auto shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-5 pt-4 pb-3 border-b border-[#f0f0f4]">
                <p className="text-[11px] text-[#9b9ba8] mb-0.5">{promoting.prenoms} {promoting.nom}</p>
                <p className="text-sm font-bold text-[#1F1B2E]">Changer le rôle · actuellement <span className="text-[#6A1B9A]">{ROLES[role].label}</span></p>
              </div>
              <div className="flex flex-col p-3 gap-2">
                {promotions.length > 0 && (
                  <>
                    <p className="text-[10px] font-bold text-[#9b9ba8] uppercase tracking-widest px-1">Promouvoir</p>
                    {promotions.map(target => {
                      const r = ROLES[target];
                      return (
                        <button key={target} onClick={() => handlePromouvoir(target)} disabled={promoteLoading}
                          className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl ${r.bg} border ${r.border} active:opacity-80 text-left disabled:opacity-60`}>
                          <span className={`w-9 h-9 rounded-full ${r.iconBg} flex items-center justify-center text-base flex-shrink-0`}>{r.icon}</span>
                          <div>
                            <div className="font-semibold text-sm text-[#1F1B2E]">{r.label}</div>
                            <div className="text-xs text-[#9b9ba8]">{r.desc}</div>
                          </div>
                          <span className="ml-auto text-xs text-[#9b9ba8]">↑</span>
                        </button>
                      );
                    })}
                  </>
                )}
                {retrogrades.length > 0 && (
                  <>
                    <p className="text-[10px] font-bold text-[#9b9ba8] uppercase tracking-widest px-1 mt-1">Rétrograder</p>
                    {retrogrades.map(target => {
                      const r = ROLES[target];
                      return (
                        <button key={target} onClick={() => handlePromouvoir(target)} disabled={promoteLoading}
                          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white border border-[#e6e6ea] active:bg-[#f9f9fc] text-left disabled:opacity-60">
                          <span className={`w-9 h-9 rounded-full ${r.iconBg} flex items-center justify-center text-base flex-shrink-0 opacity-70`}>{r.icon}</span>
                          <div>
                            <div className="font-semibold text-sm text-[#6b6b78]">{r.label}</div>
                            <div className="text-xs text-[#b0b0bc]">{r.desc}</div>
                          </div>
                          <span className="ml-auto text-xs text-[#b0b0bc]">↓</span>
                        </button>
                      );
                    })}
                  </>
                )}
                <button onClick={() => setPromoting(null)} disabled={promoteLoading}
                  className="w-full py-3 rounded-xl border border-[#e6e6ea] text-sm font-semibold text-[#6b6b78] mt-1">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        );
      })()}
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
