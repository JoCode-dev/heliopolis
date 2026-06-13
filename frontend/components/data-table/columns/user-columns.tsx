'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Pill } from '@/components/ui';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { DataTableColumnHeader } from '../data-table-column-header';
import type { User } from '@/types';

export const ADHESION_PILL: Record<string, 'vert' | 'rouge' | 'or'> = {
  A_JOUR: 'vert',
  NON_A_JOUR: 'rouge',
  EN_ATTENTE: 'or',
};
export const ADHESION_LABEL: Record<string, string> = {
  A_JOUR: 'À jour',
  NON_A_JOUR: 'Non à jour',
  EN_ATTENTE: 'En attente',
};
export const STATUT_PILL: Record<string, 'vert' | 'rouge' | 'or' | 'gris'> = {
  ACTIF: 'vert',
  INACTIF: 'rouge',
  EN_ATTENTE_ACTIVATION: 'or',
  SUSPENDU: 'rouge',
  ARCHIVE: 'gris',
};
export const STATUT_LABEL: Record<string, string> = {
  ACTIF: 'Actif',
  INACTIF: 'Inactif',
  EN_ATTENTE_ACTIVATION: 'En attente',
  SUSPENDU: 'Suspendu',
  ARCHIVE: 'Archivé',
};

export function createGardienColumns(
  actions: {
    onEdit: (user: User) => void;
    onSuspend: (user: User) => void;
    onReactivate: (user: User) => void;
    pendingSuspend: string | null;
    setPendingSuspend: (id: string | null) => void;
    actionLoading: string | null;
  },
): ColumnDef<User>[] {
  return [
    {
      id: 'nom',
      accessorFn: row => `${row.prenoms ?? ''} ${row.nom ?? ''}`.trim(),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Gardien" />
      ),
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex items-center gap-2 min-w-0">
            <UserAvatar
              avatarUrl={u.avatarUrl}
              initials={`${u.nom[0]}${u.prenoms[0]}`}
              sizeClass="w-7 h-7 shrink-0"
              bgClass="bg-[#C62828]"
              textClass="text-[10px] font-bold text-white"
            />
            <span className="font-semibold text-[#1F1B2E] truncate">
              {u.prenoms} {u.nom}
            </span>
          </div>
        );
      },
      meta: {
        exportHeader: 'Gardien',
        exportValue: row => `${row.prenoms} ${row.nom}`,
      },
    },
    {
      id: 'matricule',
      accessorKey: 'matricule',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Matricule" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-[#6b6b78] truncate">
          {row.original.matricule ?? '—'}
        </span>
      ),
      meta: { exportHeader: 'Matricule' },
    },
    {
      id: 'territoire',
      accessorFn: row => row.parish?.nom ?? row.district?.nom ?? '',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Paroisse / District" />
      ),
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div>
            <div className="font-medium text-[#1F1B2E] truncate">{u.parish?.nom ?? '—'}</div>
            {u.district && (
              <div className="text-[10px] text-[#6b6b78] truncate">{u.district.nom}</div>
            )}
          </div>
        );
      },
      meta: {
        exportHeader: 'Paroisse',
        exportValue: row => row.parish?.nom ?? '',
      },
    },
    {
      id: 'adhesion',
      accessorFn: row => row.adhesions?.[0]?.statut ?? '',
      header: 'Adhésion',
      enableSorting: true,
      cell: ({ row }) => {
        const adhesion = row.original.adhesions?.[0];
        return adhesion ? (
          <Pill variant={ADHESION_PILL[adhesion.statut] ?? 'gris'}>
            {ADHESION_LABEL[adhesion.statut] ?? adhesion.statut}
          </Pill>
        ) : (
          <span className="text-[10px] text-[#b0b0bc]">—</span>
        );
      },
      meta: {
        exportHeader: 'Adhésion',
        exportValue: row => ADHESION_LABEL[row.adhesions?.[0]?.statut ?? ''] ?? '',
      },
    },
    {
      id: 'statut',
      accessorKey: 'statutProfil',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Statut" />
      ),
      cell: ({ row }) => (
        <Pill variant={STATUT_PILL[row.original.statutProfil] ?? 'gris'}>
          {STATUT_LABEL[row.original.statutProfil] ?? row.original.statutProfil}
        </Pill>
      ),
      meta: {
        exportHeader: 'Statut',
        exportValue: row => STATUT_LABEL[row.statutProfil] ?? row.statutProfil,
      },
    },
    {
      id: 'actions',
      header: 'Action',
      enableSorting: false,
      cell: ({ row }) => {
        const u = row.original;
        const isLoading = actions.actionLoading === u.id;
        const isPending = actions.pendingSuspend === u.id;
        const canSuspend = u.statutProfil === 'ACTIF';
        const canReact = u.statutProfil === 'SUSPENDU';

        return (
          <div className="flex flex-col gap-1">
            {canReact && (
              <button
                type="button"
                onClick={() => actions.onReactivate(u)}
                disabled={isLoading}
                className="w-full text-[11px] font-semibold px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
              >
                {isLoading ? '…' : '✓ Réactiver'}
              </button>
            )}
            {canSuspend && !isPending && (
              <button
                type="button"
                onClick={() => actions.setPendingSuspend(u.id)}
                disabled={isLoading}
                className="w-full text-[11px] font-semibold px-2 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Suspendre
              </button>
            )}
            {canSuspend && isPending && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => actions.onSuspend(u)}
                  disabled={isLoading}
                  className="flex-1 text-[11px] font-bold py-1 rounded-lg bg-[#C62828] text-white hover:bg-[#a82020] disabled:opacity-50"
                >
                  {isLoading ? '…' : 'Oui'}
                </button>
                <button
                  type="button"
                  onClick={() => actions.setPendingSuspend(null)}
                  className="flex-1 text-[11px] font-semibold py-1 rounded-lg bg-[#f0f0f4] text-[#6b6b78]"
                >
                  Non
                </button>
              </div>
            )}
            {!canSuspend && !canReact && (
              <span className="text-[10px] text-[#b0b0bc]">—</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'edit',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => actions.onEdit(row.original)}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#f0e8ff] text-[#6A1B9A] hover:bg-[#6A1B9A] hover:text-white transition-colors"
        >
          ✎ Modifier
        </button>
      ),
    },
  ];
}

