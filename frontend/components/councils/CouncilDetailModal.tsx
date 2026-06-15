'use client';

import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import type { Council, CouncilParticipant, CouncilStatus } from '@/types';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

const STATUS_STYLE: Record<CouncilStatus, { label: string; bg: string; text: string; border: string }> = {
  PLANIFIE: { label: '📅 Planifié', bg: 'bg-[#EDE7F6]', text: 'text-[#6A1B9A]', border: 'border-[#ce93d8]' },
  EN_COURS: { label: '🔴 En cours', bg: 'bg-[#fff8e1]', text: 'text-[#D9A441]', border: 'border-[#ffe082]' },
  TERMINE:  { label: '✓ Terminé', bg: 'bg-[#e8f5e9]', text: 'text-[#2E7D32]', border: 'border-[#a5d6a7]' },
  ANNULE:   { label: '✕ Annulé', bg: 'bg-[#f5f5f5]', text: 'text-[#9b9ba8]', border: 'border-[#e0e0e0]' },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function avgNote(participants: CouncilParticipant[]) {
  const rated = participants.filter(p => p.note != null);
  if (rated.length === 0) return null;
  const sum = rated.reduce((acc, p) => acc + (p.note ?? 0), 0);
  return (sum / rated.length).toFixed(1);
}

export function CouncilDetailModal({
  council,
  participants,
  loadingParticipants,
  onClose,
}: {
  council: Council;
  participants: CouncilParticipant[];
  loadingParticipants: boolean;
  onClose: () => void;
}) {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const st = STATUS_STYLE[council.statut];
  const territory = council.parish?.nom ?? council.district?.nom ?? council.region?.nom;
  const qrUrl = council.qrToken ? `${SITE_URL}/conseil/${council.qrToken}` : '';
  const noteAvg = avgNote(participants);

  const copyLink = async () => {
    if (!qrUrl) return;
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const downloadQr = () => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `conseil-${council.nom.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#1F1B2E] to-[#3a1d4d] text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-bold text-base truncate">{council.nom}</h2>
            <p className="text-[11px] opacity-75 mt-0.5">Détail du conseil</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-sm flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* Infos */}
          <div className="space-y-2">
            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.bg} ${st.text} ${st.border}`}>
              {st.label}
            </span>
            <div className="flex flex-col gap-1 text-[12px] text-[#6b6b78]">
              <span>📅 {fmtDate(council.date)}</span>
              {council.lieu && <span>📍 {council.lieu}</span>}
              {territory && <span>🗺️ {territory}</span>}
              {council.description && (
                <p className="text-[11px] text-[#9b9ba8] italic mt-1">{council.description}</p>
              )}
            </div>
          </div>

          {/* QR Code */}
          {qrUrl && (
            <div className="bg-[#f6f6fa] rounded-2xl p-4 flex flex-col items-center gap-3">
              <p className="text-xs font-semibold text-[#1F1B2E]">QR code d&apos;inscription</p>
              <div className="bg-white p-3 rounded-xl shadow-sm">
                <QRCodeCanvas
                  ref={qrRef}
                  value={qrUrl}
                  size={160}
                  level="M"
                  includeMargin
                />
              </div>
              <p className="text-[10px] text-[#9b9ba8] text-center break-all px-2">{qrUrl}</p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={copyLink}
                  className="flex-1 py-2 rounded-xl text-[11px] font-semibold bg-white border border-[#ececf0] text-[#6A1B9A] hover:bg-[#EDE7F6] transition"
                >
                  {copied ? '✓ Copié' : 'Copier le lien'}
                </button>
                <button
                  onClick={downloadQr}
                  className="flex-1 py-2 rounded-xl text-[11px] font-semibold bg-[#1F1B2E] text-white hover:bg-[#2d2640] transition"
                >
                  Télécharger
                </button>
              </div>
            </div>
          )}

          {/* Participants */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#1F1B2E]">
                Participants ({participants.length})
              </h3>
              {noteAvg && (
                <span className="text-[11px] font-semibold text-[#D9A441]">
                  ★ {noteAvg} / 5
                </span>
              )}
            </div>

            {loadingParticipants && (
              <p className="text-xs text-[#9b9ba8] text-center py-6">Chargement…</p>
            )}

            {!loadingParticipants && participants.length === 0 && (
              <div className="text-center py-8 text-[#9b9ba8]">
                <div className="text-3xl mb-2">👥</div>
                <p className="text-xs font-semibold">Aucun participant pour le moment</p>
              </div>
            )}

            {!loadingParticipants && participants.length > 0 && (
              <div className="flex flex-col gap-2">
                {participants.map(p => (
                  <div
                    key={p.id}
                    className="bg-[#f6f6fa] rounded-xl px-3.5 py-3 border border-[#ececf0]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-bold text-[#1F1B2E]">
                          {p.prenoms} {p.nom}
                        </p>
                        {p.fonction && (
                          <p className="text-[10px] text-[#6A1B9A] font-semibold mt-0.5">{p.fonction}</p>
                        )}
                      </div>
                      {p.note != null && (
                        <span className="text-[11px] font-bold text-[#D9A441] flex-shrink-0">
                          {'★'.repeat(p.note)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[#9b9ba8]">
                      {p.contact && <span>📞 {p.contact}</span>}
                      {p.parish && <span>⛪ {p.parish.nom}</span>}
                      {p.district && !p.parish && <span>🗺️ {p.district.nom}</span>}
                      <span>🕐 {fmtTime(p.registeredAt)}</span>
                    </div>
                    {p.avis && (
                      <p className="mt-2 text-[11px] text-[#6b6b78] italic leading-relaxed">
                        « {p.avis} »
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[#f0f0f0] flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#f7f7fa] text-[#6b6b78] hover:bg-[#ebebf0] transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
