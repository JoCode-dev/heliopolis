'use client';
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { campsApi } from '@/lib/api';
import { Pill, Select } from '@/components/ui';
import { Pagination } from '@/components/ui/Pagination';
import { usePaginationUrl } from '@/hooks/usePaginationUrl';
import {
  DataTable,
  DataTableExportButtons,
  DataTableFilters,
  useDataTable,
  useTableExport,
  useTableFilters,
} from '@/components/data-table';
import {
  ADHESION_FILTER_OPTIONS,
  createParticipantColumns,
  filterParticipants,
  PARTICIPATION_FILTER_OPTIONS,
} from '@/components/data-table/columns/participant-columns';
import type { Camp, CampParticipant, AdhesionStatus, ParticipationStatus } from '@/types';

const PER_PAGE = 10;

const ADHESION_PILL: Record<AdhesionStatus, 'vert' | 'rouge' | 'or'> = {
  A_JOUR: 'vert',
  NON_A_JOUR: 'rouge',
  EN_ATTENTE: 'or',
};
const ADHESION_LABELS: Record<AdhesionStatus, string> = {
  A_JOUR: 'À jour',
  NON_A_JOUR: 'Non à jour',
  EN_ATTENTE: 'En attente',
};
const PARTICIPATION_PILL: Record<ParticipationStatus, 'vert' | 'rouge' | 'or' | 'violet' | 'gris'> = {
  SELECTIONNE: 'vert',
  CONFIRME: 'vert',
  PRESENT: 'vert',
  EN_ATTENTE: 'or',
  NON_SELECTIONNE: 'gris',
  DESISTE: 'rouge',
  ABSENT: 'rouge',
  BLOQUE: 'rouge',
};
const PARTICIPATION_LABELS: Record<ParticipationStatus, string> = {
  SELECTIONNE: 'Sélectionné',
  CONFIRME: 'Confirmé',
  PRESENT: 'Présent',
  EN_ATTENTE: 'En attente',
  NON_SELECTIONNE: 'Non sélectionné',
  DESISTE: 'Désisté',
  ABSENT: 'Absent',
  BLOQUE: 'Bloqué',
};

