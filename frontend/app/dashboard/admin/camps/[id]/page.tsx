'use client';
import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { campsApi } from '@/lib/api';
import { deferEffect } from '@/lib/effects';
import { Pill } from '@/components/ui';
import { CampPhotosSection } from '@/components/camps/CampPhotosSection';
import type { Camp, CampParticipant, CampStatus } from '@/types';

const STATUTS: { value: CampStatus; label: string; dot: string }[] = [
  { value: 'BROUILLON', label: 'Brouillon', dot: 'bg-[#9b9ba8]' },
  { value: 'OUVERT',    label: 'Ouvert',    dot: 'bg-[#22c55e]' },
  { value: 'EN_COURS',  label: 'En cours',  dot: 'bg-[#f59e0b]' },
  { value: 'CLOTURE',   label: 'Clôturé',   dot: 'bg-[#ef4444]' },
];

const TYPE_LABEL: Record<string, string> = {
  REGIONAL: 'Régional', NATIONAL: 'National',
  DISTRICT: 'District', PAROISSE: 'Paroisse',
};

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-[#9b9ba8] uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-[#1F1B2E]">{value}</p>
    </div>
  );
}

export default function AdminCampDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [camp, setCamp] = useState<Camp | null>(null);
  const [participants, setParticipants] = useState<CampParticipant[]>([]);
  const [updating, setUpdating] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([campsApi.get(id), campsApi.participants(id)]);
      setCamp(c.data);
      setParticipants(p.data);
    } catch { router.push('/dashboard/admin/camps'); }
  }, [id, router]);

  useEffect(() => deferEffect(reload), [reload]);

  const handleStatus = async (statut: CampStatus) => {
    if (!camp || updating || camp.statut === statut) return;
    setUpdating(true);
    try { await campsApi.updateStatus(id, statut); await reload(); }
    catch { /* ignore */ } finally { setUpdating(false); }
  };

  if (!camp) return (
    <div className="flex-1 flex items-center justify-center text-[#6b6b78] text-sm">
      <div className="text-center"><div className="text-3xl mb-2 animate-pulse">⛺</div>Chargement…</div>
    </div>
  );

  const currentMeta = STATUTS.find(s => s.value === camp.statut);
  const aJour     = participants.filter(p => p.adhesionStatusSnapshot === 'A_JOUR').length;
  const confirmes = participants.filter(p => p.participationStatus === 'CONFIRME').length;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6">
      <div className="space-y-4">

        {/* ── En-tête camp ── */}
        <div>
          <Link href="/dashboard/admin/camps" className="inline-flex items-center gap-1 text-xs text-[#9b9ba8] hover:text-[#1F1B2E] mb-2">
            ‹ Camps
          </Link>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-black text-[#1F1B2E] leading-tight">{camp.nom}</h1>
              <p className="text-xs text-[#9b9ba8] mt-0.5">{camp.lieu}</p>
            </div>
            {currentMeta && (
              <span className="flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1 rounded-full border border-[#ececf0] bg-white text-xs font-semibold text-[#1F1B2E]">
                <span className={`w-1.5 h-1.5 rounded-full ${currentMeta.dot}`} />
                {currentMeta.label}
              </span>
            )}
          </div>
        </div>

        {/* ── Changer le statut ── */}
        <div className="bg-white border border-[#ececf0] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <p className="text-[10px] font-bold text-[#9b9ba8] uppercase tracking-widest mb-2">Statut du camp</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {STATUTS.map(s => (
                <button
                  key={s.value}
                  onClick={() => handleStatus(s.value)}
                  disabled={updating}
                  className={`flex items-center gap-1.5 flex-shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all disabled:opacity-60 ${
                    camp.statut === s.value
                      ? 'bg-[#1F1B2E] text-white border-[#1F1B2E]'
                      : 'bg-white border-[#e0e0e8] text-[#6b6b78] hover:border-[#1F1B2E] hover:text-[#1F1B2E]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${camp.statut === s.value ? 'bg-white/70' : s.dot}`} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-[#ececf0] px-4 py-2.5">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 text-sm font-bold text-white px-4 py-2 rounded-xl w-full justify-center"
              style={{ background: 'linear-gradient(135deg,#F58A4B,#E55A35)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Publier des photos
            </button>
          </div>
        </div>

        {/* ── Grille info + participants ── */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">

          {/* Colonne gauche (2/3) */}
          <div className="lg:col-span-2 space-y-4">

            {/* Infos camp */}
            <div className="bg-white border border-[#ececf0] rounded-2xl shadow-sm p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Début" value={formatDate(camp.dateDebut)} />
                <InfoRow label="Fin"   value={formatDate(camp.dateFin)} />
                <InfoRow label="Lieu"  value={camp.lieu ?? '—'} />
                <InfoRow label="Type"  value={
                  <span className="inline-flex items-center gap-1">
                    {TYPE_LABEL[camp.type ?? ''] ?? camp.type}
                  </span>
                } />
              </div>
              {camp.theme && (
                <div className="pt-3 border-t border-[#f5f5f8]">
                  <InfoRow label="Thème" value={camp.theme} />
                </div>
              )}
              {camp.description && (
                <p className="text-xs text-[#9b9ba8] leading-relaxed border-t border-[#f5f5f8] pt-3">{camp.description}</p>
              )}
            </div>

            {/* Sélection */}
            <div className="bg-white border border-[#ececf0] rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#1F1B2E]">Sélection participants</p>
                <p className="text-xs text-[#9b9ba8] mt-0.5">
                  {camp.selectionOuverte ? 'Ouverte — les Guides peuvent sélectionner' : 'Fermée'}
                </p>
              </div>
              <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                camp.selectionOuverte ? 'bg-green-50 text-[#2E7D32]' : 'bg-[#f5f5f8] text-[#6b6b78]'
              }`}>
                {camp.selectionOuverte ? '✓ Ouverte' : '✕ Fermée'}
              </span>
            </div>
          </div>

          {/* Colonne droite */}
          <div className="mt-4 lg:mt-0 space-y-4">

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Sélectionnés', value: participants.length, color: 'text-[#6A1B9A]' },
                { label: 'Adhésion OK',  value: aJour,               color: 'text-[#2E7D32]' },
                { label: 'Confirmés',    value: confirmes,            color: 'text-[#D9A441]' },
              ].map(stat => (
                <div key={stat.label} className="bg-white border border-[#ececf0] rounded-2xl p-3 text-center shadow-sm">
                  <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                  <div className="text-[10px] text-[#9b9ba8] mt-0.5 leading-tight">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Participants */}
            <div className="bg-white border border-[#ececf0] rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#f5f5f8] flex items-center justify-between">
                <p className="text-sm font-bold text-[#1F1B2E]">Participants</p>
                <span className="text-xs bg-[#f5f5f8] text-[#6b6b78] px-2 py-0.5 rounded-full font-semibold">{participants.length}</span>
              </div>
              {participants.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#9b9ba8]">
                  <div className="text-2xl mb-2">👥</div>
                  Aucun participant sélectionné.
                </div>
              ) : (
                <div className="divide-y divide-[#f5f5f8] max-h-72 overflow-y-auto">
                  {participants.map(p => (
                    <div key={p.id} className="flex items-center gap-2.5 px-4 py-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#E55A35] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {p.user.nom?.[0]}{p.user.prenoms?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1F1B2E] truncate">{p.user.prenoms} {p.user.nom}</p>
                        <p className="text-[11px] text-[#9b9ba8] truncate">{p.parish?.nom ?? '—'}</p>
                      </div>
                      <Pill variant={p.adhesionStatusSnapshot === 'A_JOUR' ? 'vert' : 'or'} className="text-[10px] flex-shrink-0">
                        {p.adhesionStatusSnapshot === 'A_JOUR' ? 'À jour' : 'En attente'}
                      </Pill>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-[#f5f5f8] p-3">
                <Link
                  href="/dashboard/admin/participants"
                  className="flex items-center justify-center gap-1.5 w-full text-center bg-[#1F1B2E] text-white font-bold text-xs py-2.5 rounded-xl hover:bg-[#2d2640] transition-colors"
                >
                  Vue complète →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Photos ── */}
        <CampPhotosSection
          campId={id}
          externalUploadOpen={showUploadModal}
          onExternalUploadClose={() => setShowUploadModal(false)}
        />

      </div>
    </div>
  );
}
