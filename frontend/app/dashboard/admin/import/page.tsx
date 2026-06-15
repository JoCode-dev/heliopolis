'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { usersApi } from '@/lib/api';
import {
  DataTable,
  DataTableColumnHeader,
  useDataTable,
} from '@/components/data-table';

type Erreur  = { matricule: string; raison: string };
type ResultatImport = { importes: number; fusionnes: number; ignores: number; erreurs: Erreur[]; districtsCrees: number; paroissesCrees: number };

type Membre = {
  id: string;
  matricule: string | null;
  nom: string | null;
  prenoms: string | null;
  dateNaissance: string | null;
  role: string;
  district: { id: string; nom: string } | null;
  parish:   { id: string; nom: string } | null;
};

const ROLE_LABELS: Record<string, string> = {
  GARDIEN:    'Gardien',
  GUIDE:      'Guide',
  SENTINELLE: 'Sentinelle',
  REGION:     'Région',
  ADMIN:      'Admin',
};

const ROLE_STYLES: Record<string, string> = {
  GARDIEN:    'bg-amber-100  text-amber-700',
  GUIDE:      'bg-blue-100   text-blue-700',
  SENTINELLE: 'bg-purple-100 text-purple-700',
  REGION:     'bg-green-100  text-green-700',
  ADMIN:      'bg-gray-100   text-gray-700',
};

const PAGE_SIZES = [10, 25, 50, 100];

