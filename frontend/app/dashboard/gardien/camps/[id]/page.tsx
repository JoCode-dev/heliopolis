'use client';
import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { campsApi } from '@/lib/api';
import { Pill, Card, SectionTitle, InfoBanner } from '@/components/ui';
import { CampPhotosSection } from '@/components/camps/CampPhotosSection';
import { toast } from '@/store/toast';
import type { Camp, ParticipationStatus } from '@/types';

interface MyParticipation {
  id: string;
  participationStatus: ParticipationStatus;
  selectedAt: string;
}

interface ParticipationCTAProps {
  camp: Camp;
  participation: MyParticipation | null | undefined;
  actionLoading: boolean;
  ctaError: string | null;
  onExpressInterest: () => void;
  onWithdraw: () => void;
  onNavigate: (path: string) => void;
}

function ParticipationCTA({ camp, participation, actionLoading, ctaError, onExpressInterest, onWithdraw }: ParticipationCTAProps) {
  const status = participation?.participationStatus;
  const selectionOpen = camp.selectionOuverte && camp.statut === 'OUVERT';

  if (participation === undefined) return null;

  if (status === 'SELECTIONNE' || status === 'CONFIRME') {
    return (
      <div className="bg-[#e8f5e9] border border-[#2E7D32]/40 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2E7D32] flex items-center justify-center text-white text-lg flex-shrink-0">✓</div>
          <div>
            <p className="text-sm font-bold text-[#2E7D32]">
              {status === 'CONFIRME' ? 'Participation confirmée' : 'Tu es sélectionné(e)'}
            </p>
            <p className="text-xs text-[#6b6b78] mt-0.5">
              {status === 'CONFIRME' ? 'Tout est prêt — rendez-vous au camp !' : "Ton Guide t'a sélectionné(e) pour ce camp."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'PRESENT') {
    return (
      <div className="bg-[#e3f2fd] border border-[#1565C0]/30 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1565C0] flex items-center justify-center text-white text-lg flex-shrink-0">⛺</div>
          <div>
            <p className="text-sm font-bold text-[#1565C0]">Présence confirmée</p>
            <p className="text-xs text-[#6b6b78] mt-0.5">Tu es marqué(e) présent(e) à ce camp.</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'EN_ATTENTE') {
    return (
      <div className="bg-[#fff8e1] border border-[#F9A825]/40 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#F9A825] flex items-center justify-center text-white flex-shrink-0">
            <span className="text-sm">⏳</span>
          </div>
          <div>
            <p className="text-sm font-bold text-[#E65100]">Demande envoyée</p>
            <p className="text-xs text-[#6b6b78] mt-0.5">En attente de validation par ton Guide paroissial.</p>
          </div>
        </div>
        <button
          onClick={onWithdraw}
          disabled={actionLoading}
          className="block w-full text-center border border-[#E65100]/50 text-[#E65100] font-semibold text-sm py-2.5 rounded-xl disabled:opacity-60 hover:bg-[#E65100]/5 transition-colors"
        >
          {actionLoading ? 'Annulation…' : 'Annuler ma demande'}
        </button>
      </div>
    );
  }

  if (status === 'BLOQUE') {
    return (
      <div className="bg-[#fce4ec] border border-[#C62828]/30 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#C62828] flex items-center justify-center text-white flex-shrink-0">✕</div>
          <div>
            <p className="text-sm font-bold text-[#C62828]">Participation non disponible</p>
            <p className="text-xs text-[#6b6b78] mt-0.5">Contacte ton Guide pour plus d&apos;informations.</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'DESISTE' || status === 'ABSENT') {
    return (
      <div className="bg-[#f3f3f5] border border-[#c8c8d0] rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#9b9ba8] flex items-center justify-center text-white flex-shrink-0 text-sm">↩</div>
          <div>
            <p className="text-sm font-semibold text-[#4a4a55]">
              {status === 'DESISTE' ? "Tu t'es désisté(e)" : 'Absent(e) à ce camp'}
            </p>
            <p className="text-xs text-[#6b6b78] mt-0.5">
              {selectionOpen ? 'La sélection est encore ouverte.' : 'La sélection est fermée.'}
            </p>
          </div>
        </div>
        {selectionOpen && status === 'DESISTE' && (
          <button
            onClick={onExpressInterest}
            disabled={actionLoading}
            className="block w-full text-center bg-[#1F1B2E] text-white font-bold text-sm py-3 rounded-xl disabled:opacity-60"
          >
            {actionLoading ? 'Envoi…' : 'Manifester à nouveau mon intérêt'}
          </button>
        )}
      </div>
    );
  }

  if (!selectionOpen) {
    return (
      <div className="bg-[#f3f3f5] border border-[#e0e0e8] rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#e0e0e8] flex items-center justify-center text-[#6b6b78] flex-shrink-0 text-base">🔒</div>
          <div>
            <p className="text-sm font-semibold text-[#4a4a55]">Sélection fermée</p>
            <p className="text-xs text-[#6b6b78] mt-0.5">Les inscriptions pour ce camp ne sont plus ouvertes.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-[#2E7D32]/30">
      <div className="bg-[#e8f5e9] p-4">
        <div className="flex gap-2 items-start mb-3">
          <span className="text-base flex-shrink-0">🛡️</span>
          <div>
            <p className="text-sm font-semibold text-[#1F1B2E]">Intéressé(e) par ce camp ?</p>
            <p className="text-xs text-[#6b6b78] mt-0.5 leading-relaxed">
              Manifeste ton intérêt — ton Guide paroissial pourra te sélectionner.
            </p>
          </div>
        </div>
        <button
          onClick={onExpressInterest}
          disabled={actionLoading}
          className="block w-full text-center bg-[#2E7D32] text-white font-bold text-sm py-3 rounded-xl disabled:opacity-60 transition-opacity"
        >
          {actionLoading
            ? <span className="flex items-center justify-center gap-2"><span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin inline-block" />Envoi en cours…</span>
            : '✋ Manifester mon intérêt'}
        </button>
      </div>
      {ctaError && (
        <div className="bg-[#fce4ec] border-t border-[#C62828]/20 px-4 py-3 flex items-start gap-2">
          <span className="text-[#C62828] flex-shrink-0 text-sm">✕</span>
          <p className="text-xs text-[#C62828] leading-relaxed">{ctaError}</p>
        </div>
      )}
    </div>
  );
}

export default function GardienCampDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [camp, setCamp] = useState<Camp | null>(null);
  const [loading, setLoading] = useState(true);
  const [participation, setParticipation] = useState<MyParticipation | null | undefined>(undefined);
  const [actionLoading, setActionLoading] = useState(false);
  const [ctaError, setCtaError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      campsApi.get(id),
      campsApi.myParticipation(id).catch(() => ({ data: null })),
    ]).then(([campRes, partRes]) => {
      setCamp(campRes.data as Camp);
      setParticipation((partRes.data as MyParticipation | null) ?? null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const apiError = (err: unknown): string => {
    const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg[0] ?? 'Erreur inconnue.';
    return 'Une erreur est survenue, réessaie.';
  };

  const handleExpressInterest = useCallback(async () => {
    setActionLoading(true);
    setCtaError(null);
    try {
      const { data } = await campsApi.expressInterest(id);
      setParticipation(data as MyParticipation);
      toast.success('Demande envoyée — ton Guide sera notifié.');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg = apiError(err);
      if (status === 403 || status === 400) {
        setCtaError(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setActionLoading(false);
    }
  }, [id]);

  const handleWithdraw = useCallback(async () => {
    setActionLoading(true);
    setCtaError(null);
    try {
      await campsApi.withdrawInterest(id);
      setParticipation(null);
      toast.success('Demande annulée.');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setActionLoading(false);
    }
  }, [id]);

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

      <div className="p-4 lg:p-8 lg:max-w-6xl lg:mx-auto">
        <div className="lg:grid lg:grid-cols-[2fr_3fr] lg:gap-8 lg:items-start">
          {/* Colonne gauche — infos */}
          <div>
            {/* Meta stats */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
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

            {/* CTA Gardien — statut de participation */}
            <ParticipationCTA
              camp={camp}
              participation={participation}
              actionLoading={actionLoading}
              ctaError={ctaError}
              onExpressInterest={handleExpressInterest}
              onWithdraw={handleWithdraw}
              onNavigate={router.push}
            />
          </div>

          {/* Colonne droite — publications */}
          <div className="mt-6 lg:mt-0">
            <CampPhotosSection campId={id} singleColumn />
          </div>
        </div>
      </div>
    </div>
  );
}
