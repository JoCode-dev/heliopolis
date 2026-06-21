'use client';
import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { campsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { deferEffect } from '@/lib/effects';
import { Card, SectionTitle, Pill } from '@/components/ui';
import { CampPhotosSection } from '@/components/camps/CampPhotosSection';
import type { Camp, CampParticipant, CampStatus, AutorisationSortie } from '@/types';

const STATUTS: { value: CampStatus; label: string; color: string }[] = [
  { value: 'BROUILLON', label: 'Brouillon',  color: 'bg-[#6b6b78]/15 text-[#6b6b78]' },
  { value: 'OUVERT',    label: '✓ Ouvert',   color: 'bg-[#e1f4e3] text-[#2E7D32]' },
  { value: 'EN_COURS',  label: '▶ En cours', color: 'bg-[#fff3d6] text-[#9c7218]' },
  { value: 'CLOTURE',   label: '✕ Clôturé',  color: 'bg-[#fde8e8] text-[#E55A35]' },
];

const STATUT_AUTO = {
  EN_ATTENTE: { label: 'En attente', color: 'bg-[#fff3d6] text-[#9c7218]' },
  APPROUVEE:  { label: 'Approuvée',  color: 'bg-[#e1f4e3] text-[#2E7D32]' },
  REFUSEE:    { label: 'Refusée',    color: 'bg-[#fde8e8] text-[#E55A35]' },
} as const;

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

type MyParticipationStatus = 'EN_ATTENTE' | 'SELECTIONNE' | 'CONFIRME' | 'PRESENT' | 'DESISTE' | 'BLOQUE' | null;

const MY_PART_CFG: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  EN_ATTENTE:  { label: 'Demande en attente',       icon: '⏳', bg: 'bg-[#fff8e6] border-[#ffe082]',  text: 'text-[#9c7218]' },
  SELECTIONNE: { label: 'Participation confirmée',   icon: '✓',  bg: 'bg-[#e8f5e9] border-[#a5d6a7]', text: 'text-[#2E7D32]' },
  CONFIRME:    { label: 'Participation confirmée',   icon: '✓✓', bg: 'bg-[#e8f5e9] border-[#a5d6a7]', text: 'text-[#2E7D32]' },
  PRESENT:     { label: 'Présent au camp',           icon: '✓',  bg: 'bg-[#e8f5e9] border-[#a5d6a7]', text: 'text-[#2E7D32]' },
  BLOQUE:      { label: 'Participation non disponible', icon: '🚫', bg: 'bg-[#fde8e8] border-[#ef9a9a]', text: 'text-[#C62828]' },
};

