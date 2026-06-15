import { notFound } from 'next/navigation';
import Link from 'next/link';
import { campsApi } from '@/lib/api';
import type { Camp, CampType, CampStatus } from '@/types';
import { Pill, Card, SectionTitle } from '@/components/ui';
import { CampAuthCTA } from '@/components/camps/CampAuthCTA';
import { CampPhotosSection } from '@/components/camps/CampPhotosSection';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:4000';

const TYPE_LABEL: Record<CampType, string> = {
  REGIONAL:   'Régional',
  DISTRICT:   'District',
  PAROISSIAL: 'Paroissial',
  NATIONAL:   'National',
  COMMUNAUTE: 'Communauté',
};

const STATUT_CONFIG: Record<CampStatus, { label: string; variant: 'vert' | 'or' | 'rouge' | 'violet' | 'gris' }> = {
  OUVERT:    { label: 'Ouvert',    variant: 'vert'   },
  EN_COURS:  { label: 'En cours',  variant: 'or'     },
  CLOTURE:   { label: 'Clôturé',   variant: 'rouge'  },
  BROUILLON: { label: 'Brouillon', variant: 'gris'   },
  ARCHIVE:   { label: 'Archivé',   variant: 'gris'   },
};

async function getCamp(id: string): Promise<Camp | null> {
  try {
    const { data } = await campsApi.get(id);
    return data as Camp;
  } catch {
    return null;
  }
}

