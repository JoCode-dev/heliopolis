'use client';
import { useEffect, useState } from 'react';
import { campsApi, exportApi } from '@/lib/api';
import { usePastoralYear } from '@/store/pastoralYear';
import { Select } from '@/components/ui';
import type { Camp, CampParticipant, AdhesionStatus, ParticipationStatus } from '@/types';

const ADHESION_LABELS: Record<AdhesionStatus, string> = {
  A_JOUR:    'À jour',
  NON_A_JOUR: 'Non à jour',
  EN_ATTENTE: 'En attente',
};
const ADHESION_COLOR: Record<AdhesionStatus, string> = {
  A_JOUR:    'bg-green-100 text-green-700',
  NON_A_JOUR: 'bg-amber-100 text-amber-700',
  EN_ATTENTE: 'bg-purple-100 text-purple-700',
};

const PARTICIPATION_LABELS: Record<ParticipationStatus, string> = {
  SELECTIONNE:     'Sélectionné',
  CONFIRME:        'Confirmé',
  PRESENT:         'Présent',
  ABSENT:          'Absent',
  DESISTE:         'Désisté',
  NON_SELECTIONNE: 'Non sélectionné',
  EN_ATTENTE:      'En attente',
  BLOQUE:          'Bloqué',
};
const PARTICIPATION_COLOR: Record<ParticipationStatus, string> = {
  SELECTIONNE:     'bg-blue-100 text-blue-700',
  CONFIRME:        'bg-green-100 text-green-700',
  PRESENT:         'bg-green-100 text-green-700',
  ABSENT:          'bg-red-100 text-red-700',
  DESISTE:         'bg-red-100 text-red-700',
  NON_SELECTIONNE: 'bg-gray-100 text-gray-500',
  EN_ATTENTE:      'bg-amber-100 text-amber-700',
  BLOQUE:          'bg-gray-200 text-gray-600',
};