export const ROLE_LABEL: Record<'GUIDE' | 'SENTINELLE' | 'REGION', string> = {
  GUIDE: 'Guide',
  SENTINELLE: 'Sentinelle',
  REGION: 'Région',
};
export const ROLE_PILL: Record<'GUIDE' | 'SENTINELLE' | 'REGION', 'violet' | 'or' | 'vert'> = {
  GUIDE: 'violet',
  SENTINELLE: 'or',
  REGION: 'vert',
};

export function createGuideColumns(
  actions: {
    onSuspend: (user: User) => void;
    onReactivate: (user: User) => void;
    onPromote?: (user: User) => void;
    pendingSuspend: string | null;
    setPendingSuspend: (id: string | null) => void;
    actionLoading: string | null;
  },
): ColumnDef<User>[] {
  return [
    {
      id: 'nom',
      accessorFn: row => `${row.prenoms ?? ''} ${row.nom ?? ''}`.trim(),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Encadrant" />
      ),
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex items-center gap-2 min-w-0">
            <UserAvatar
              avatarUrl={u.avatarUrl}
              initials={`${u.nom[0]}${u.prenoms[0]}`}
              sizeClass="w-7 h-7 shrink-0"
              bgClass={u.role === 'GUIDE' ? 'bg-[#6A1B9A]' : u.role === 'REGION' ? 'bg-[#1F1B2E]' : 'bg-[#D9A441]'}
              textClass="text-[10px] font-bold text-white"
            />
            <span className="font-semibold text-[#1F1B2E] truncate">
              {u.prenoms} {u.nom}
            </span>
          </div>
        );
      },
      meta: {
        exportHeader: 'Encadrant',
        exportValue: row => `${row.prenoms} ${row.nom}`,
      },
    },
    {
      id: 'matricule',
      accessorKey: 'matricule',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Matricule" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-[#6b6b78] truncate">
          {row.original.matricule ?? '—'}
        </span>
      ),
      meta: { exportHeader: 'Matricule' },
    },
    {
      id: 'role',
      accessorKey: 'role',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Rôle" />
      ),
      cell: ({ row }) => (
        <Pill variant={ROLE_PILL[row.original.role as 'GUIDE' | 'SENTINELLE' | 'REGION']}>
          {ROLE_LABEL[row.original.role as 'GUIDE' | 'SENTINELLE' | 'REGION']}
        </Pill>
      ),
      meta: {
        exportHeader: 'Rôle',
        exportValue: row => ROLE_LABEL[row.role as 'GUIDE' | 'SENTINELLE' | 'REGION'] ?? row.role,
      },
    },
    {
      id: 'territoire',
      accessorFn: row => row.parish?.nom ?? row.district?.nom ?? '',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Paroisse / District" />
      ),
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div>
            <div className="font-medium text-[#1F1B2E] truncate">
              {u.parish?.nom ?? u.district?.nom ?? '—'}
            </div>
            {u.parish && u.district && (
              <div className="text-[10px] text-[#6b6b78] truncate">{u.district.nom}</div>
            )}
          </div>
        );
      },
      meta: {
        exportHeader: 'Territoire',
        exportValue: row => row.parish?.nom ?? row.district?.nom ?? '',
      },
    },
    {
      id: 'adhesion',
      accessorFn: row => row.adhesions?.[0]?.statut ?? '',
      header: 'Adhésion',
      cell: ({ row }) => {
        const adhesion = row.original.adhesions?.[0];
        return adhesion ? (
          <Pill variant={ADHESION_PILL[adhesion.statut] ?? 'gris'}>
            {ADHESION_LABEL[adhesion.statut] ?? adhesion.statut}
          </Pill>
        ) : (
          <span className="text-[10px] text-[#b0b0bc]">—</span>
        );
      },
      meta: {
        exportHeader: 'Adhésion',
        exportValue: row => ADHESION_LABEL[row.adhesions?.[0]?.statut ?? ''] ?? '',
      },
    },
    {
      id: 'statut',
      accessorKey: 'statutProfil',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Statut" />
      ),
      cell: ({ row }) => (
        <Pill variant={STATUT_PILL[row.original.statutProfil] ?? 'gris'}>
          {STATUT_LABEL[row.original.statutProfil] ?? row.original.statutProfil}
        </Pill>
      ),
      meta: {
        exportHeader: 'Statut',
        exportValue: row => STATUT_LABEL[row.statutProfil] ?? row.statutProfil,
      },
    },
    {
      id: 'actions',
      header: 'Action',
      enableSorting: false,
      cell: ({ row }) => {
        const u = row.original;
        const isLoading = actions.actionLoading === u.id;
        const isPending = actions.pendingSuspend === u.id;
        const canSuspend = u.statutProfil === 'ACTIF';
        const canReactivate = u.statutProfil === 'SUSPENDU';

        return (
          <div className="flex flex-col gap-1">
            {actions.onPromote && (u.role === 'GUIDE' || u.role === 'SENTINELLE' || u.role === 'REGION') && !isPending && (
              <button
                type="button"
                onClick={() => actions.onPromote!(u)}
                disabled={isLoading}
                className="w-full text-[11px] font-semibold px-2 py-1 rounded-lg bg-[#e8f0fe] text-[#1a56db] hover:bg-[#d0e0fc] disabled:opacity-50"
              >
                ⇅ Rôle
              </button>
            )}
            {canReactivate && (
              <button
                type="button"
                onClick={() => actions.onReactivate(u)}
                disabled={isLoading}
                className="w-full text-[11px] font-semibold px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
              >
                {isLoading ? '…' : '✓ Réactiver'}
              </button>
            )}
            {canSuspend && !isPending && (
              <button
                type="button"
                onClick={() => actions.setPendingSuspend(u.id)}
                disabled={isLoading}
                className="w-full text-[11px] font-semibold px-2 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Suspendre
              </button>
            )}
            {canSuspend && isPending && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => actions.onSuspend(u)}
                  disabled={isLoading}
                  className="flex-1 text-[11px] font-bold py-1 rounded-lg bg-[#C62828] text-white hover:bg-[#a82020] disabled:opacity-50"
                >
                  {isLoading ? '…' : 'Oui'}
                </button>
                <button
                  type="button"
                  onClick={() => actions.setPendingSuspend(null)}
                  className="flex-1 text-[11px] font-semibold py-1 rounded-lg bg-[#f0f0f4] text-[#6b6b78]"
                >
                  Non
                </button>
              </div>
            )}
            {!actions.onPromote && !canSuspend && !canReactivate && (
              <span className="text-[10px] text-[#b0b0bc]">—</span>
            )}
          </div>
        );
      },
    },
  ];
}