export default function RegionCampDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user: actor } = useAuthStore();
  const [camp, setCamp] = useState<Camp | null>(null);
  const [participants, setParticipants] = useState<CampParticipant[]>([]);
  const [autorisations, setAutorisations] = useState<AutorisationSortie[]>([]);
  const [updating, setUpdating] = useState(false);
  const [secuLoadingId, setSecuLoadingId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [myPartStatus, setMyPartStatus] = useState<MyParticipationStatus>(null);
  const [partLoading, setPartLoading] = useState(false);

  const canToggleSecurite = actor?.role === 'ADMIN' || actor?.role === 'REGION' || actor?.role === 'SENTINELLE';

  // Modal réponse
  const [reponseModal, setReponseModal] = useState<{ id: string; action: 'valider' | 'refuser' } | null>(null);
  const [reponseText, setReponseText] = useState('');
  const [reponseLoading, setReponseLoading] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [c, p, a, mp] = await Promise.all([
        campsApi.get(id),
        campsApi.participants(id),
        campsApi.autorisations(id),
        campsApi.myParticipation(id),
      ]);
      setCamp(c.data);
      setParticipants(p.data);
      setAutorisations(a.data as AutorisationSortie[]);
      setMyPartStatus((mp.data as { participationStatus: MyParticipationStatus } | null)?.participationStatus ?? null);
    } catch { router.push('/dashboard/region/camps'); }
  }, [id, router]);

  useEffect(() => deferEffect(reload), [reload]);

  const handleStatus = async (statut: CampStatus) => {
    if (!camp || updating) return;
    setUpdating(true);
    try {
      await campsApi.updateStatus(id, statut);
      await reload();
    } catch { /* ignore */ } finally { setUpdating(false); }
  };

  const handleToggleSecurite = async (p: CampParticipant) => {
    if (secuLoadingId) return;
    setSecuLoadingId(p.id);
    try {
      await campsApi.toggleChargeSecurite(id, p.userId);
      setParticipants(prev =>
        prev.map(x => x.id === p.id ? { ...x, chargeSecurite: !x.chargeSecurite } : x)
      );
    } catch { /* ignore */ } finally { setSecuLoadingId(null); }
  };

  const handleExpressInterest = async () => {
    setPartLoading(true);
    try {
      const res = await campsApi.expressInterest(id);
      setMyPartStatus((res.data as { participationStatus: MyParticipationStatus })?.participationStatus ?? 'SELECTIONNE');
    } catch { /* ignore */ } finally { setPartLoading(false); }
  };

  const handleWithdraw = async () => {
    setPartLoading(true);
    try {
      await campsApi.withdrawInterest(id);
      setMyPartStatus(null);
    } catch { /* ignore */ } finally { setPartLoading(false); }
  };

  const handleReponse = async () => {
    if (!reponseModal) return;
    setReponseLoading(true);
    try {
      if (reponseModal.action === 'valider') {
        await campsApi.validerAutorisation(id, reponseModal.id, reponseText || undefined);
      } else {
        await campsApi.refuserAutorisation(id, reponseModal.id, reponseText || undefined);
      }
      setReponseModal(null);
      setReponseText('');
      await reload();
    } catch { /* ignore */ } finally { setReponseLoading(false); }
  };

  if (!camp) return (
    <div className="flex-1 flex items-center justify-center text-[#6b6b78] text-sm">
      <div className="text-center"><div className="text-3xl mb-2 animate-pulse">⛺</div>Chargement…</div>
    </div>
  );

  const aJour = participants.filter(p => p.adhesionStatusSnapshot === 'A_JOUR').length;
  const confirmes = participants.filter(p => p.participationStatus === 'CONFIRME').length;
  const autoEnAttente = autorisations.filter(a => a.statut === 'EN_ATTENTE');

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6">
      <div className="max-w-5xl mx-auto">

        {/* ── En-tête ─────────────────────────────────────────────────── */}
        <div className="flex justify-between items-start mb-4 border-b border-[#ececf0] pb-4">
          <div>
            <Link href="/dashboard/region/camps" className="text-xs text-[#6b6b78] hover:text-[#1F1B2E] mb-1 inline-block">‹ Camps</Link>
            <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E]">{camp.nom}</h1>
            <p className="text-xs text-[#6b6b78] mt-0.5">{camp.lieu} · {camp.type}</p>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 ${
            STATUTS.find(s => s.value === camp.statut)?.color ?? ''
          }`}>{STATUTS.find(s => s.value === camp.statut)?.label ?? camp.statut}</span>
        </div>

        {/* ── Barre d'actions : statuts + Publier ─────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-white border border-[#ececf0] rounded-2xl shadow-sm">
          {STATUTS.map(s => (
            <button
              key={s.value}
              onClick={() => handleStatus(s.value)}
              disabled={camp.statut === s.value || updating}
              className={`text-[11px] font-bold px-3 py-2 rounded-xl border transition-colors ${
                camp.statut === s.value
                  ? 'bg-[#1F1B2E] text-white border-[#1F1B2E] cursor-default'
                  : 'bg-white border-[#e6e6ea] text-[#1F1B2E] hover:border-[#6A1B9A] hover:text-[#6A1B9A] disabled:opacity-60'
              }`}
            >
              {updating && camp.statut !== s.value ? '…' : s.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg,#F58A4B,#E55A35)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Publier des photos
          </button>
        </div>

        {/* ── Grille principale ───────────────────────────────────────── */}
        <div className="lg:grid lg:grid-cols-[2fr_3fr] lg:gap-8 lg:items-start">

          {/* Colonne gauche — infos + participants + autorisations */}
          <div>
            <Card className="mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-[11px] text-[#6b6b78] uppercase tracking-wide mb-1">Début</div>
                  <div className="font-semibold text-[#1F1B2E]">📅 {formatDate(camp.dateDebut)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#6b6b78] uppercase tracking-wide mb-1">Fin</div>
                  <div className="font-semibold text-[#1F1B2E]">📅 {formatDate(camp.dateFin)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#6b6b78] uppercase tracking-wide mb-1">Lieu</div>
                  <div className="font-semibold text-[#1F1B2E]">📍 {camp.lieu}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#6b6b78] uppercase tracking-wide mb-1">Type</div>
                  <div className="font-semibold text-[#1F1B2E]">🏷 {camp.type}</div>
                </div>
              </div>
              {camp.theme && (
                <div className="mt-3 pt-3 border-t border-[#ececf0]">
                  <div className="text-[11px] text-[#6b6b78] uppercase tracking-wide mb-1">Thème</div>
                  <div className="text-sm font-semibold text-[#1F1B2E]">{camp.theme}</div>
                </div>
              )}
              {camp.description && (
                <p className="text-xs text-[#6b6b78] mt-2 leading-relaxed">{camp.description}</p>
              )}
            </Card>

            {/* ── Ma participation personnelle (membre de région) ── */}
            {camp.selectionOuverte && (
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
                    <p className="text-xs text-[#6b6b78] mb-3">Tu n&apos;as pas encore marqué ta participation à ce camp.</p>
                  )}
                  {(!myPartStatus || myPartStatus === 'DESISTE') && (
                    <button
                      type="button"
                      onClick={handleExpressInterest}
                      disabled={partLoading}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#1F1B2E,#4a1370)' }}
                    >
                      {partLoading ? 'Envoi…' : '✓ Marquer ma participation'}
                    </button>
                  )}
                  {(myPartStatus === 'SELECTIONNE' || myPartStatus === 'CONFIRME') && (
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

            <Card className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[#1F1B2E]">Sélection participants</div>
                  <div className="text-xs text-[#6b6b78] mt-0.5">
                    {camp.selectionOuverte ? 'Ouverte — les Guides peuvent sélectionner' : 'Fermée'}
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  camp.selectionOuverte ? 'bg-[#e1f4e3] text-[#2E7D32]' : 'bg-[#f3f3f5] text-[#6b6b78]'
                }`}>
                  {camp.selectionOuverte ? '✓ Ouverte' : '✕ Fermée'}
                </span>
              </div>
            </Card>

            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {[
                { label: 'Sélectionnés', value: participants.length, color: 'text-[#6A1B9A]' },
                { label: 'À jour adhésion', value: aJour, color: 'text-[#2E7D32]' },
                { label: 'Confirmés', value: confirmes, color: 'text-[#D9A441]' },
              ].map(stat => (
                <div key={stat.label} className="bg-white border border-[#ececf0] rounded-2xl p-3 text-center">
                  <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                  <div className="text-[10px] text-[#6b6b78] mt-0.5 leading-tight">{stat.label}</div>
                </div>
              ))}
            </div>

            <SectionTitle>Participants ({participants.length})</SectionTitle>
            {participants.length === 0 ? (
              <Card className="text-center py-6 text-sm text-[#6b6b78]">
                <div className="text-2xl mb-2">👥</div>
                <p>Aucun participant sélectionné.</p>
              </Card>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {participants.map(p => {
                  const isSecuLoading = secuLoadingId === p.id;
                  return (
                    <div key={p.id} className="bg-white border border-[#ececf0] rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2.5 px-3 py-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#E55A35] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                          {p.user.nom?.[0]}{p.user.prenoms?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-[#1F1B2E] truncate">{p.user.prenoms} {p.user.nom}</div>
                          <div className="text-[11px] text-[#6b6b78]">{p.parish?.nom ?? '—'}</div>
                        </div>
                        <Pill variant={p.adhesionStatusSnapshot === 'A_JOUR' ? 'vert' : 'or'} className="text-[10px]">
                          {p.adhesionStatusSnapshot === 'A_JOUR' ? 'À jour' : 'En attente'}
                        </Pill>
                      </div>
                      {p.participationStatus === 'EN_ATTENTE' && (
                        <button
                          type="button"
                          onClick={async () => {
                            setSecuLoadingId(p.id);
                            try {
                              await campsApi.validerDemande(id, p.userId);
                              setParticipants(prev => prev.map(x => x.id === p.id ? { ...x, participationStatus: 'SELECTIONNE' as const } : x));
                            } catch { /* ignore */ } finally { setSecuLoadingId(null); }
                          }}
                          disabled={secuLoadingId === p.id}
                          className="w-full flex items-center justify-between px-3 py-2 border-t border-[#f0f0f4] bg-[#e8f5e9] hover:bg-[#c8e6c9] transition-colors disabled:opacity-50"
                        >
                          <span className="text-[11px] font-bold text-[#2E7D32]">✓ Valider la demande de participation</span>
                          <span className="text-[11px] text-[#2E7D32]">{secuLoadingId === p.id ? '…' : '›'}</span>
                        </button>
                      )}
                      {p.roleAtCamp !== 'GARDIEN' && p.participationStatus !== 'EN_ATTENTE' && canToggleSecurite && (
                        <button
                          type="button"
                          onClick={() => handleToggleSecurite(p)}
                          disabled={isSecuLoading}
                          className={`w-full flex items-center justify-between px-3 py-2 border-t border-[#f0f0f4] transition-colors disabled:opacity-50 ${
                            p.chargeSecurite ? 'bg-[#fde8e8] hover:bg-[#fcd0d0]' : 'bg-[#fafafa] hover:bg-[#f0f0f4]'
                          }`}
                        >
                          <span className={`text-[11px] font-semibold ${p.chargeSecurite ? 'text-[#E55A35]' : 'text-[#9b9ba8]'}`}>
                            🛡️ {p.chargeSecurite ? 'Chargé sécurité' : 'Désigner chargé sécu.'}
                          </span>
                          <span className={`text-[11px] font-bold ${p.chargeSecurite ? 'text-[#E55A35]' : 'text-[#c0c0c8]'}`}>
                            {isSecuLoading ? '…' : p.chargeSecurite ? '✓ actif' : '+ désigner'}
                          </span>
                        </button>
                      )}
                      {p.roleAtCamp !== 'GARDIEN' && p.participationStatus !== 'EN_ATTENTE' && !canToggleSecurite && p.chargeSecurite && (
                        <div className="px-3 py-1.5 border-t border-[#f0f0f4] bg-[#fde8e8]">
                          <span className="text-[10px] font-bold text-[#E55A35]">🛡️ Chargé sécurité</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <Link
              href="/dashboard/region/participants"
              className="block w-full text-center bg-[#1F1B2E] text-white font-bold text-sm py-3 rounded-xl mt-3 hover:bg-[#2d2640] transition-colors"
            >
              📊 Vue complète participants →
            </Link>

            {/* ── Autorisations de sortie ─────────────────────────────── */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <SectionTitle className="mb-0">
                  Autorisations de sortie
                </SectionTitle>
                {autoEnAttente.length > 0 && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#fff3d6] text-[#9c7218]">
                    {autoEnAttente.length} en attente
                  </span>
                )}
              </div>

              {autorisations.length === 0 ? (
                <Card className="text-center py-5 text-sm text-[#6b6b78]">
                  <div className="text-2xl mb-1">🚪</div>
                  <p>Aucune demande d&apos;autorisation reçue.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {autorisations.map(a => {
                    const s = STATUT_AUTO[a.statut];
                    return (
                      <div key={a.id} className={`bg-white border rounded-2xl p-4 ${
                        a.statut === 'EN_ATTENTE' ? 'border-[#ffd700] shadow-sm' : 'border-[#ececf0]'
                      }`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] text-[#6b6b78] mb-0.5">
                              Sentinelle : <span className="font-semibold text-[#1F1B2E]">
                                {a.demandeur.prenoms} {a.demandeur.nom}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-[#1F1B2E] leading-snug">{a.motif}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${s.color}`}>
                            {s.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-2">
                          {a.personnes.map(p => (
                            <span key={p.id} className="text-[10px] bg-[#f3f3f5] text-[#1F1B2E] px-2 py-0.5 rounded-full">
                              {p.nomSnapshot}
                            </span>
                          ))}
                        </div>

                        <div className="text-[10px] text-[#6b6b78] mb-2">
                          {a.personnes.length} personne(s) · {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                        </div>

                        {a.reponse && (
                          <p className="text-[11px] px-2.5 py-1.5 bg-[#f7f5fb] rounded-lg text-[#4a1370] italic mb-2">
                            {a.reponse}
                          </p>
                        )}

                        {a.statut === 'EN_ATTENTE' && (
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => { setReponseModal({ id: a.id, action: 'valider' }); setReponseText(''); }}
                              className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-[#2E7D32] hover:bg-[#256227] transition-colors"
                            >
                              ✓ Valider
                            </button>
                            <button
                              onClick={() => { setReponseModal({ id: a.id, action: 'refuser' }); setReponseText(''); }}
                              className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-[#E55A35] hover:bg-[#c94d2b] transition-colors"
                            >
                              ✕ Refuser
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Colonne droite — publications */}
          <div className="mt-6 lg:mt-0">
            <CampPhotosSection
              campId={id}
              singleColumn
              externalUploadOpen={showUploadModal}
              onExternalUploadClose={() => setShowUploadModal(false)}
            />
          </div>
        </div>

      </div>

      {/* ── Modal réponse Régional ───────────────────────────────────── */}
      {reponseModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-xl">
            <div className="px-5 pt-5 pb-3 border-b border-[#ececf0]">
              <h2 className="text-base font-black text-[#1F1B2E]">
                {reponseModal.action === 'valider' ? '✓ Valider l\'autorisation' : '✕ Refuser l\'autorisation'}
              </h2>
              <p className="text-xs text-[#6b6b78] mt-0.5">
                La Sentinelle et les chargés de sécurité seront notifiés.
              </p>
            </div>
            <div className="px-5 py-4">
              <label className="text-xs font-semibold text-[#1F1B2E] uppercase tracking-wide block mb-1.5">
                Message (optionnel)
              </label>
              <textarea
                value={reponseText}
                onChange={e => setReponseText(e.target.value)}
                rows={3}
                placeholder={reponseModal.action === 'valider'
                  ? 'Consignes particulières pour la sortie…'
                  : 'Raison du refus…'}
                className="w-full border border-[#e6e6ea] rounded-xl px-3 py-2.5 text-sm text-[#1F1B2E] resize-none focus:outline-none focus:ring-2 focus:ring-[#6A1B9A]/30"
              />
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={() => { setReponseModal(null); setReponseText(''); }}
                className="flex-1 py-3 rounded-xl border border-[#e6e6ea] text-sm font-semibold text-[#6b6b78]"
              >
                Annuler
              </button>
              <button
                onClick={handleReponse}
                disabled={reponseLoading}
                className={`flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 ${
                  reponseModal.action === 'valider' ? 'bg-[#2E7D32]' : 'bg-[#E55A35]'
                }`}
              >
                {reponseLoading ? '…' : reponseModal.action === 'valider' ? 'Confirmer' : 'Refuser'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
