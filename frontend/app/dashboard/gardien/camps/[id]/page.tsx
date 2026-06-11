'use client';
import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { campsApi, contactsApi, messagingApi } from '@/lib/api';
import { Pill, Card, SectionTitle, InfoBanner } from '@/components/ui';
import { CampPhotosSection } from '@/components/camps/CampPhotosSection';
import type { Camp } from '@/types';
import type { ContactUser } from '@/types';

export default function GardienCampDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [camp, setCamp] = useState<Camp | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);

  useEffect(() => {
    campsApi.get(id)
      .then(r => setCamp(r.data as Camp))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleContactGuide = useCallback(async () => {
    setContacting(true);
    try {
      const { data: members } = await contactsApi.parish();
      const guide = (members as ContactUser[]).find(m => m.role === 'GUIDE');
      if (!guide) return;
      const { data: conv } = await messagingApi.createPrivate(guide.id);
      router.push(`/dashboard/gardien/messages/${conv.id}`);
    } catch {
      /* ignore */
    } finally {
      setContacting(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#6b6b78] text-sm">
        Chargement…
      </div>
    );
  }

  if (!camp) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#6b6b78] text-sm">
        <div className="text-center">
          <div className="text-3xl mb-2">⛺</div>
          <p>Camp introuvable.</p>
        </div>
      </div>
    );
  }

  const dateStr = `${new Date(camp.dateDebut).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  })} – ${new Date(camp.dateFin).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;

  const STATUS_LABELS: Record<string, { label: string; variant: 'vert' | 'or' | 'gris' | 'rouge' }> = {
    BROUILLON: { label: '● Brouillon', variant: 'gris' },
    OUVERT:    { label: '✓ Ouvert',    variant: 'vert' },
    EN_COURS:  { label: '▶ En cours',  variant: 'or' },
    CLOTURE:   { label: '✕ Clôturé',   variant: 'gris' },
    ARCHIVE:   { label: '✕ Archivé',   variant: 'gris' },
  };
  const status = STATUS_LABELS[camp.statut] ?? { label: camp.statut, variant: 'gris' as const };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      {/* Hero */}
      <div
        className="h-56 relative text-white overflow-hidden"
        style={{
          background: 'linear-gradient(180deg,#FFB36B 0%,#F58A4B 40%,#E55A35 70%,#7A2820 100%)',
        }}
      >
        <div
          className="absolute top-8 right-12 w-14 h-14 rounded-full"
          style={{
            background: 'radial-gradient(circle,#FFF3D6,#FFE0A8)',
            boxShadow: '0 0 40px rgba(255,224,168,.6)',
          }}
        />
        <svg
          className="absolute bottom-0 left-0 right-0 w-full h-24"
          viewBox="0 0 390 90"
          preserveAspectRatio="none"
        >
          <polygon
            points="0,90 70,30 130,55 200,20 260,45 320,25 390,50 390,90"
            fill="#7A2820"
            opacity=".75"
          />
          <polygon
            points="0,90 50,55 110,70 180,40 240,60 300,50 360,65 390,55 390,90"
            fill="#3a0e0a"
          />
        </svg>
        <button
          onClick={() => router.back()}
          className="absolute top-3 left-3.5 z-10 w-9 h-9 rounded-full flex items-center justify-center text-base bg-black/40"
        >
          ‹
        </button>
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="flex gap-2 mb-2">
            <Pill variant={status.variant} solid>
              {status.label}
            </Pill>
            {camp.type && (
              <Pill variant="gris" solid>
                {camp.type}
              </Pill>
            )}
          </div>
          <h2 className="text-xl font-black" style={{ textShadow: '0 2px 6px rgba(0,0,0,.4)' }}>
            {camp.nom}
          </h2>
          {camp.theme && <p className="text-xs opacity-90 mt-1">{camp.theme}</p>}
        </div>
      </div>

      <div className="p-4 lg:p-8 lg:max-w-3xl lg:mx-auto">
        {/* Meta stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
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
          Sélection ouverte jusqu&apos;au 30 juin. Contacte ton Guide paroissial pour t&apos;inscrire.
        </InfoBanner>

        {/* Districts */}
        {camp.districts && camp.districts.length > 0 && (
          <>
            <SectionTitle>Districts concernés</SectionTitle>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {camp.districts.map(({ district }) => (
                <Pill key={district.id} variant="violet">
                  {district.nom}
                </Pill>
              ))}
            </div>
          </>
        )}

        {/* Description */}
        {camp.description && (
          <>
            <SectionTitle>Description</SectionTitle>
            <p className="text-sm text-[#6b6b78] leading-relaxed mb-4">{camp.description}</p>
          </>
        )}

        {/* Participants */}
        {camp._count && (
          <Card className="text-center mb-4">
            <div className="text-2xl font-black text-[#6A1B9A]">
              {camp._count.participants}
            </div>
            <div className="text-xs text-[#6b6b78] uppercase tracking-wide mt-0.5">
              Participants sélectionnés
            </div>
          </Card>
        )}

        {/* CTA Gardien */}
        <div className="bg-[#e8f5e9] border border-[#2E7D32]/30 rounded-2xl p-4">
          <div className="flex gap-2 items-start mb-3">
            <span className="text-base flex-shrink-0">🛡️</span>
            <div>
              <p className="text-sm font-semibold text-[#1F1B2E]">Intéressé(e) par ce camp ?</p>
              <p className="text-xs text-[#6b6b78] mt-0.5 leading-relaxed">
                Contacte ton Guide paroissial via la messagerie pour te faire sélectionner.
              </p>
            </div>
          </div>
          <button
            onClick={handleContactGuide}
            disabled={contacting}
            className="block w-full text-center bg-[#2E7D32] text-white font-bold text-sm py-3 rounded-xl disabled:opacity-60"
          >
            {contacting ? 'Ouverture…' : '💬 Contacter mon Guide'}
          </button>
        </div>

        <CampPhotosSection campId={id} />
      </div>
    </div>
  );
}
