'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { campsApi } from '@/lib/api';
import type { Camp, CampStatus } from '@/types';

const STATUS_TABS: { label: string; value: CampStatus | 'TOUS'; dot?: string }[] = [
  { label: 'Tous',       value: 'TOUS'      },
  { label: 'Ouverts',   value: 'OUVERT',    dot: 'bg-[#2E7D32]' },
  { label: 'En cours',  value: 'EN_COURS',  dot: 'bg-[#D9A441]' },
  { label: 'Clôturés',  value: 'CLOTURE',   dot: 'bg-[#E55A35]' },
  { label: 'Brouillons',value: 'BROUILLON', dot: 'bg-[#9b9ba8]' },
];

const STATUS_STYLE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  OUVERT:    { label: '✓ Ouvert',    bg: 'bg-[#e8f5e9]', text: 'text-[#2E7D32]', border: 'border-[#a5d6a7]' },
  EN_COURS:  { label: '● En cours',  bg: 'bg-[#fff8e1]', text: 'text-[#D9A441]', border: 'border-[#ffe082]' },
  CLOTURE:   { label: '✕ Clôturé',   bg: 'bg-[#ffebee]', text: 'text-[#E55A35]', border: 'border-[#ef9a9a]' },
  BROUILLON: { label: '… Brouillon', bg: 'bg-[#f5f5f5]', text: 'text-[#6b6b78]', border: 'border-[#e0e0e0]' },
  ARCHIVE:   { label: 'Archivé',     bg: 'bg-[#f5f5f5]', text: 'text-[#9b9ba8]', border: 'border-[#e0e0e0]' },
};

const TYPE_STYLE: Record<string, { label: string; color: string }> = {
  REGIONAL:  { label: 'Régional',   color: 'text-[#6A1B9A]' },
  NATIONAL:  { label: 'National',   color: 'text-[#E55A35]' },
  DISTRICT:  { label: 'District',   color: 'text-[#D9A441]' },
  PAROISSIAL:{ label: 'Paroissial', color: 'text-[#2E7D32]' },
  COMMUNAUTE:{ label: 'Communauté', color: 'text-[#6b6b78]' },
};

const LEFT_BORDER: Record<string, string> = {
  OUVERT:    'border-l-[#2E7D32]',
  EN_COURS:  'border-l-[#D9A441]',
  CLOTURE:   'border-l-[#E55A35]',
  BROUILLON: 'border-l-[#9b9ba8]',
  ARCHIVE:   'border-l-[#e0e0e0]',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function CampsRegionauxPage() {
  const [camps, setCamps]       = useState<Camp[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<CampStatus | 'TOUS'>('TOUS');

  useEffect(() => {
    campsApi.list()
      .then(r => setCamps(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === 'TOUS' ? camps : camps.filter(c => c.statut === tab);

  // Comptes par statut pour les badges
  const count = (s: CampStatus | 'TOUS') =>
    s === 'TOUS' ? camps.length : camps.filter(c => c.statut === s).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-white border-b border-[#ececf0] px-4 pt-4 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-black text-[#1F1B2E]">⛺ Camps régionaux</h1>
          <Link href="/dashboard/region/camps/nouveau"
            className="flex items-center gap-1.5 bg-[#E55A35] text-white font-bold text-xs px-3.5 py-2 rounded-xl hover:bg-[#b51d1d] transition-colors shadow-sm">
            + Nouveau
          </Link>
        </div>

        {/* Filtres scrollables */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {STATUS_TABS.map(t => {
            const n = count(t.value);
            const active = tab === t.value;
            return (
              <button key={t.value} onClick={() => setTab(t.value)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider relative transition-colors ${
                  active ? 'text-[#1F1B2E]' : 'text-[#9b9ba8]'
                }`}>
                {t.dot && <span className={`w-1.5 h-1.5 rounded-full ${active ? t.dot : 'bg-[#d0d0d8]'}`} />}
                {t.label}
                {n > 0 && (
                  <span className={`text-[10px] font-black ${active ? 'text-[#1F1B2E]' : 'text-[#c0c0cc]'}`}>
                    {n}
                  </span>
                )}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E55A35] rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Liste ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f6f6fa] px-3 py-3 lg:px-6 lg:py-4">

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-[#9b9ba8]">
            <div className="text-4xl animate-pulse mb-3">⛺</div>
            <p className="text-sm">Chargement…</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[#9b9ba8]">
            <div className="text-4xl mb-3">⛺</div>
            <p className="font-semibold text-sm text-[#1F1B2E]">Aucun camp</p>
            <p className="text-xs mt-1">
              {tab === 'TOUS' ? 'Créez votre premier camp.' : 'Essayez un autre filtre.'}
            </p>
            {tab === 'TOUS' && (
              <Link href="/dashboard/region/camps/nouveau"
                className="mt-4 px-5 py-2 bg-[#E55A35] text-white text-xs font-bold rounded-xl">
                + Nouveau camp
              </Link>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-4">
          {filtered.map(camp => {
            const st    = STATUS_STYLE[camp.statut] ?? STATUS_STYLE.ARCHIVE;
            const tp    = TYPE_STYLE[camp.type] ?? { label: camp.type, color: 'text-[#6b6b78]' };
            const parts = camp._count?.participants ?? 0;
            const isActive = camp.statut === 'EN_COURS';

            return (
              <div key={camp.id}
                className={`bg-white rounded-2xl border border-[#ececf0] border-l-4 ${LEFT_BORDER[camp.statut] ?? 'border-l-[#e0e0e0]'} overflow-hidden shadow-sm`}>

                {/* Corps de la carte */}
                <div className="px-4 pt-3.5 pb-3">
                  {/* Titre + badges */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <Link href={`/dashboard/region/camps/${camp.id}`}
                      className="font-bold text-[15px] text-[#1F1B2E] leading-tight flex-1 min-w-0 hover:text-[#E55A35] transition-colors">
                      {camp.nom}
                    </Link>
                    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${st.bg} ${st.text} ${st.border}`}>
                      {st.label}
                    </span>
                  </div>

                  {/* Type + thème */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className={`text-[11px] font-bold ${tp.color}`}>{tp.label}</span>
                    {camp.theme && (
                      <>
                        <span className="text-[#d0d0d8]">·</span>
                        <span className="text-[11px] text-[#9b9ba8] truncate">{camp.theme}</span>
                      </>
                    )}
                  </div>

                  {/* Dates + lieu sur une ligne */}
                  <div className="flex items-center gap-3 text-[11px] text-[#6b6b78] mb-3">
                    <span>📅 {fmtDate(camp.dateDebut)} → {fmtDate(camp.dateFin)}</span>
                    <span className="text-[#d0d0d8]">·</span>
                    <span className="truncate">📍 {camp.lieu}</span>
                  </div>

                  {/* Participants + action */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xl font-black ${isActive ? 'text-[#D9A441]' : 'text-[#1F1B2E]'}`}>
                        {parts}
                      </span>
                      <span className="text-[11px] text-[#9b9ba8]">
                        participant{parts !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <Link href={`/dashboard/region/participants?campId=${camp.id}`}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#6A1B9A] bg-[#EDE7F6] px-3 py-1.5 rounded-lg hover:bg-[#6A1B9A] hover:text-white transition-colors">
                      Participants →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
