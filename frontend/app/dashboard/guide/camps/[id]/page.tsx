'use client';
import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { campsApi } from '@/lib/api';
import { Pill, Card, SectionTitle, InfoBanner } from '@/components/ui';
import { CampPhotosSection } from '@/components/camps/CampPhotosSection';
import { useAuthStore } from '@/store/auth';
import type { Camp, CampParticipant, AutorisationSortie } from '@/types';

const STATUT_AUTO = {
  EN_ATTENTE: { label: 'En attente', color: 'bg-[#fff3d6] text-[#9c7218]' },
  APPROUVEE:  { label: 'Approuvée',  color: 'bg-[#e1f4e3] text-[#2E7D32]' },
  REFUSEE:    { label: 'Refusée',    color: 'bg-[#fde8e8] text-[#E55A35]' },
} as const;

type MyParticipationStatus = 'EN_ATTENTE' | 'SELECTIONNE' | 'CONFIRME' | 'PRESENT' | 'DESISTE' | 'BLOQUE' | null;

const MY_PART_CFG: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  EN_ATTENTE:  { label: 'Demande en attente de validation', icon: '⏳', bg: 'bg-[#fff8e6] border-[#ffe082]',   text: 'text-[#9c7218]' },
  SELECTIONNE: { label: 'Participation acceptée',           icon: '✓',  bg: 'bg-[#e8f5e9] border-[#a5d6a7]',  text: 'text-[#2E7D32]' },
  CONFIRME:    { label: 'Participation confirmée',          icon: '✓✓', bg: 'bg-[#e8f5e9] border-[#a5d6a7]',  text: 'text-[#2E7D32]' },
  PRESENT:     { label: 'Présent au camp',                  icon: '✓',  bg: 'bg-[#e8f5e9] border-[#a5d6a7]',  text: 'text-[#2E7D32]' },
  BLOQUE:      { label: 'Participation non disponible',     icon: '🚫', bg: 'bg-[#fde8e8] border-[#ef9a9a]',  text: 'text-[#C62828]' },
};

