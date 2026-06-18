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
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [resetPwdTarget, setResetPwdTarget] = useState<User | null>(null);
  const [resetPwdValue, setResetPwdValue] = useState('');
  const [resetPwdShow, setResetPwdShow] = useState(false);
  const [resetPwdLoading, setResetPwdLoading] = useState(false);
  const [resetPwdError, setResetPwdError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [completerConfirm, setCompleterConfirm] = useState(false);
  const [completerLoading, setCompleterLoading] = useState(false);
  const [completerResult, setCompleterResult] = useState<{ corriges: number } | null>(null);
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

  const handleCompleterDistricts = async () => {
    setCompleterLoading(true);
    setCompleterConfirm(false);
    try {
      const { data } = await territoriesApi.completerDistricts();
      setCompleterResult(data);
      if (data.corriges > 0) {
        const [g] = await Promise.all([usersApi.list({ role: 'GARDIEN' })]);
        setGardiens(g.data);
      }
    } catch { /* ignore */ }
    finally { setCompleterLoading(false); }
  };

  const handleStatut = async (user: User, newStatut: 'SUSPENDU' | 'ACTIF') => {
    setActionLoading(user.id);
    setPendingSuspend(null);
    try {
      const { data } = await usersApi.updateStatut(user.id, newStatut);
      setGardiens(prev => prev.map(u => u.id === user.id ? { ...u, statutProfil: data.statutProfil } : u));
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const handlePurger = async (user: User) => {
    setActionLoading(user.id);
    try {
      await usersApi.purger(user.id);
      setGardiens(prev => prev.filter(u => u.id !== user.id));
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const handleValider = async (user: User) => {
    setActionLoading(user.id);
    try {
      const { data } = await usersApi.valider(user.id);
      setGardiens(prev => prev.map(u => u.id === user.id ? { ...u, statutProfil: (data as User).statutProfil } : u));
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const handleRejeter = async (user: User) => {
    setActionLoading(user.id);
    try {
      await usersApi.rejeter(user.id);
      setGardiens(prev => prev.filter(u => u.id !== user.id));
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
      setGardiens(prev => prev.map(u => u.id === resetPwdTarget.id ? { ...u, statutProfil: (data as User).statutProfil } : u));
      setResetPwdTarget(null);
    } catch { setResetPwdError('Une erreur est survenue. Vérifiez le mot de passe et réessayez.'); }
    finally { setResetPwdLoading(false); }
  };

  const columns = useMemo(
    () => createGardienColumns({
      onEdit: setEditUser,
      onSuspend: u => handleStatut(u, 'SUSPENDU'),
      onReactivate: u => handleStatut(u, 'ACTIF'),
      onValider: handleValider,
      onRejeter: handleRejeter,
      onPurger: handlePurger,
      onResetPassword: openResetPwd,
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
    options: { filename: 'gardiens', title: 'Liste des gardiens' },
  });

  const paginatedRows = table.getRowModel().rows;

  const pending    = gardiens.filter(u => u.statutProfil === 'EN_ATTENTE_VALIDATION');
  const nbActifs   = gardiens.filter(u => u.statutProfil === 'ACTIF').length;
  const nbAJour    = gardiens.filter(u => u.adhesions?.[0]?.statut === 'A_JOUR').length;
  const nbNonAJour = gardiens.filter(u => u.adhesions?.[0]?.statut === 'NON_A_JOUR').length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-[#ececf0] px-4 pt-3.5 pb-3 shrink-0">
        <DataTableToolbar
          title="🤝 Gardiens"
          count={gardiens.length}
          exports={
            <div className="hidden lg:flex items-center gap-1">
              <DataTableExportButtons
                compact
                onExportExcel={exportExcel}
                onExportPdf={exportPdf}
                onExportCsv={exportCsv}
                disabled={exportDisabled}
              />
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              {completerConfirm ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#6b6b78]">Confirmer ?</span>
                  <button type="button" onClick={handleCompleterDistricts}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-[#2E7D32] text-white hover:bg-[#256427] transition-colors">
                    Oui
                  </button>
                  <button type="button" onClick={() => setCompleterConfirm(false)}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-[#f0f0f4] text-[#1F1B2E] hover:bg-[#e4e4ea] transition-colors">
                    Annuler
                  </button>
                </div>
              ) : completerLoading ? (
                <span className="text-xs text-[#6b6b78] animate-pulse">Mise à jour…</span>
              ) : completerResult ? (
                <button type="button" onClick={() => setCompleterResult(null)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#e6f4e8] text-[#2E7D32]">
                  {completerResult.corriges} district{completerResult.corriges !== 1 ? 's' : ''} complété{completerResult.corriges !== 1 ? 's' : ''} ✓
                </button>
              ) : (
                <button type="button" onClick={() => setCompleterConfirm(true)}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border border-[#1F1B2E]/20 text-[#1F1B2E] hover:bg-[#f0f0f4] transition-colors shrink-0">
                  Compléter districts
                </button>
              )}
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-1 bg-[#1F1B2E] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#2d2640] transition-colors shrink-0"
              >
                + Ajouter
              </button>
            </div>
          }
          filters={
            <>
              {/* Desktop : tous les filtres */}
              <div className="hidden lg:block">
                <DataTableFilters
                  configs={dynamicFilterConfigs}
                  values={values}
                  onChange={setFilter}
                  onReset={resetFilters}
                  hasActiveFilters={hasActiveFilters}
                />
              </div>
              {/* Mobile : recherche + filtres repliables */}
              <div className="lg:hidden flex flex-col gap-2">
                <input
                  type="text"
                  value={(values.search as string) ?? ''}
                  onChange={e => setFilter('search', e.target.value)}
                  placeholder="Nom, matricule, paroisse…"
                  className="w-full bg-[#f6f6fa] border border-[#e6e6ea] rounded-xl px-3.5 py-2.5 text-sm text-[#1F1B2E] placeholder:text-[#b0b0bc]"
                />
                <button type="button" onClick={() => setMobileFiltersOpen(v => !v)}
                  className={`flex items-center justify-between w-full px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    hasActiveFilters ? 'border-[#1F1B2E]/30 bg-[#f0f0f4] text-[#1F1B2E]' : 'border-[#e6e6ea] bg-white text-[#6b6b78]'
                  }`}>
                  <span>Filtres{hasActiveFilters ? ' ·' : ''}</span>
                  <span className={`transition-transform duration-200 text-xs ${mobileFiltersOpen ? 'rotate-180' : ''}`}>▾</span>
                </button>
                {mobileFiltersOpen && (
                  <div className="flex flex-col gap-2">
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
                        Réinitialiser
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          }
        />

        <div className="grid grid-cols-5 gap-1.5 mt-2.5">
          {[
            { label: 'Total', value: gardiens.length, color: 'text-[#1F1B2E]' },
            { label: 'Actifs', value: nbActifs, color: 'text-[#2E7D32]' },
            { label: 'À valider', value: pending.length, color: pending.length > 0 ? 'text-[#D9A441]' : 'text-[#9b9ba8]' },
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

        {/* ── Section : en attente de validation ── */}
        {!loading && pending.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-[#D9A441] uppercase tracking-wide">⏳ En attente de validation</span>
              <span className="bg-[#D9A441] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pending.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {pending.map(u => {
                const isLoading = actionLoading === u.id;
                return (
                  <div key={u.id} className="bg-white border-2 border-[#D9A441]/40 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 px-3.5 py-3">
                      <UserAvatar
                        avatarUrl={u.avatarUrl}
                        initials={`${u.nom?.[0] ?? ''}${u.prenoms?.[0] ?? ''}`}
                        sizeClass="w-10 h-10 shrink-0"
                        bgClass="bg-[#D9A441]"
                        textClass="text-xs font-bold text-white"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[13px] text-[#1F1B2E] truncate">{u.prenoms} {u.nom}</div>
                        <div className="text-[11px] text-[#9b9ba8] truncate mt-0.5">
                          {u.matricule ?? '—'} · {u.parish?.nom ?? u.district?.nom ?? '—'}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] font-semibold text-[#D9A441] bg-[#fff8e1] border border-[#ffe082] rounded-full px-2 py-0.5">
                          ⏳ À valider
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 px-3.5 pb-3">
                      <button type="button" onClick={() => handleValider(u)} disabled={isLoading}
                        className="flex-1 py-1.5 rounded-xl text-[11px] font-bold bg-[#e8f5e9] text-[#2E7D32] hover:bg-[#2E7D32] hover:text-white transition-colors disabled:opacity-40">
                        {isLoading ? '…' : '✓ Valider l\'ajout'}
                      </button>
                      <button type="button" onClick={() => handleRejeter(u)} disabled={isLoading}
                        className="flex-1 py-1.5 rounded-xl text-[11px] font-bold bg-[#ffebee] text-[#E55A35] hover:bg-[#E55A35] hover:text-white transition-colors disabled:opacity-40">
                        {isLoading ? '…' : '✗ Rejeter'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-[#e6e6ea] my-4" />
          </div>
        )}

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
                const isLoading  = actionLoading === u.id;
                const isPending  = pendingSuspend === u.id;
                const isPendDel  = pendingDelete === u.id;
                const canSuspend = u.statutProfil === 'ACTIF';
                const canReact   = u.statutProfil === 'SUSPENDU';
                const adhesion = u.adhesions?.[0];
                const adhStatut = adhesion?.statut;

                return (
                  <div key={u.id} className="bg-white border border-[#ececf0] rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex items-center gap-3 px-3.5 py-3">
                      <UserAvatar
                        avatarUrl={u.avatarUrl}
                        initials={`${u.nom?.[0] ?? ''}${u.prenoms?.[0] ?? ''}`}
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
                    <div className="flex flex-col gap-1.5 px-3.5 pb-3">
                      <div className="flex gap-2">
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
                      <button type="button" onClick={() => openResetPwd(u)} disabled={isLoading}
                        className="w-full py-1.5 rounded-xl text-[11px] font-semibold bg-[#fff8e1] text-[#D9A441] hover:bg-[#D9A441] hover:text-white transition-colors disabled:opacity-40">
                        🔑 Réinitialiser le mot de passe
                      </button>
                      {!isPendDel && (
                        <button type="button" onClick={() => setPendingDelete(u.id)} disabled={isLoading}
                          className="w-full py-1.5 rounded-xl text-[11px] font-semibold bg-[#fff0f0] text-[#C62828] hover:bg-[#C62828] hover:text-white transition-colors disabled:opacity-40">
                          🗑 Supprimer définitivement
                        </button>
                      )}
                      {isPendDel && (
                        <div className="flex gap-2">
                          <span className="flex-1 text-[10px] text-[#C62828] font-semibold flex items-center">Supprimer ?</span>
                          <button type="button" onClick={() => setPendingDelete(null)}
                            className="py-1.5 px-3 rounded-xl text-[11px] font-semibold bg-[#f5f5f5] text-[#6b6b78]">
                            Annuler
                          </button>
                          <button type="button" onClick={() => handlePurger(u)} disabled={isLoading}
                            className="py-1.5 px-3 rounded-xl text-[11px] font-bold bg-[#C62828] text-white hover:bg-[#a82020] disabled:opacity-40">
                            {isLoading ? '…' : 'Confirmer'}
                          </button>
                        </div>
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