function ParticipantsContent() {
  const searchParams = useSearchParams();
  const initialCampId = searchParams.get('campId') ?? '';

  const [camps, setCamps] = useState<Camp[]>([]);
  const [selectedCampId, setSelectedCampId] = useState(initialCampId);
  const [participants, setParticipants] = useState<CampParticipant[]>([]);
  const [loadingCamps, setLoadingCamps] = useState(true);
  const [loadingParts, setLoadingParts] = useState(false);
  const [page, setPage] = usePaginationUrl();

  const { values, setFilter, resetFilters, hasActiveFilters } = useTableFilters(
    [
      { id: 'search', type: 'search', placeholder: 'Rechercher par nom ou matricule…' },
      { id: 'participation', type: 'select', placeholder: 'Tous les statuts', options: PARTICIPATION_FILTER_OPTIONS },
      { id: 'adhesion', type: 'select', placeholder: 'Toutes adhésions', options: ADHESION_FILTER_OPTIONS },
    ],
    () => setPage(1),
  );

  useEffect(() => {
    (async () => {
      try {
        const { data } = await campsApi.list();
        setCamps(data);
        if (!initialCampId && data[0]?.id) setSelectedCampId(data[0].id);
      } catch { /* ignore */ }
      finally { setLoadingCamps(false); }
    })();
  }, [initialCampId]);

  useEffect(() => {
    if (!selectedCampId) return;
    (async () => {
      setLoadingParts(true);
      try {
        const { data } = await campsApi.participants(selectedCampId);
        setParticipants(data);
      } catch { setParticipants([]); }
      finally { setLoadingParts(false); }
    })();
  }, [selectedCampId]);

  const filtered = useMemo(
    () => filterParticipants(participants, values),
    [participants, values],
  );

  const columns = useMemo(() => createParticipantColumns(), []);

  const { table } = useDataTable({
    data: filtered,
    columns,
    pageSize: PER_PAGE,
    page,
    onPageChange: setPage,
  });

  const { exportExcel, exportPdf, disabled: exportDisabled } = useTableExport({
    data: filtered,
    columns,
    options: { filename: 'participants', title: 'Liste des participants' },
  });

  const paginatedRows = table.getRowModel().rows;

  const total = participants.length;
  const confirmes = participants.filter(p => ['CONFIRME', 'PRESENT'].includes(p.participationStatus)).length;
  const enAttente = participants.filter(p => p.participationStatus === 'EN_ATTENTE').length;
  const selectionnes = participants.filter(p => p.participationStatus === 'SELECTIONNE').length;

  const filterConfigs = useMemo(() => [
    { id: 'search', type: 'search' as const, placeholder: 'Rechercher par nom ou matricule…' },
    { id: 'participation', type: 'select' as const, placeholder: 'Tous les statuts', options: PARTICIPATION_FILTER_OPTIONS },
    { id: 'adhesion', type: 'select' as const, placeholder: 'Toutes adhésions', options: ADHESION_FILTER_OPTIONS },
  ], []);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6">
      <div className="flex justify-between items-center mb-4 border-b border-[#ececf0] pb-4">
        <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E]">👥 Participants</h1>
        <div className="flex items-center gap-2 shrink-0">
          {selectedCampId && filtered.length > 0 && (
            <DataTableExportButtons
              compact
              onExportExcel={exportExcel}
              onExportPdf={exportPdf}
              disabled={exportDisabled}
            />
          )}
          <Link href="/dashboard/admin/export"
            className="bg-[#6A1B9A] text-white font-bold text-xs lg:text-sm px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl hover:bg-[#5a1280] transition-colors">
            📤 Export
          </Link>
        </div>
      </div>

      <div className="mb-5 max-w-sm">
        {loadingCamps ? (
          <div className="h-10 bg-white border border-[#e6e6ea] rounded-xl animate-pulse" />
        ) : (
          <Select
            value={selectedCampId}
            onChange={e => { setSelectedCampId(e.target.value); setPage(1); }}
            className="w-full">
            <option value="">— Sélectionner un camp —</option>
            {camps.map(c => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </Select>
        )}
      </div>

      {selectedCampId && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
          {[
            { label: 'Total', value: total, color: '#1F1B2E' },
            { label: 'Confirmés', value: confirmes, color: '#2E7D32' },
            { label: 'Attente', value: enAttente, color: '#D9A441' },
            { label: 'Sélect.', value: selectionnes, color: '#6A1B9A' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white border border-[#ececf0] rounded-xl p-3">
              <div className="text-2xl font-black" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-[10px] text-[#6b6b78] uppercase tracking-wide mt-0.5">{kpi.label}</div>
            </div>
          ))}
        </div>
      )}

      {selectedCampId && (
        <div className="mb-4">
          <DataTableFilters
            configs={filterConfigs}
            values={values}
            onChange={setFilter}
            onReset={resetFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>
      )}

      {selectedCampId && (
        loadingParts ? (
          <div className="flex items-center justify-center py-16 text-[#6b6b78] text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#6b6b78]">
            <div className="text-5xl mb-3">👥</div>
            <p className="font-semibold">Aucun participant trouvé</p>
          </div>
        ) : (
          <>
            <div className="lg:hidden flex flex-col gap-2">
              {paginatedRows.map(({ original: p }) => (
                <div key={p.id} className="bg-white border border-[#ececf0] rounded-xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#3d1163] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {p.user.nom?.[0]}{p.user.prenoms?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[#1F1B2E] truncate">
                      {p.user.prenoms} {p.user.nom}
                    </div>
                    <div className="text-[11px] text-[#6b6b78] truncate">
                      {p.user.matricule ?? '—'} · {p.parish?.nom ?? '—'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Pill variant={ADHESION_PILL[p.adhesionStatusSnapshot]} className="text-[10px]">
                      {ADHESION_LABELS[p.adhesionStatusSnapshot]}
                    </Pill>
                    <Pill variant={PARTICIPATION_PILL[p.participationStatus]} className="text-[10px]">
                      {PARTICIPATION_LABELS[p.participationStatus]}
                    </Pill>
                  </div>
                </div>
              ))}
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
        )
      )}

      {!selectedCampId && !loadingCamps && (
        <div className="flex flex-col items-center justify-center py-16 text-[#6b6b78]">
          <div className="text-5xl mb-3">⛺</div>
          <p className="font-semibold">Sélectionnez un camp pour voir les participants</p>
        </div>
      )}
    </div>
  );
}

export default function AdminParticipantsPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-[#6b6b78] text-sm">Chargement…</div>}>
      <ParticipantsContent />
    </Suspense>
  );
}
