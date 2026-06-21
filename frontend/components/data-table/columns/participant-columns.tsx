'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Pill } from '@/components/ui';
import { DataTableColumnHeader } from '../data-table-column-header';
import type { CampParticipant, AdhesionStatus, ParticipationStatus } from '@/types';

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

export const PARTICIPATION_FILTER_OPTIONS = Object.entries(PARTICIPATION_LABELS).map(
  ([value, label]) => ({ value, label }),
);
export const ADHESION_FILTER_OPTIONS = Object.entries(ADHESION_LABELS).map(
  ([value, label]) => ({ value, label }),
);
export const ROLE_FILTER_OPTIONS = [
  { value: 'GARDIEN',   label: 'Gardiens' },
  { value: 'GUIDE',     label: 'Guides' },
  { value: 'SENTINELLE', label: 'Sentinelles' },
  { value: 'REGION',    label: 'Membres région' },
];

export interface ParticipantColumnsOptions {
  onToggleSecurite?: (p: CampParticipant) => void;
  secuLoadingId?: string | null;
  canToggleSecurite?: boolean;
}

export function createParticipantColumns(opts: ParticipantColumnsOptions = {}): ColumnDef<CampParticipant>[] {
  const cols: ColumnDef<CampParticipant>[] = [
    {
      id: 'nom',
      accessorFn: row => `${row.user.prenoms ?? ''} ${row.user.nom ?? ''}`.trim(),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nom" />
      ),
      cell: ({ row }) => (
        <span className="font-semibold text-[#1F1B2E]">
          {row.original.user.prenoms} {row.original.user.nom}
        </span>
      ),
      meta: {
        exportHeader: 'Nom',
        exportValue: row => `${row.user.prenoms} ${row.user.nom}`,
      },
    },
    {
      id: 'matricule',
      accessorFn: row => row.user.matricule ?? '',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Matricule" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-[#6b6b78]">{row.original.user.matricule ?? '—'}</span>
      ),
      meta: { exportHeader: 'Matricule', exportValue: row => row.user.matricule ?? '' },
    },
    {
      id: 'paroisse',
      accessorFn: row => row.parish?.nom ?? '',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Paroisse" />
      ),
      cell: ({ row }) => (
        <span className="text-[#6b6b78]">{row.original.parish?.nom ?? '—'}</span>
      ),
      meta: { exportHeader: 'Paroisse', exportValue: row => row.parish?.nom ?? '' },
    },
    {
      id: 'district',
      accessorFn: row => row.district?.nom ?? '',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="District" />
      ),
      cell: ({ row }) => (
        <span className="text-[#6b6b78]">{row.original.district?.nom ?? '—'}</span>
      ),
      meta: { exportHeader: 'District', exportValue: row => row.district?.nom ?? '' },
    },
    {
      id: 'adhesion',
      accessorFn: row => row.adhesionStatusSnapshot,
      header: 'Adhésion',
      cell: ({ row }) => (
        <Pill variant={ADHESION_PILL[row.original.adhesionStatusSnapshot]}>
          {ADHESION_LABELS[row.original.adhesionStatusSnapshot]}
        </Pill>
      ),
      meta: {
        exportHeader: 'Adhésion',
        exportValue: row => ADHESION_LABELS[row.adhesionStatusSnapshot],
      },
    },
    {
      id: 'statut',
      accessorFn: row => row.participationStatus,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Statut" />
      ),
      cell: ({ row }) => (
        <Pill variant={PARTICIPATION_PILL[row.original.participationStatus]}>
          {PARTICIPATION_LABELS[row.original.participationStatus]}
        </Pill>
      ),
      meta: {
        exportHeader: 'Statut participation',
        exportValue: row => PARTICIPATION_LABELS[row.participationStatus],
      },
    },
    {
      id: 'securite',
      header: 'Sécu.',
      cell: ({ row }) => {
        const p = row.original;
        const isLoading = opts.secuLoadingId === p.id;
        const isGardien = p.roleAtCamp === 'GARDIEN';
        if (isGardien) return <span className="text-[#d0d0d8] text-xs">—</span>;
        if (opts.canToggleSecurite && opts.onToggleSecurite) {
          return (
            <button
              type="button"
              onClick={() => opts.onToggleSecurite!(p)}
              disabled={isLoading}
              title={p.chargeSecurite ? 'Retirer la charge sécurité' : 'Désigner chargé sécurité'}
              className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors disabled:opacity-40 ${
                p.chargeSecurite
                  ? 'bg-[#fde8e8] text-[#E55A35] hover:bg-[#fcd0d0]'
                  : 'bg-[#f5f5f8] text-[#9b9ba8] hover:bg-[#ececf0] hover:text-[#1F1B2E]'
              }`}
            >
              {isLoading ? '…' : p.chargeSecurite ? '🛡️ Sécu.' : '🛡️ —'}
            </button>
          );
        }
        if (!p.chargeSecurite) return <span className="text-[#d0d0d8]">—</span>;
        return (
          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-[#fde8e8] text-[#E55A35]">
            🛡️ Sécu.
          </span>
        );
      },
      meta: {
        exportHeader: 'Chargé sécu.',
        exportValue: row => row.chargeSecurite ? 'Oui' : '',
      },
    },
  ];
  return cols;
}

export function filterParticipants(
  participants: CampParticipant[],
  values: Record<string, string>,
): CampParticipant[] {
  const search = (values.search ?? '').toLowerCase();
  const participation = values.participation ?? '';
  const adhesion = values.adhesion ?? '';
  const role = values.role ?? '';

  return participants.filter(p => {
    if (participation && p.participationStatus !== participation) return false;
    if (adhesion && p.adhesionStatusSnapshot !== adhesion) return false;
    if (role && p.roleAtCamp !== role) return false;

    if (!search) return true;
    const nom = `${p.user.prenoms ?? ''} ${p.user.nom ?? ''}`.toLowerCase();
    const mat = (p.user.matricule ?? '').toLowerCase();
    const paroisse = (p.parish?.nom ?? '').toLowerCase();
    const district = (p.district?.nom ?? '').toLowerCase();
    return nom.includes(search) || mat.includes(search) || paroisse.includes(search) || district.includes(search);
  });
}