const COLUMNS: ColumnDef<Membre, unknown>[] = [
  {
    accessorKey: 'matricule',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Matricule" />,
    cell: ({ getValue }) => (
      <span className="font-mono font-bold tracking-wider text-[#1F1B2E]">
        {(getValue() as string) ?? '—'}
      </span>
    ),
  },
  {
    id: 'nomComplet',
    accessorFn: (r) => `${r.nom ?? ''} ${r.prenoms ?? ''}`.trim(),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nom complet" />,
    cell: ({ row }) => (
      <span>
        <span className="font-semibold text-[#1F1B2E]">{row.original.nom ?? '—'}</span>
        {row.original.prenoms && (
          <span className="text-[#6b6b78] ml-1">{row.original.prenoms}</span>
        )}
      </span>
    ),
  },
  {
    accessorKey: 'dateNaissance',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Naissance" />,
    cell: ({ getValue }) => {
      const v = getValue() as string | null;
      return (
        <span className="text-[#6b6b78]">
          {v ? new Date(v).toLocaleDateString('fr-FR') : '—'}
        </span>
      );
    },
  },
  {
    accessorKey: 'role',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Rôle" />,
    cell: ({ getValue }) => {
      const r = getValue() as string;
      return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_STYLES[r] ?? 'bg-gray-100 text-gray-600'}`}>
          {ROLE_LABELS[r] ?? r}
        </span>
      );
    },
  },
  {
    id: 'district',
    accessorFn: (r) => r.district?.nom ?? '',
    header: ({ column }) => <DataTableColumnHeader column={column} title="District" />,
    cell: ({ getValue }) => (
      <span className="text-[#6b6b78]">{(getValue() as string) || '—'}</span>
    ),
  },
  {
    id: 'paroisse',
    accessorFn: (r) => r.parish?.nom ?? '',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Paroisse" />,
    cell: ({ getValue }) => (
      <span className="text-[#6b6b78]">{(getValue() as string) || '—'}</span>
    ),
  },
];

export default function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [loading, setLoading]   = useState(false);
  const [resultat, setResultat] = useState<ResultatImport | null>(null);
  const [erreurGlobal, setErreurGlobal] = useState('');
  const [drag, setDrag] = useState(false);

  const [membres, setMembres]             = useState<Membre[]>([]);
  const [loadingMembres, setLoadingMembres] = useState(true);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [perPage, setPerPage] = useState(25);

  const chargerMembres = useCallback(() => {
    setLoadingMembres(true);
    usersApi.list({ statutProfil: 'EN_ATTENTE_ACTIVATION' })
      .then(r => setMembres(r.data as Membre[]))
      .catch(() => {})
      .finally(() => setLoadingMembres(false));
  }, []);

  useEffect(() => { chargerMembres(); }, [chargerMembres]);

  const { table, filteredCount } = useDataTable({
    data:         membres,
    columns:      useMemo(() => COLUMNS, []),
    pageSize:     perPage,
    page,
    onPageChange: setPage,
    globalFilter: search,
  });

  const choisirFichier = (f: File | null) => {
    if (!f) return;
    setFichier(f);
    setResultat(null);
    setErreurGlobal('');
  };

  const importer = async () => {
    if (!fichier) return;
    setLoading(true);
    setErreurGlobal('');
    setResultat(null);
    try {
      const { data } = await usersApi.importerMatricules(fichier);
      setResultat(data as ResultatImport);
      if ((data as ResultatImport).importes > 0) chargerMembres();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setErreurGlobal(err.response?.data?.message ?? "Erreur lors de l'import.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (val: string) => { setSearch(val); setPage(1); };
  const handlePerPage = (val: number) => { setPerPage(val); setPage(1); };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8 max-w-5xl mx-auto w-full">

      {/* ── Formulaire d'upload ── */}
      <div className="max-w-2xl">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-[#1F1B2E]">Import de membres</h1>
          <p className="text-sm text-[#6b6b78] mt-1">
            Colonnes attendues :{' '}
            <span className="font-semibold">District, Groupe Scoute, Matricule, Nom, Prenom, Date de Naissance</span>.
          </p>
        </div>

        <div
          className={`rounded-2xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 py-8 px-6 mb-4 ${
            drag    ? 'border-[#E55A35] bg-orange-50'
            : fichier ? 'border-green-400 bg-green-50'
            : 'border-[#e0d6cc] bg-white hover:border-[#F58A4B]'
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); choisirFichier(e.dataTransfer.files[0] ?? null); }}
        >
          <span className="text-3xl">{fichier ? '✅' : '📂'}</span>
          {fichier ? (
            <div className="text-center">
              <p className="text-sm font-semibold text-[#1F1B2E]">{fichier.name}</p>
              <p className="text-xs text-[#6b6b78]">{(fichier.size / 1024).toFixed(1)} Ko · cliquez pour changer</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-semibold text-[#1F1B2E]">Glissez votre fichier Excel ici</p>
              <p className="text-xs text-[#6b6b78]">ou cliquez pour parcourir — .xlsx uniquement</p>
            </div>
          )}
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={(e) => choisirFichier(e.target.files?.[0] ?? null)} />
        </div>

        <button
          onClick={importer}
          disabled={!fichier || loading}
          className="w-full py-3 rounded-xl font-bold text-white text-sm transition-opacity disabled:opacity-40"
          style={{ background: 'linear-gradient(90deg,#F58A4B,#E55A35)' }}
        >
          {loading ? 'Import en cours…' : 'Importer les membres'}
        </button>

        {erreurGlobal && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {erreurGlobal}
          </div>
        )}

        {resultat && (
          <div className="mt-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Créés"     value={resultat.importes}       color="green" />
              <StatCard label="Fusionnés" value={resultat.fusionnes}      color="blue"  />
              <StatCard label="Ignorés"   value={resultat.ignores}        color="amber" />
              <StatCard label="Erreurs"   value={resultat.erreurs.length} color="red"   />
            </div>
            {(resultat.districtsCrees > 0 || resultat.paroissesCrees > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 flex flex-col gap-0.5">
                <span className="font-bold">Territoires créés automatiquement</span>
                {resultat.districtsCrees > 0 && (
                  <span>🛡️ {resultat.districtsCrees} district{resultat.districtsCrees > 1 ? 's' : ''} ajouté{resultat.districtsCrees > 1 ? 's' : ''}</span>
                )}
                {resultat.paroissesCrees > 0 && (
                  <span>⛪ {resultat.paroissesCrees} paroisse{resultat.paroissesCrees > 1 ? 's' : ''} ajoutée{resultat.paroissesCrees > 1 ? 's' : ''}</span>
                )}
              </div>
            )}
            {resultat.importes > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                <span className="font-bold">{resultat.importes} membre{resultat.importes > 1 ? 's' : ''}</span> pré-enregistré{resultat.importes > 1 ? 's' : ''}.
                Ils apparaissent maintenant dans la liste ci-dessous.
              </div>
            )}
            {resultat.fusionnes > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
                <span className="font-bold">{resultat.fusionnes} fiche{resultat.fusionnes > 1 ? 's' : ''}</span> existante{resultat.fusionnes > 1 ? 's' : ''} complétée{resultat.fusionnes > 1 ? 's' : ''} avec les informations manquantes (nom, paroisse, district…).
              </div>
            )}
            {resultat.erreurs.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#e0d6cc] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#e0d6cc] flex items-center gap-2">
                  <span className="text-sm font-bold text-[#1F1B2E]">Lignes en erreur</span>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">{resultat.erreurs.length}</span>
                </div>
                <div className="divide-y divide-[#f0ece8] max-h-60 overflow-y-auto">
                  {resultat.erreurs.map((e, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-[#1F1B2E] w-24 flex-shrink-0">{e.matricule}</span>
                      <span className="text-xs text-red-600">{e.raison}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Tableau des membres importés ── */}
      <div>
        {/* Barre d'outils */}
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-shrink-0">
            <h2 className="text-base font-bold text-[#1F1B2E]">Membres en attente d&apos;activation</h2>
            <span className="text-xs font-bold bg-[#FFB36B]/20 text-[#7A2820] px-2 py-0.5 rounded-full">
              {loadingMembres ? '…' : filteredCount}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Recherche */}
            <input
              type="text"
              placeholder="Rechercher…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="text-sm px-3 py-2 rounded-xl border border-[#e0d6cc] bg-white outline-none focus:border-[#F58A4B] w-52"
            />
            {/* Sélecteur taille de page */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#6b6b78] whitespace-nowrap">Afficher</span>
              <select
                value={perPage}
                onChange={e => handlePerPage(Number(e.target.value))}
                className="text-sm px-2 py-2 rounded-xl border border-[#e0d6cc] bg-white outline-none focus:border-[#F58A4B] cursor-pointer"
              >
                {PAGE_SIZES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className="text-xs text-[#6b6b78]">par page</span>
            </div>
          </div>
        </div>

        {loadingMembres ? (
          <div className="bg-white border border-[#e0d6cc] rounded-2xl py-14 text-center text-sm text-[#6b6b78]">
            Chargement…
          </div>
        ) : (
          <DataTable
            table={table}
            page={page}
            perPage={perPage}
            onPageChange={setPage}
            totalItems={filteredCount}
            emptyMessage={search ? 'Aucun résultat pour cette recherche.' : 'Aucun membre importé pour l\'instant.'}
            hideOnMobile={false}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'green' | 'blue' | 'amber' | 'red' }) {
  const styles = {
    green: 'bg-green-50 border-green-200 text-green-700',
    blue:  'bg-blue-50  border-blue-200  text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red:   'bg-red-50   border-red-200   text-red-700',
  };
  return (
    <div className={`rounded-xl border px-3 py-3 text-center ${styles[color]}`}>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide mt-0.5 opacity-80">{label}</div>
    </div>
  );
}