export default function ExportPage() {
  const annee = usePastoralYear(s => s.annee);
  const [camps, setCamps]       = useState<Camp[]>([]);
  const [campId, setCampId]     = useState('');
  const [participants, setParticipants]             = useState<CampParticipant[]>([]);
  const [participantsCampId, setParticipantsCampId] = useState('');
  const [loadingParts, setLoadingParts] = useState(false);
  const [downloading, setDownloading]   = useState(false);
  const [dlAdhesions, setDlAdhesions]   = useState(false);
  const [cotisationCampId, setCotisationCampId] = useState('');
  const [cotisationAnnee, setCotisationAnnee]   = useState<number>(new Date().getFullYear());

  useEffect(() => { setCotisationAnnee(annee); }, [annee]);

  useEffect(() => {
    campsApi.list().then(r => {
      setCamps(r.data);
      if (r.data.length > 0) setCampId(r.data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!campId) return;
    let cancelled = false;
    setLoadingParts(true);
    campsApi.participants(campId)
      .then(r => {
        if (cancelled) return;
        setParticipants(r.data);
        setParticipantsCampId(campId);
      })
      .catch(() => {
        if (cancelled) return;
        setParticipants([]);
        setParticipantsCampId(campId);
      })
      .finally(() => { if (!cancelled) setLoadingParts(false); });
    return () => { cancelled = true; };
  }, [campId]);

  const selectedCamp  = camps.find(c => c.id === campId);
  const preview       = participantsCampId === campId ? participants : [];
  const previewReady  = participantsCampId === campId && !loadingParts;

  const handleDownload = async () => {
    if (!campId) return;
    setDownloading(true);
    try {
      const { data } = await exportApi.campParticipantsFile(campId);
      const href = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = href;
      link.download = `participants-${selectedCamp?.nom ?? campId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAdhesions = async () => {
    setDlAdhesions(true);
    try {
      const { data } = await exportApi.adhesionsFile(cotisationAnnee, cotisationCampId || undefined);
      const href = URL.createObjectURL(data);
      const link = document.createElement('a');
      const campLabel = cotisationCampId
        ? (camps.find(c => c.id === cotisationCampId)?.nom ?? cotisationCampId)
        : 'tous';
      link.href = href;
      link.download = `cotisations-${cotisationAnnee}-${campLabel}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } finally {
      setDlAdhesions(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6 space-y-8">

      {/* En-tête */}
      <div className="flex items-center justify-between border-b border-[#ececf0] pb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E]">📤 Export Excel</h1>
          <p className="text-xs text-[#6b6b78] mt-0.5">Exports disponibles dans votre périmètre</p>
        </div>
      </div>

      {/* ── Section cotisations ── */}
      <div>
        <h2 className="text-sm font-bold text-[#1F1B2E] mb-3">📋 Cotisations</h2>
        <div className="bg-white border border-[#ececf0] rounded-2xl p-5 space-y-4">
          <p className="text-xs text-[#6b6b78] leading-relaxed">
            Export des Gardiens, Guides et Sentinelles avec leur statut de cotisation.
            Les membres sans cotisation enregistrée apparaissent comme « Non renseigné ».
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Année */}
            <div>
              <label className="block text-xs font-semibold text-[#555566] mb-1.5">Année</label>
              <input
                type="number"
                min={2000}
                max={2100}
                value={cotisationAnnee}
                onChange={e => setCotisationAnnee(parseInt(e.target.value, 10) || annee)}
                className="w-full border border-[#ddd] rounded-xl px-3 py-2.5 text-sm font-bold text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#C62828]/30 focus:border-[#C62828]"
              />
            </div>

            {/* Camp */}
            <div>
              <label className="block text-xs font-semibold text-[#555566] mb-1.5">Camp (optionnel)</label>
              <Select
                value={cotisationCampId}
                onChange={e => setCotisationCampId(e.target.value)}
                className="w-full"
              >
                <option value="">Tous les membres</option>
                {camps.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </Select>
            </div>
          </div>

          {cotisationCampId && (
            <p className="text-[11px] text-[#9b9ba8] -mt-1">
              Seuls les participants sélectionnés pour ce camp seront exportés.
            </p>
          )}

          <button
            type="button"
            onClick={handleDownloadAdhesions}
            disabled={dlAdhesions || !cotisationAnnee}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-[#C62828] to-[#8e1a1a] text-white font-bold text-sm py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {dlAdhesions ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Téléchargement…
              </>
            ) : `📥 Télécharger .xlsx — ${cotisationAnnee}`}
          </button>
        </div>
      </div>

      {/* ── Section participants par camp ── */}
      <div>
        <h2 className="text-sm font-bold text-[#1F1B2E] mb-3">⛺ Participants par camp</h2>

      <div className="flex flex-col lg:flex-row gap-5 h-full">

        {/* ── Colonne gauche : contrôles ── */}
        <div className="flex flex-col gap-4 lg:w-72 flex-shrink-0">

          {/* Sélection du camp */}
          <div className="bg-white border border-[#ececf0] rounded-2xl p-5">
            <label className="block text-xs font-semibold text-[#1F1B2E] mb-2">Camp</label>
            <Select value={campId} onChange={e => setCampId(e.target.value)} className="w-full">
              {camps.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              {camps.length === 0 && <option value="">Aucun camp disponible</option>}
            </Select>
          </div>

          {/* Stats du camp sélectionné */}
          {previewReady && preview.length > 0 && (
            <div className="bg-white border border-[#ececf0] rounded-2xl p-5 space-y-3">
              <p className="text-xs font-semibold text-[#1F1B2E]">Résumé</p>
              {[
                { label: 'Total participants', value: preview.length, color: '#1F1B2E' },
                { label: 'Adhésions à jour', value: preview.filter(p => p.adhesionStatusSnapshot === 'A_JOUR').length, color: '#2E7D32' },
                { label: 'Non à jour', value: preview.filter(p => p.adhesionStatusSnapshot === 'NON_A_JOUR').length, color: '#C62828' },
              ].map(s => (
                <div key={s.label} className="flex justify-between items-center text-xs">
                  <span className="text-[#6b6b78]">{s.label}</span>
                  <span className="font-black text-base" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-[11px] text-amber-700 leading-relaxed">
              ℹ️ Export limité à votre périmètre.<br />
              Aucun montant de cotisation n&apos;est exporté.
            </p>
          </div>

          {/* Bouton */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={!campId || downloading || !previewReady}
            className="w-full flex items-center justify-center gap-2 bg-[#1F1B2E] text-white font-bold text-sm py-3 rounded-xl hover:bg-[#2d2640] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Téléchargement…
              </>
            ) : '📥 Télécharger .xlsx'}
          </button>
          {selectedCamp && previewReady && (
            <p className="text-[11px] text-[#6b6b78] text-center -mt-2 truncate">{selectedCamp.nom}</p>
          )}
        </div>

        {/* ── Colonne droite : aperçu ── */}
        <div className="flex-1 min-w-0 bg-white border border-[#ececf0] rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f0f0f4] flex-shrink-0">
            <span className="text-sm font-bold text-[#1F1B2E]">Aperçu</span>
            {previewReady && (
              <span className="text-xs text-[#6b6b78]">
                5 premières lignes sur {preview.length}
              </span>
            )}
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-xs">
              <thead className="sticky top-0">
                <tr className="bg-[#f9f9fc] text-[#6b6b78] uppercase tracking-wide">
                  {['N°', 'Nom', 'Matricule', 'Paroisse', 'District', 'Adhésion', 'Statut'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold border-b border-[#ececf0] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!previewReady && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[#6b6b78]">
                      <div className="inline-block w-5 h-5 border-2 border-[#ececf0] border-t-[#C62828] rounded-full animate-spin" />
                    </td>
                  </tr>
                )}
                {previewReady && preview.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[#6b6b78]">
                      Aucun participant sélectionné pour ce camp.
                    </td>
                  </tr>
                )}
                {previewReady && preview.slice(0, 5).map((p, i) => (
                  <tr key={p.id} className="border-b border-[#f0f0f4] hover:bg-[#fafafc]">
                    <td className="px-4 py-3 text-[#6b6b78]">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-[#1F1B2E] whitespace-nowrap">
                      {p.user.prenoms} {p.user.nom}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#6b6b78] whitespace-nowrap">{p.user.matricule ?? '—'}</td>
                    <td className="px-4 py-3 text-[#6b6b78]">{p.parish?.nom ?? '—'}</td>
                    <td className="px-4 py-3 text-[#6b6b78]">{p.district?.nom ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${ADHESION_COLOR[p.adhesionStatusSnapshot]}`}>
                        {ADHESION_LABELS[p.adhesionStatusSnapshot]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${PARTICIPATION_COLOR[p.participationStatus]}`}>
                        {PARTICIPATION_LABELS[p.participationStatus]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>{/* /Section participants par camp */}
    </div>
  );
}
