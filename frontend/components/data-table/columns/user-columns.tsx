'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  EN_ATTENTE_VALIDATION: 'or',
  SUSPENDU: 'rouge',
  ARCHIVE: 'gris',
};
export const STATUT_LABEL: Record<string, string> = {
  ACTIF: 'Actif',
  INACTIF: 'Inactif',
  EN_ATTENTE_ACTIVATION: 'En attente',
  EN_ATTENTE_VALIDATION: 'À valider',
  SUSPENDU: 'Suspendu',
  ARCHIVE: 'Archivé',
};

// ─── Dropdown actions ─────────────────────────────────────────────────────────

type ItemVariant = 'default' | 'success' | 'blue' | 'orange' | 'danger';

interface DropdownItem {
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: ItemVariant;
  confirm?: boolean;        // affiche Oui / Non avant d'exécuter
  confirmLabel?: string;    // texte de la question (ex: "Supprimer définitivement ?")
  disabled?: boolean;
}

const VARIANT_CLASS: Record<ItemVariant, string> = {
  default: 'text-[#1F1B2E]',
  success: 'text-[#2E7D32]',
  blue:    'text-[#1a56db]',
  orange:  'text-[#e65100]',
  danger:  'text-[#C62828]',
};

function ActionsDropdown({ items, isLoading }: { items: DropdownItem[]; isLoading: boolean }) {
  const [open, setOpen]           = useState(false);
  const [confirmItem, setConfirmItem] = useState<DropdownItem | null>(null);
  const [style, setStyle]         = useState<React.CSSProperties>({});
  const btnRef  = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (open) { setOpen(false); setConfirmItem(null); return; }
    if (!btnRef.current) return;
    const r   = btnRef.current.getBoundingClientRect();
    const est = 240; // hauteur estimée du menu
    const up  = window.innerHeight - r.bottom < est && r.top > est;
    setStyle({
      position: 'fixed',
      right: Math.max(8, window.innerWidth - r.right),
      ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
      minWidth: Math.max(r.width, 192),
      zIndex: 9999,
    });
    setOpen(true);
    setConfirmItem(null);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !dropRef.current?.contains(e.target as Node)
      ) { setOpen(false); setConfirmItem(null); }
    };
    const onScroll = () => { setOpen(false); setConfirmItem(null); };
    document.addEventListener('mousedown', close);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const visibleItems = items.filter(i => !i.disabled);

  // Sépare les items "danger" des autres pour afficher un diviseur
  const hasDangerSeparator = (i: number) =>
    i > 0 &&
    visibleItems[i].variant === 'danger' &&
    visibleItems[i - 1]?.variant !== 'danger';

  const menu = open ? createPortal(
    <div
      ref={dropRef}
      style={style}
      className="bg-white border border-[#e6e6ea] rounded-xl shadow-2xl overflow-hidden"
    >
      {confirmItem ? (
        <div className="p-3 flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold text-[#1F1B2E] leading-snug">
            {confirmItem.confirmLabel ?? 'Confirmer cette action ?'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { confirmItem.onClick(); setOpen(false); setConfirmItem(null); }}
              className="flex-1 text-[11px] font-bold py-1.5 rounded-lg bg-[#C62828] text-white hover:bg-[#a82020] transition-colors"
            >
              Confirmer
            </button>
            <button
              type="button"
              onClick={() => setConfirmItem(null)}
              className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg bg-[#f0f0f4] text-[#6b6b78] hover:bg-[#e4e4ea] transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="py-1">
          {visibleItems.map((item, i) => {
            const isDanger = item.variant === 'danger';
            return (
              <div key={i}>
                {hasDangerSeparator(i) && (
                  <div className="my-1 border-t border-[#f0f0f4]" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (item.confirm) { setConfirmItem(item); return; }
                    item.onClick();
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 text-left text-[12px] font-medium px-3.5 py-2 transition-colors
                    ${isDanger ? 'hover:bg-[#fff5f5]' : 'hover:bg-[#f6f6fa]'}
                    ${VARIANT_CLASS[item.variant ?? 'default']}
                  `}
                >
                  {item.icon && (
                    <span className="text-[14px] leading-none shrink-0 w-4 text-center">
                      {item.icon}
                    </span>
                  )}
                  {!item.icon && <span className="w-4 shrink-0" />}
                  {item.label}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>,
    document.body,
  ) : null;

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        disabled={isLoading}
        className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[#f0f0f4] text-[#1F1B2E] hover:bg-[#e4e4ea] transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {isLoading ? '…' : 'Actions'}
        <svg
          className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12" fill="none"
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {menu}
    </div>
  );
}

// ─── createGardienColumns ─────────────────────────────────────────────────────

export function createGardienColumns(
  actions: {
    onEdit: (user: User) => void;
    onSuspend: (user: User) => void;
    onReactivate: (user: User) => void;
    onValider?: (user: User) => void;
    onRejeter?: (user: User) => void;
    onPurger?: (user: User) => void;
    onResetPassword?: (user: User) => void;
    pendingSuspend: string | null;
    setPendingSuspend: (id: string | null) => void;
    pendingDelete: string | null;
    setPendingDelete: (id: string | null) => void;
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
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const u = row.original;
        const isLoading   = actions.actionLoading === u.id;
        const canSuspend  = u.statutProfil === 'ACTIF';
        const canReact    = u.statutProfil === 'SUSPENDU';
        const canValider  = u.statutProfil === 'EN_ATTENTE_VALIDATION';

        const items: DropdownItem[] = [
          { label: 'Modifier',   icon: '✎',  onClick: () => actions.onEdit(u), variant: 'default' },
          ...(canValider && actions.onValider ? [{ label: 'Valider l\'ajout', icon: '✓', onClick: () => actions.onValider!(u), variant: 'success' as ItemVariant }] : []),
          ...(canValider && actions.onRejeter ? [{ label: 'Rejeter', icon: '✗', onClick: () => actions.onRejeter!(u), variant: 'danger' as ItemVariant, confirm: true, confirmLabel: 'Rejeter et supprimer cet ajout ?' }] : []),
          ...(canReact ? [{ label: 'Réactiver', icon: '✓', onClick: () => actions.onReactivate(u), variant: 'success' as ItemVariant }] : []),
          ...(canSuspend ? [{ label: 'Suspendre', onClick: () => actions.onSuspend(u), variant: 'danger' as ItemVariant, confirm: true, confirmLabel: 'Suspendre ce gardien ?' }] : []),
          ...(actions.onResetPassword ? [{ label: 'Réinitialiser le MDP', icon: '🔑', onClick: () => actions.onResetPassword!(u), variant: 'orange' as ItemVariant }] : []),
          ...(actions.onPurger ? [{ label: 'Supprimer définitivement', icon: '🗑', onClick: () => actions.onPurger!(u), variant: 'danger' as ItemVariant, confirm: true, confirmLabel: 'Supprimer définitivement ? Cette action est irréversible.' }] : []),
        ];

        return <ActionsDropdown items={items} isLoading={isLoading} />;
      },
    },
  ];
}

// ─── createGuideColumns ───────────────────────────────────────────────────────

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
    onResetPassword?: (user: User) => void;
    onPurger?: (user: User) => void;
    pendingSuspend: string | null;
    setPendingSuspend: (id: string | null) => void;
    pendingDelete: string | null;
    setPendingDelete: (id: string | null) => void;
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
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const u = row.original;
        const isLoading     = actions.actionLoading === u.id;
        const isEncadrant   = u.role === 'GUIDE' || u.role === 'SENTINELLE' || u.role === 'REGION';
        const canSuspend    = u.statutProfil === 'ACTIF';
        const canReactivate = u.statutProfil === 'SUSPENDU';
        const canActivate   = u.statutProfil === 'EN_ATTENTE_ACTIVATION';

        const items: DropdownItem[] = [
          ...(actions.onPromote && isEncadrant ? [{ label: 'Changer le rôle', icon: '⇅', onClick: () => actions.onPromote!(u), variant: 'blue' as ItemVariant }] : []),
          ...(canActivate  ? [{ label: 'Activer le compte',   icon: '✓', onClick: () => actions.onReactivate(u), variant: 'success' as ItemVariant }] : []),
          ...(canReactivate? [{ label: 'Réactiver le compte', icon: '✓', onClick: () => actions.onReactivate(u), variant: 'success' as ItemVariant }] : []),
          ...(canSuspend   ? [{ label: 'Suspendre',           onClick: () => actions.onSuspend(u),    variant: 'danger' as ItemVariant, confirm: true, confirmLabel: 'Suspendre cet encadrant ?' }] : []),
          ...(actions.onResetPassword ? [{ label: 'Réinitialiser le MDP', icon: '🔑', onClick: () => actions.onResetPassword!(u), variant: 'orange' as ItemVariant }] : []),
          ...(actions.onPurger ? [{ label: 'Supprimer définitivement', icon: '🗑', onClick: () => actions.onPurger!(u), variant: 'danger' as ItemVariant, confirm: true, confirmLabel: 'Supprimer définitivement ? Cette action est irréversible.' }] : []),
        ];

        if (!items.length) return <span className="text-[10px] text-[#b0b0bc]">—</span>;
        return <ActionsDropdown items={items} isLoading={isLoading} />;
      },
    },
  ];
}
