'use client';
import Link from 'next/link';
import Image from 'next/image';
import type { Camp, CampStatus } from '@/types';
import { formatDateFr } from '@/lib/format';
import { Pill } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:4000';

const STATUS_LABELS: Record<CampStatus, { label: string; variant: 'vert' | 'or' | 'gris' | 'rouge' }> = {
  BROUILLON: { label: '● Brouillon', variant: 'gris' },
  OUVERT:    { label: '✓ Ouvert',    variant: 'vert' },
  EN_COURS:  { label: '▶ En cours',  variant: 'or' },
  CLOTURE:   { label: '✕ Clôturé',   variant: 'gris' },
  ARCHIVE:   { label: '✕ Archivé',   variant: 'gris' },
};

const TYPE_LABELS: Record<string, string> = {
  REGIONAL: 'Régional', DISTRICT: 'District',
  PAROISSIAL: 'Paroissial', NATIONAL: 'National', COMMUNAUTE: 'Communauté',
};

export function CampCard({ camp, href }: { camp: Camp; href?: string }) {
  const status   = STATUS_LABELS[camp.statut];
  const imageUrl = camp.imageUrl
    ? camp.imageUrl.startsWith('http') ? camp.imageUrl : `${API_BASE}${camp.imageUrl}`
    : null;
  const enCours  = camp.statut === 'EN_COURS';

  return (
    <Link
      href={href ?? `/camps/${camp.id}`}
      className={`block rounded-2xl overflow-hidden bg-white shadow-sm border mb-3.5 active:scale-[.98] transition-transform ${
        enCours ? 'border-[#D9A441] ring-1 ring-[#D9A441]/30' : 'border-[#ececf0]'
      }`}
    >
      {/* Hero */}
      <div className="h-28 relative overflow-hidden">
        {imageUrl ? (
          <>
            <Image src={imageUrl} alt={camp.nom} fill className="object-cover" sizes="448px" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </>
        ) : (
          <>
            <div style={{ background: 'linear-gradient(180deg,#FFB36B 0%,#F58A4B 50%,#7A2820 100%)' }} className="absolute inset-0" />
            <svg className="absolute bottom-0 left-0 right-0 w-full h-10" viewBox="0 0 390 40" preserveAspectRatio="none">
              <polygon points="0,40 60,15 110,28 170,8 230,25 290,13 340,22 390,10 390,40" fill="#7A2820" opacity=".7"/>
              <polygon points="0,40 40,25 100,32 160,20 220,30 280,22 340,30 390,20 390,40" fill="#3a0e0a" opacity=".85"/>
            </svg>
          </>
        )}
        <div className="absolute top-2.5 left-2.5 z-10 flex gap-1.5 flex-wrap">
          <Pill variant={status.variant} solid>{status.label}</Pill>
          {enCours && (
            <span className="inline-flex items-center gap-1 bg-black/40 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9A441] animate-pulse" />Live
            </span>
          )}
        </div>
        {camp.theme && (
          <div className="absolute bottom-2 left-3.5 z-10 text-white text-[10px] uppercase tracking-wide opacity-90 font-semibold">
            {camp.theme}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3.5">
        <h3 className="font-bold text-[15px] text-[#1F1B2E] mb-1.5">{camp.nom}</h3>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6b6b78]">
          {camp.lieu       && <span>📍 {camp.lieu}</span>}
          {camp.dateDebut  && (
            <span>
              📅 {formatDateFr(camp.dateDebut, { day: 'numeric', month: 'short' })}
              {' – '}
              {formatDateFr(camp.dateFin, { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
          {camp.type       && <span>🏷 {TYPE_LABELS[camp.type]}</span>}
          {camp._count     && <span>👥 {camp._count.participants} participant{camp._count.participants !== 1 ? 's' : ''}</span>}
        </div>
      </div>
    </Link>
  );
}