export default async function CampDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const camp = await getCamp(id);
  if (!camp) notFound();

  const dateStr = `${new Date(camp.dateDebut).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long',
  })} – ${new Date(camp.dateFin).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })}`;

  const dureeJours = Math.round(
    (new Date(camp.dateFin).getTime() - new Date(camp.dateDebut).getTime()) / 86400000,
  );

  const statutCfg = STATUT_CONFIG[camp.statut] ?? { label: camp.statut, variant: 'gris' as const };
  const imageUrl  = camp.imageUrl
    ? camp.imageUrl.startsWith('http') ? camp.imageUrl : `${API_BASE}${camp.imageUrl}`
    : null;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden">

      {/* ── Hero ── */}
      <div className="h-60 relative text-white overflow-hidden">

        {/* Fond : image réelle ou dégradé de secours */}
        {imageUrl ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg,#FFB36B 0%,#F58A4B 40%,#E55A35 70%,#7A2820 100%)' }}
            />
            {/* Soleil décoratif */}
            <div
              className="absolute top-8 right-12 w-14 h-14 rounded-full"
              style={{ background: 'radial-gradient(circle,#FFF3D6,#FFE0A8)', boxShadow: '0 0 40px rgba(255,224,168,.6)' }}
            />
            {/* Montagne silhouette */}
            <svg className="absolute bottom-0 left-0 right-0 w-full h-24" viewBox="0 0 390 90" preserveAspectRatio="none">
              <polygon points="0,90 70,30 130,55 200,20 260,45 320,25 390,50 390,90" fill="#7A2820" opacity=".75"/>
              <polygon points="0,90 50,55 110,70 180,40 240,60 300,50 360,65 390,55 390,90" fill="#3a0e0a"/>
            </svg>
          </>
        )}

        {/* Bouton retour */}
        <Link
          href="/camps"
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </Link>

        {/* Infos superposées */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="flex gap-2 mb-2 flex-wrap">
            <Pill variant={statutCfg.variant} solid>
              {camp.statut === 'OUVERT' && '✓ '}{statutCfg.label}
            </Pill>
            <Pill variant="gris" solid>
              {TYPE_LABEL[camp.type] ?? camp.type}
            </Pill>
            {camp.region && (
              <Pill variant="violet" solid>
                🌍 {camp.region.nom}
              </Pill>
            )}
          </div>
          <h2 className="text-xl font-black leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,.5)' }}>
            {camp.nom}
          </h2>
          {camp.theme && (
            <p className="text-xs opacity-85 mt-1 italic">{camp.theme}</p>
          )}
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="p-4">

        {/* Infos principales */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-white rounded-2xl p-3.5 border border-[#ececf0]">
            <div className="text-sm font-semibold text-[#1F1B2E] leading-snug">📅 {dateStr}</div>
            <div className="text-[10px] text-[#6b6b78] uppercase tracking-wide mt-1">Période · {dureeJours} jour{dureeJours > 1 ? 's' : ''}</div>
          </div>
          <div className="bg-white rounded-2xl p-3.5 border border-[#ececf0]">
            <div className="text-sm font-semibold text-[#1F1B2E]">📍 {camp.lieu}</div>
            <div className="text-[10px] text-[#6b6b78] uppercase tracking-wide mt-1">Lieu du camp</div>
          </div>
        </div>

        {/* Bannière sélection — dynamique */}
        {camp.selectionOuverte && camp.statut === 'OUVERT' && (
          <div className="flex items-start gap-3 bg-gradient-to-r from-[#E8F5E9] to-white border border-[#A5D6A7] rounded-2xl p-3.5 mb-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#4CAF50] to-[#2E7D32] rounded-l-2xl" />
            <span className="text-base ml-1 flex-shrink-0">🟢</span>
            <p className="text-xs text-[#1F1B2E] leading-relaxed">
              <strong>Sélections ouvertes.</strong> Contacte ton Guide paroissial pour t&apos;inscrire à ce camp.
            </p>
          </div>
        )}

        {!camp.selectionOuverte && camp.statut === 'OUVERT' && (
          <div className="flex items-start gap-3 bg-gradient-to-r from-[#FFF8E1] to-white border border-[#FFE082] rounded-2xl p-3.5 mb-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#D9A441] to-[#b8852e] rounded-l-2xl" />
            <span className="text-base ml-1 flex-shrink-0">⏳</span>
            <p className="text-xs text-[#1F1B2E] leading-relaxed">
              <strong>Sélections fermées.</strong> Les inscriptions pour ce camp ne sont plus ouvertes.
            </p>
          </div>
        )}

        {camp.statut === 'CLOTURE' && (
          <div className="flex items-start gap-3 bg-gradient-to-r from-[#FFEBEE] to-white border border-[#EF9A9A] rounded-2xl p-3.5 mb-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#C62828] to-[#8e1a1a] rounded-l-2xl" />
            <span className="text-base ml-1 flex-shrink-0">🔒</span>
            <p className="text-xs text-[#1F1B2E] leading-relaxed">
              Ce camp est désormais <strong>clôturé</strong>. Consulte les prochains camps disponibles.
            </p>
          </div>
        )}

        {/* Districts concernés */}
        {camp.districts && camp.districts.length > 0 && (
          <>
            <SectionTitle>Districts concernés</SectionTitle>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {camp.districts.map(({ district }) => (
                <Pill key={district.id} variant="violet">🛡️ {district.nom}</Pill>
              ))}
            </div>
          </>
        )}

        {/* Description */}
        {camp.description && (
          <>
            <SectionTitle>Description</SectionTitle>
            <p className="text-sm text-[#6b6b78] leading-relaxed mb-4 whitespace-pre-line">
              {camp.description}
            </p>
          </>
        )}

        {/* Participants */}
        {camp._count !== undefined && (
          <Card className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6A1B9A] to-[#4a1370] flex items-center justify-center text-white font-black text-lg flex-shrink-0">
              {camp._count.participants}
            </div>
            <div>
              <div className="text-sm font-bold text-[#1F1B2E]">
                {camp._count.participants === 0
                  ? 'Aucun participant sélectionné'
                  : `${camp._count.participants} participant${camp._count.participants > 1 ? 's' : ''} sélectionné${camp._count.participants > 1 ? 's' : ''}`}
              </div>
              <div className="text-xs text-[#6b6b78] mt-0.5">Pour ce camp</div>
            </div>
          </Card>
        )}

        {/* CTA adaptatif selon le rôle */}
        <CampAuthCTA campId={camp.id} campNom={camp.nom} />

        {/* Galerie photos du camp */}
        <CampPhotosSection campId={camp.id} />
      </div>
    </div>
  );
}
