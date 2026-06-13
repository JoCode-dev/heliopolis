'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { campsApi } from '@/lib/api';
import type { Camp, CampStatus } from '@/types';

const STATUS_SUIVANT: Partial<Record<CampStatus, { label: string; value: CampStatus }>> = {
  BROUILLON: { label: 'Ouvrir',    value: 'OUVERT'   },
  OUVERT:    { label: 'Démarrer',  value: 'EN_COURS' },
  EN_COURS:  { label: 'Clôturer', value: 'CLOTURE'  },
};

const STATUS_META: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  BROUILLON: { label: 'Brouillon', dot: 'bg-[#9b9ba8]',  text: 'text-[#6b6b78]',  bg: 'bg-[#f5f5f8]',  border: 'border-[#e0e0e8]' },
  OUVERT:    { label: 'Ouvert',    dot: 'bg-[#22c55e]',  text: 'text-[#15803d]',  bg: 'bg-green-50',   border: 'border-green-200' },
  EN_COURS:  { label: 'En cours',  dot: 'bg-[#f59e0b]',  text: 'text-[#b45309]',  bg: 'bg-amber-50',   border: 'border-amber-200' },
  CLOTURE:   { label: 'Clôturé',  dot: 'bg-[#ef4444]',  text: 'text-[#b91c1c]',  bg: 'bg-red-50',     border: 'border-red-200'   },
};

const ACTION_COLOR: Partial<Record<CampStatus, string>> = {
  BROUILLON: 'bg-[#22c55e] hover:bg-[#16a34a] text-white',
  OUVERT:    'bg-[#6A1B9A] hover:bg-[#4a1370] text-white',
  EN_COURS:  'bg-[#ef4444] hover:bg-[#dc2626] text-white',
};

const TYPE_LABEL: Record<string, string> = {
  REGIONAL:  'Régional',
  NATIONAL:  'National',
  DISTRICT:  'District',
  PAROISSE:  'Paroisse',
};

type Filtre = 'TOUS' | 'OUVERT' | 'EN_COURS' | 'BROUILLON';

const FILTRES: { key: Filtre; label: string }[] = [
  { key: 'TOUS',      label: 'Tous'       },
  { key: 'OUVERT',    label: 'Ouverts'    },
  { key: 'EN_COURS',  label: 'En cours'   },
  { key: 'BROUILLON', label: 'Brouillons' },
];

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function GestionCampsPage() {
  const [camps, setCamps]       = useState<Camp[]>([]);
  const [filtre, setFiltre]     = useState<Filtre>('TOUS');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const reload = () => campsApi.list().then(r => setCamps(r.data)).catch(() => {});
  useEffect(() => { reload(); }, []);

  const handleStatusChange = async (id: string, statut: CampStatus) => {
    setUpdatingId(id);
    try { await campsApi.updateStatus(id, statut); reload(); }
    catch { /* ignore */ }
    finally { setUpdatingId(null); }
  };

  const filtered = filtre === 'TOUS' ? camps : camps.filter(c => c.statut === filtre);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-black text-[#1F1B2E]">Gestion des Camps</h1>
          <p className="text-xs text-[#9b9ba8] mt-0.5">
            {camps.length} camp{camps.length !== 1 ? 's' : ''} enregistré{camps.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/dashboard/admin/camps/nouveau"
          className="flex items-center gap-1.5 bg-[#E55A35] text-white font-bold text-sm px-3 py-2 rounded-xl hover:bg-[#c94d2a] transition-colors whitespace-nowrap"
        >
          <span className="text-base leading-none">+</span>
          <span className="hidden sm:inline">Nouveau camp</span>
          <span className="sm:hidden">Nouveau</span>
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-0.5 scrollbar-none">
        {FILTRES.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltre(f.key)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              filtre === f.key
                ? 'bg-[#1F1B2E] text-white'
                : 'bg-white border border-[#e0e0e8] text-[#6b6b78] hover:border-[#1F1B2E] hover:text-[#1F1B2E]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#6b6b78]">
          <div className="text-4xl mb-3">⛺</div>
          <p className="text-sm">Aucun camp dans cette catégorie.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map(camp => {
            const meta    = STATUS_META[camp.statut] ?? STATUS_META.BROUILLON;
            const suivant = STATUS_SUIVANT[camp.statut as CampStatus];
            const isLoading = updatingId === camp.id;

            return (
              <div key={camp.id} className="bg-white rounded-2xl border border-[#ececf0] overflow-hidden shadow-sm">
                {/* Bandeau statut en haut */}
                <div className={`px-4 py-1.5 flex items-center gap-1.5 ${meta.bg} border-b ${meta.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${meta.text}`}>{meta.label}</span>
                </div>

                {/* Corps */}
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-bold text-[#1F1B2E] text-sm leading-snug truncate">{camp.nom}</p>
                      <p className="text-xs text-[#9b9ba8] mt-0.5 truncate">
                        {camp.lieu}
                        {camp.type && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0 rounded-md bg-[#f0f0f4] text-[#6b6b78] text-[10px] font-semibold">
                            {TYPE_LABEL[camp.type] ?? camp.type}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-[#9b9ba8] mb-3">
                    <span>📅</span>
                    <span>{formatDate(camp.dateDebut)}</span>
                    <span>→</span>
                    <span>{formatDate(camp.dateFin)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/admin/camps/${camp.id}`}
                      className="flex-1 text-center border border-[#e6e6ea] text-[#1F1B2E] font-semibold text-xs py-2.5 rounded-xl hover:bg-[#f7f7fb] transition-colors"
                    >
                      Voir détail
                    </Link>
                    {suivant ? (
                      <button
                        onClick={() => handleStatusChange(camp.id, suivant.value)}
                        disabled={isLoading}
                        className={`flex-1 text-center font-bold text-xs py-2.5 rounded-xl disabled:opacity-60 transition-colors ${ACTION_COLOR[camp.statut as CampStatus] ?? 'bg-[#6A1B9A] text-white'}`}
                      >
                        {isLoading ? '…' : suivant.label}
                      </button>
                    ) : (
                      <div className="flex-1 text-center bg-[#f5f5f8] text-[#9b9ba8] font-semibold text-xs py-2.5 rounded-xl">
                        Archivé
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
