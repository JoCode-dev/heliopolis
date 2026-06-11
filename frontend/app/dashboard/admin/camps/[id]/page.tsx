'use client';
import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { campsApi } from '@/lib/api';
import { deferEffect } from '@/lib/effects';
import { Card, SectionTitle, Pill } from '@/components/ui';
import type { Camp, CampParticipant, CampStatus } from '@/types';

const STATUTS: { value: CampStatus; label: string; color: string }[] = [
  { value: 'BROUILLON', label: 'Brouillon',  color: 'bg-[#6b6b78]/15 text-[#6b6b78]' },
  { value: 'OUVERT',    label: '✓ Ouvert',   color: 'bg-[#e1f4e3] text-[#2E7D32]' },
  { value: 'EN_COURS',  label: '▶ En cours', color: 'bg-[#fff3d6] text-[#9c7218]' },
  { value: 'CLOTURE',   label: '✕ Clôturé',  color: 'bg-[#fde8e8] text-[#E55A35]' },
];

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function AdminCampDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [camp, setCamp] = useState<Camp | null>(null);
  const [participants, setParticipants] = useState<CampParticipant[]>([]);
  const [updating, setUpdating] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([campsApi.get(id), campsApi.participants(id)]);
      setCamp(c.data);
      setParticipants(p.data);
    } catch { router.push('/dashboard/admin/camps'); }
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

  if (!camp) return (
    <div className="flex-1 flex items-center justify-center text-[#6b6b78] text-sm">
      <div className="text-center"><div className="text-3xl mb-2 animate-pulse">⛺</div>Chargement…</div>
    </div>
  );

  const aJour = participants.filter(p => p.adhesionStatusSnapshot === 'A_JOUR').length;
  const confirmes = participants.filter(p => p.participationStatus === 'CONFIRME').length;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6">
      <div className="flex justify-between items-start mb-5 border-b border-[#ececf0] pb-4">
        <div>
          <Link href="/dashboard/admin/camps" className="text-xs text-[#6b6b78] hover:text-[#1F1B2E] mb-1 inline-block">‹ Camps</Link>
          <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E]">{camp.nom}</h1>
          <p className="text-xs text-[#6b6b78] mt-0.5">{camp.lieu} · {camp.type}</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 ${
          STATUTS.find(s => s.value === camp.statut)?.color ?? ''
        }`}>{STATUTS.find(s => s.value === camp.statut)?.label ?? camp.statut}</span>
      </div>

      <div>
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:max-w-5xl">

          {/* Colonne gauche */}
          <div>
            {/* Infos */}
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

            {/* Changer le statut */}
            <SectionTitle>Changer le statut</SectionTitle>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {STATUTS.map(s => (
                <button
                  key={s.value}
                  onClick={() => handleStatus(s.value)}
                  disabled={camp.statut === s.value || updating}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                    camp.statut === s.value
                      ? 'bg-[#1F1B2E] text-white border-[#1F1B2E] cursor-default'
                      : 'bg-white border-[#e6e6ea] text-[#1F1B2E] hover:border-[#6A1B9A] hover:text-[#6A1B9A] disabled:opacity-60'
                  }`}
                >
                  {updating && camp.statut !== s.value ? '…' : s.label}
                </button>
              ))}
            </div>

            {/* Sélection ouverte */}
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
          </div>

          {/* Colonne droite */}
          <div>
            {/* Stats participants */}
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

            {/* Liste participants */}
            <SectionTitle>Participants ({participants.length})</SectionTitle>
            {participants.length === 0 ? (
              <Card className="text-center py-6 text-sm text-[#6b6b78]">
                <div className="text-2xl mb-2">👥</div>
                <p>Aucun participant sélectionné.</p>
              </Card>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {participants.map(p => (
                  <div key={p.id} className="flex items-center gap-2.5 bg-white border border-[#ececf0] rounded-xl px-3 py-2.5">
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
                ))}
              </div>
            )}

            <Link
              href="/dashboard/admin/participants"
              className="block w-full text-center bg-[#1F1B2E] text-white font-bold text-sm py-3 rounded-xl mt-3 hover:bg-[#2d2640] transition-colors"
            >
              📊 Vue complète participants →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
