'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { campsApi } from '@/lib/api';
import { Pill, Select } from '@/components/ui';
import type { Camp, CampParticipant, AdhesionStatus, ParticipationStatus } from '@/types';

const ADHESION_PILL: Record<AdhesionStatus, 'vert' | 'rouge' | 'or'> = {
  A_JOUR: 'vert',
  NON_A_JOUR: 'rouge',
  EN_ATTENTE: 'or',
};
const ADHESION_LABELS: Record<AdhesionStatus, string> = {
  A_JOUR: 'À jour',
  NON_A_JOUR: 'Non à jour',
  EN_ATTENTE: 'En attente',
};

const PARTICIPATION_PILL: Record<ParticipationStatus, 'vert' | 'rouge' | 'or' | 'violet' | 'gris'> = {
  SELECTIONNE: 'vert',
  CONFIRME: 'vert',
  PRESENT: 'vert',
  EN_ATTENTE: 'or',
  NON_SELECTIONNE: 'gris',
  DESISTE: 'rouge',
  ABSENT: 'rouge',
  BLOQUE: 'rouge',
};
const PARTICIPATION_LABELS: Record<ParticipationStatus, string> = {
  SELECTIONNE: 'Sélectionné',
  CONFIRME: 'Confirmé',
  PRESENT: 'Présent',
  EN_ATTENTE: 'En attente',
  NON_SELECTIONNE: 'Non sélectionné',
  DESISTE: 'Désisté',
  ABSENT: 'Absent',
  BLOQUE: 'Bloqué',
};

