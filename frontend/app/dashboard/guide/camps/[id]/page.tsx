'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { campsApi } from '@/lib/api';
import { Pill, Card, SectionTitle, InfoBanner } from '@/components/ui';
import type { Camp, CampParticipant } from '@/types';

export default function GuideCampDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [camp, setCamp] = useState<Camp | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      campsApi.get(id),
      campsApi.participants(id),
    ]).then(([c, p]) => {
      setCamp(c.data);
      setParticipantCount((p.data as CampParticipant[]).length);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="bg-gradient-to-br from-[#C62828] to-[#8e1a1a] text-white px-4 pt-4 pb-4 flex-shrink-0">
          <button onClick={() => router.back()} className="text-sm opacity-80 mb-2">‹ Retour</button>
          <h1 className="text-xl font-bold">Chargement…</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-3xl animate-pulse">⛺</div>
        </div>
      </div>
    );
  }

  if (!camp) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="bg-gradient-to-br from-[#C62828] to-[#8e1a1a] text-white px-4 pt-4 pb-4 flex-shrink-0">
          <button onClick={() => router.back()} className="text-sm opacity-80 mb-2">‹ Retour</button>
          <h1 className="text-xl font-bold">Camp introuvable</h1>
        </div>
        <div className="flex-1 flex items-center justify-center text-[#6b6b78] text-sm">
          Ce camp n&apos;existe pas ou a été supprimé.
        </div>
      </div>
    );
  }

  const dateStr = `${new Date(camp.dateDebut).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long',
  })} – ${new Date(camp.dateFin).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })}`;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Hero */}
      <div
        className="h-52 relative text-white overflow-hidden flex-shrink-0"
        style={{ background: 'linear-gradient(180deg,#FFB36B 0%,#F58A4B 40%,#E55A35 70%,#7A2820 100%)' }}
      >
        <div
          className="absolute top-8 right-12 w-14 h-14 rounded-full"
          style={{ background: 'radial-gradient(circle,#FFF3D6,#FFE0A8)', boxShadow: '0 0 40px rgba(255,224,168,.6)' }}
        />
        <svg className="absolute bottom-0 left-0 right-0 w-full h-24" viewBox="0 0 390 90" preserveAspectRatio="none">
          <polygon points="0,90 70,30 130,55 200,20 260,45 320,25 390,50 390,90" fill="#7A2820" opacity=".75" />
          <polygon points="0,90 50,55 110,70 180,40 240,60 300,50 360,65 390,55 390,90" fill="#3a0e0a" />
        </svg>
        <button
          onClick={() => router.back()}
          className="absolute top-3 left-3.5 z-10 w-9 h-9 rounded-full flex items-center justify-center text-base bg-black/40"
        >
          ‹
        </button>
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="flex gap-2 mb-2">
            <Pill variant="vert" solid>✓ {camp.statut === 'OUVERT' ? 'Ouvert' : camp.statut}</Pill>
            <Pill variant="gris" solid>{camp.type}</Pill>
          </div>
          <h2 className="text-xl font-black" style={{ textShadow: '0 2px 6px rgba(0,0,0,.4)' }}>
            {camp.nom}
          </h2>
          {camp.theme && <p className="text-xs opacity-90 mt-1">{camp.theme}</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8">
        <div className="lg:max-w-3xl lg:mx-auto">
        {/* Bannière guide */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#6A1B9A]/10 to-[#4a1370]/10 border border-[#6A1B9A]/30 rounded-2xl p-3.5 mb-4">
          <span className="text-xl">📋</span>
          <p className="text-xs text-[#4a1370] leading-relaxed flex-1">
            Tu peux sélectionner les participants de ta paroisse pour ce camp.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 mb-4">
          <div className="bg-white rounded-2xl p-3.5 border border-[#ececf0]">
            <div className="text-sm font-medium text-[#1F1B2E]">📅 {dateStr}</div>
            <div className="text-[11px] text-[#6b6b78] uppercase tracking-wide mt-0.5">Période</div>
          </div>
          <div className="bg-white rounded-2xl p-3.5 border border-[#ececf0]">
            <div className="text-sm font-medium text-[#1F1B2E]">📍 {camp.lieu}</div>
            <div className="text-[11px] text-[#6b6b78] uppercase tracking-wide mt-0.5">Lieu</div>
          </div>
        </div>

        <InfoBanner icon="ℹ️">
          Sélection ouverte jusqu&apos;au 30 juin. Les participants soumis sont transmis à la Sentinelle pour validation.
        </InfoBanner>

        {camp.districts && camp.districts.length > 0 && (
          <>
            <SectionTitle>Districts concernés</SectionTitle>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {camp.districts.map(({ district }) => (
                <Pill key={district.id} variant="violet">{district.nom}</Pill>
              ))}
            </div>
          </>
        )}

        {camp.description && (
          <>
            <SectionTitle>Description</SectionTitle>
            <p className="text-sm text-[#6b6b78] leading-relaxed mb-4">{camp.description}</p>
          </>
        )}

        <Card className="text-center mb-4">
          <div className="text-2xl font-black text-[#6A1B9A]">{participantCount}</div>
          <div className="text-xs text-[#6b6b78] uppercase tracking-wide mt-0.5">Participants sélectionnés</div>
        </Card>

        <Link
          href={`/dashboard/guide/selection/${camp.id}`}
          className="block w-full text-center bg-[#6A1B9A] text-white font-bold text-sm py-3.5 rounded-xl"
        >
          📋 Sélectionner les participants
        </Link>

        <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