export default function GuideCampDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const isSentinelle = user?.role === 'SENTINELLE';
  const isGuide      = user?.role === 'GUIDE';

  const [camp, setCamp] = useState<Camp | null>(null);
  const [participants, setParticipants] = useState<CampParticipant[]>([]);
  const [autorisations, setAutorisations] = useState<AutorisationSortie[]>([]);
  const [myPartStatus, setMyPartStatus] = useState<MyParticipationStatus>(null);
  const [partLoading, setPartLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal autorisation
  const [showModal, setShowModal] = useState(false);
  const [motif, setMotif] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const reload = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([
        campsApi.get(id),
        campsApi.participants(id),
      ]);
      setCamp(c.data);
      setParticipants(p.data as CampParticipant[]);

      if (isSentinelle) {
        const a = await campsApi.autorisations(id);
        setAutorisations(a.data as AutorisationSortie[]);
      }
      if (isGuide || isSentinelle) {
        const mp = await campsApi.myParticipation(id);
        setMyPartStatus((mp.data as { participationStatus: MyParticipationStatus } | null)?.participationStatus ?? null);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id, isSentinelle, isGuide]);

  useEffect(() => { void reload(); }, [reload]);

  const togglePerson = (userId: string) => {
    setSelectedIds(prev =>
      prev.includes(userId) ? prev.filter(i => i !== userId) : [...prev, userId],
    );
  };

  const handleExpressInterest = async () => {
    setPartLoading(true);
    try {
      const res = await campsApi.expressInterest(id);
      setMyPartStatus((res.data as { participationStatus: MyParticipationStatus })?.participationStatus ?? (isSentinelle ? 'SELECTIONNE' : 'EN_ATTENTE'));
    } catch { /* ignore */ } finally { setPartLoading(false); }
  };

  const handleWithdraw = async () => {
    setPartLoading(true);
    try {
      await campsApi.withdrawInterest(id);
      setMyPartStatus(null);
    } catch { /* ignore */ } finally { setPartLoading(false); }
  };

  const handleSubmitAutorisation = async () => {
    if (!motif.trim()) { setModalError('Le motif est obligatoire.'); return; }
    if (selectedIds.length === 0) { setModalError('Sélectionnez au moins une personne.'); return; }
    setSubmitting(true);
    setModalError('');
    try {
      await campsApi.createAutorisation(id, { motif: motif.trim(), personneIds: selectedIds });
      setShowModal(false);
      setMotif('');
      setSelectedIds([]);
      await reload();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setModalError(msg ?? 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] text-white px-4 pt-4 pb-4 flex-shrink-0">
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
        <div className="bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] text-white px-4 pt-4 pb-4 flex-shrink-0">
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

  const campEnCours = camp.statut === 'EN_COURS';
  const enAttente = autorisations.filter(a => a.statut === 'EN_ATTENTE').length;

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
        <div className="lg:max-w-6xl lg:mx-auto">
          <div className="lg:grid lg:grid-cols-[2fr_3fr] lg:gap-8 lg:items-start">

            {/* Colonne gauche — infos */}
            <div>
              {/* Bannière contextuelle */}
              <div className="flex items-center gap-3 bg-gradient-to-r from-[#6A1B9A]/10 to-[#4a1370]/10 border border-[#6A1B9A]/30 rounded-2xl p-3.5 mb-4">
                <span className="text-xl">{isSentinelle ? '🛡️' : '📋'}</span>
                <p className="text-xs text-[#4a1370] leading-relaxed flex-1">
                  {isSentinelle
                    ? 'En tant que Sentinelle, tu peux gérer les participants et demander des autorisations de sortie au Régional.'
                    : 'Tu peux sélectionner les participants de ta paroisse pour ce camp.'}
                </p>
              </div>

              {/* Stats */}
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

              {/* ── Ma participation personnelle (Guide + Sentinelle) ── */}
              {(isGuide || isSentinelle) && camp.selectionOuverte && (
                <div className="rounded-2xl border overflow-hidden mb-4">
                  <div className="px-4 py-2.5 bg-[#1F1B2E] flex items-center gap-2">
                    <span className="text-white text-xs font-bold uppercase tracking-wide">Ma participation</span>
                  </div>
                  <div className="px-4 py-3 bg-white">
                    {myPartStatus && MY_PART_CFG[myPartStatus] ? (
                      <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 mb-3 ${MY_PART_CFG[myPartStatus].bg}`}>
                        <span className="text-lg">{MY_PART_CFG[myPartStatus].icon}</span>
                        <span className={`text-xs font-semibold ${MY_PART_CFG[myPartStatus].text}`}>
                          {MY_PART_CFG[myPartStatus].label}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-[#6b6b78] mb-3">
                        {isSentinelle
                          ? 'Tu n\'as pas encore marqué ta participation à ce camp.'
                          : 'Tu n\'as pas encore demandé à participer à ce camp.'}
                      </p>
                    )}
                    {(!myPartStatus || myPartStatus === 'DESISTE') && (
                      <button
                        type="button"
                        onClick={handleExpressInterest}
                        disabled={partLoading}
                        className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#1F1B2E,#4a1370)' }}
                      >
                        {partLoading ? 'Envoi…' : isSentinelle ? '✓ Marquer ma participation' : '🙋 Demander à participer'}
                      </button>
                    )}
                    {/* Guide : retirer uniquement si EN_ATTENTE */}
                    {isGuide && myPartStatus === 'EN_ATTENTE' && (
                      <button
                        type="button"
                        onClick={handleWithdraw}
                        disabled={partLoading}
                        className="w-full py-2 rounded-xl text-xs font-semibold text-[#9c7218] bg-[#fff3d6] border border-[#ffe082] hover:bg-[#ffe08280] transition-colors disabled:opacity-50"
                      >
                        {partLoading ? '…' : 'Retirer ma demande'}
                      </button>
                    )}
                    {/* Sentinelle : retirer si SELECTIONNE ou CONFIRME */}
                    {isSentinelle && (myPartStatus === 'SELECTIONNE' || myPartStatus === 'CONFIRME') && (
                      <button
                        type="button"
                        onClick={handleWithdraw}
                        disabled={partLoading}
                        className="w-full py-2 rounded-xl text-xs font-semibold text-[#9c7218] bg-[#fff3d6] border border-[#ffe082] hover:bg-[#ffe08280] transition-colors disabled:opacity-50"
                      >
                        {partLoading ? '…' : 'Retirer ma participation'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!isSentinelle && (
                <InfoBanner icon="ℹ️">
                  Sélection ouverte jusqu&apos;au 30 juin. Les participants soumis sont transmis à la Sentinelle pour validation.
                </InfoBanner>
              )}

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
                <div className="text-2xl font-black text-[#6A1B9A]">{participants.length}</div>
                <div className="text-xs text-[#6b6b78] uppercase tracking-wide mt-0.5">Participants sélectionnés</div>
              </Card>

              <Link
                href={`/dashboard/guide/selection/${camp.id}`}
                className="block w-full text-center bg-[#6A1B9A] text-white font-bold text-sm py-3.5 rounded-xl mb-4"
              >
                📋 Sélectionner les participants
              </Link>

              {/* ── Section Autorisations de sortie (Sentinelle uniquement) ── */}
              {isSentinelle && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <SectionTitle className="mb-0">
                      Autorisations de sortie
                      {enAttente > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-[#fff3d6] text-[#9c7218] text-[10px] font-bold">
                          {enAttente} en attente
                        </span>
                      )}
                    </SectionTitle>
                    {campEnCours && (
                      <button
                        onClick={() => setShowModal(true)}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#F58A4B,#E55A35)' }}
                      >
                        + Demander
                      </button>
                    )}
                  </div>

                  {!campEnCours && (
                    <p className="text-xs text-[#6b6b78] mb-3">
                      Les autorisations sont disponibles uniquement pendant le camp (statut EN_COURS).
                    </p>
                  )}

                  {autorisations.length === 0 ? (
                    <Card className="text-center py-5 text-sm text-[#6b6b78]">
                      <div className="text-2xl mb-1">🚪</div>
                      <p>Aucune demande d&apos;autorisation.</p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {autorisations.map(a => {
                        const s = STATUT_AUTO[a.statut];
                        return (
                          <div key={a.id} className="bg-white border border-[#ececf0] rounded-2xl p-3">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <p className="text-sm font-semibold text-[#1F1B2E] leading-snug flex-1">{a.motif}</p>
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${s.color}`}>
                                {s.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#6b6b78]">
                              {a.personnes.length} personne(s) — {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                            {a.reponse && (
                              <p className="text-[11px] mt-1.5 px-2 py-1 bg-[#f7f5fb] rounded-lg text-[#4a1370] italic">
                                {a.reponse}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {a.personnes.map(p => (
                                <span key={p.id} className="text-[10px] bg-[#f3f3f5] text-[#1F1B2E] px-2 py-0.5 rounded-full">
                                  {p.nomSnapshot}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Colonne droite — publications */}
            <div className="mt-6 lg:mt-0">
              <CampPhotosSection campId={id} singleColumn />
            </div>

          </div>
        </div>
      </div>

      {/* ── Modal demande d'autorisation ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
            <div className="px-5 pt-5 pb-3 border-b border-[#ececf0] flex-shrink-0">
              <h2 className="text-base font-black text-[#1F1B2E]">Demande d&apos;autorisation de sortie</h2>
              <p className="text-xs text-[#6b6b78] mt-0.5">Le Régional recevra la demande et devra la valider.</p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Motif */}
              <div>
                <label className="text-xs font-semibold text-[#1F1B2E] uppercase tracking-wide block mb-1.5">
                  Motif *
                </label>
                <textarea
                  value={motif}
                  onChange={e => setMotif(e.target.value)}
                  rows={3}
                  placeholder="Expliquez la raison de la sortie…"
                  className="w-full border border-[#e6e6ea] rounded-xl px-3 py-2.5 text-sm text-[#1F1B2E] resize-none focus:outline-none focus:ring-2 focus:ring-[#6A1B9A]/30"
                />
              </div>

              {/* Sélection des personnes */}
              <div>
                <label className="text-xs font-semibold text-[#1F1B2E] uppercase tracking-wide block mb-1.5">
                  Personnes concernées * ({selectedIds.length} sélectionnée(s))
                </label>
                {participants.length === 0 ? (
                  <p className="text-xs text-[#6b6b78]">Aucun participant dans ce camp.</p>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto border border-[#e6e6ea] rounded-xl p-2">
                    {participants.map(p => {
                      const checked = selectedIds.includes(p.userId);
                      return (
                        <label
                          key={p.userId}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                            checked ? 'bg-[#6A1B9A]/10' : 'hover:bg-[#f7f5fb]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePerson(p.userId)}
                            className="accent-[#6A1B9A] w-4 h-4 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[#1F1B2E] truncate">
                              {p.user.prenoms} {p.user.nom}
                            </div>
                            <div className="text-[10px] text-[#6b6b78]">{p.parish?.nom ?? '—'}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {modalError && (
                <p className="text-xs text-[#E55A35] bg-[#fde8e8] px-3 py-2 rounded-lg">{modalError}</p>
              )}
            </div>

            <div className="px-5 pb-5 pt-3 border-t border-[#ececf0] flex gap-2 flex-shrink-0">
              <button
                onClick={() => { setShowModal(false); setMotif(''); setSelectedIds([]); setModalError(''); }}
                className="flex-1 py-3 rounded-xl border border-[#e6e6ea] text-sm font-semibold text-[#6b6b78]"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmitAutorisation}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#F58A4B,#E55A35)' }}
              >
                {submitting ? 'Envoi…' : 'Envoyer la demande'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