function ParticipantsContent() {
  const searchParams = useSearchParams();
  const initialCampId = searchParams.get('campId') ?? '';

  const [camps, setCamps] = useState<Camp[]>([]);
  const [selectedCampId, setSelectedCampId] = useState(initialCampId);
  const [participants, setParticipants] = useState<CampParticipant[]>([]);
  const [loadingCamps, setLoadingCamps] = useState(true);
  const [loadingParts, setLoadingParts] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await campsApi.list();
        setCamps(data);
        if (!initialCampId && data[0]?.id) setSelectedCampId(data[0].id);
      } catch { /* ignore */ }
      finally { setLoadingCamps(false); }
    })();
  }, [initialCampId]);

  useEffect(() => {
    if (!selectedCampId) return;
    let active = true;

    (async () => {
      await Promise.resolve();
      if (!active) return;

      setLoadingParts(true);
      try {
        const { data } = await campsApi.participants(selectedCampId);
        if (active) setParticipants(data);
      } catch {
        if (active) setParticipants([]);
      } finally {
        if (active) setLoadingParts(false);
      }
    })();

    return () => { active = false; };
  }, [selectedCampId]);

  const filtered = participants.filter(p => {
    const q = search.toLowerCase();
    const nom = `${p.user.prenoms ?? ''} ${p.user.nom ?? ''}`.toLowerCase();
    const mat = (p.user.matricule ?? '').toLowerCase();
    return !q || nom.includes(q) || mat.includes(q);
  });

  const total = participants.length;
  const confirmes = participants.filter(p => ['CONFIRME', 'PRESENT'].includes(p.participationStatus)).length;
  const enAttente = participants.filter(p => p.participationStatus === 'EN_ATTENTE').length;
  const selectionnes = participants.filter(p => p.participationStatus === 'SELECTIONNE').length;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-4 border-b border-[#ececf0] pb-4">
        <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E]">👥 Participants</h1>
        <Link href="/dashboard/admin/export"
          className="bg-[#6A1B9A] text-white font-bold text-xs lg:text-sm px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl hover:bg-[#5a1280] transition-colors flex-shrink-0">
          📤 Export
        </Link>
      </div>

      {/* Select camp */}
      <div className="mb-5 max-w-sm">
        {loadingCamps ? (
          <div className="h-10 bg-white border border-[#e6e6ea] rounded-xl animate-pulse" />
        ) : (
          <Select
            value={selectedCampId}
            onChange={e => setSelectedCampId(e.target.value)}
            className="w-full">
            <option value="">— Sélectionner un camp —</option>
            {camps.map(c => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </Select>
        )}
      </div>

      {/* KPIs */}
      {selectedCampId && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
          {[
            { label: 'Total',     value: total,        color: '#1F1B2E' },
            { label: 'Confirmés', value: confirmes,    color: '#2E7D32' },
            { label: 'Attente',   value: enAttente,    color: '#D9A441' },
            { label: 'Sélect.',   value: selectionnes, color: '#6A1B9A' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white border border-[#ececf0] rounded-xl p-3">
              <div className="text-2xl font-black" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-[10px] text-[#6b6b78] uppercase tracking-wide mt-0.5">{kpi.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {selectedCampId && (
        <div className="mb-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-white border border-[#e0e0e8] rounded-xl px-3 py-2 text-sm outline-none w-72"
            placeholder="🔍 Rechercher par nom ou matricule…"
          />
        </div>
      )}

      {/* Table */}
      {selectedCampId && (
        loadingParts ? (
          <div className="flex items-center justify-center py-16 text-[#6b6b78] text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#6b6b78]">
            <div className="text-5xl mb-3">👥</div>
            <p className="font-semibold">Aucun participant trouvé</p>
          </div>
        ) : (
          <>
            {/* Mobile : cartes */}
            <div className="lg:hidden flex flex-col gap-2">
              {filtered.map(p => (
                <div key={p.id} className="bg-white border border-[#ececf0] rounded-xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#3d1163] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {p.user.nom?.[0]}{p.user.prenoms?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[#1F1B2E] truncate">
                      {p.user.prenoms} {p.user.nom}
                    </div>
                    <div className="text-[11px] text-[#6b6b78] truncate">
                      {p.user.matricule ?? '—'} · {p.parish?.nom ?? '—'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Pill variant={ADHESION_PILL[p.adhesionStatusSnapshot]} className="text-[10px]">
                      {ADHESION_LABELS[p.adhesionStatusSnapshot]}
                    </Pill>
                    <Pill variant={PARTICIPATION_PILL[p.participationStatus]} className="text-[10px]">
                      {PARTICIPATION_LABELS[p.participationStatus]}
                    </Pill>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop : table */}
            <div className="hidden lg:block bg-white border border-[#ececf0] rounded-2xl overflow-hidden">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f9f9fc] text-[#6b6b78] uppercase tracking-wide">
                    {['Nom', 'Matricule', 'Paroisse', 'District', 'Adhésion', 'Statut'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold border-b border-[#ececf0]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b border-[#f0f0f4] hover:bg-[#fafafc]">
                      <td className="px-4 py-3 font-semibold text-[#1F1B2E]">{p.user.prenoms} {p.user.nom}</td>
                      <td className="px-4 py-3 text-[#6b6b78] font-mono">{p.user.matricule ?? '—'}</td>
                      <td className="px-4 py-3 text-[#6b6b78]">{p.parish?.nom ?? '—'}</td>
                      <td className="px-4 py-3 text-[#6b6b78]">{p.district?.nom ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Pill variant={ADHESION_PILL[p.adhesionStatusSnapshot]}>
                          {ADHESION_LABELS[p.adhesionStatusSnapshot]}
                        </Pill>
                      </td>
                      <td className="px-4 py-3">
                        <Pill variant={PARTICIPATION_PILL[p.participationStatus]}>
                          {PARTICIPATION_LABELS[p.participationStatus]}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      )}

      {!selectedCampId && !loadingCamps && (
        <div className="flex flex-col items-center justify-center py-16 text-[#6b6b78]">
          <div className="text-5xl mb-3">⛺</div>
          <p className="font-semibold">Sélectionnez un camp pour voir les participants</p>
        </div>
      )}
    </div>
  );
}

export default function ParticipantsPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-[#6b6b78] text-sm">Chargement…</div>}>
      <ParticipantsContent />
    </Suspense>
  );
}
