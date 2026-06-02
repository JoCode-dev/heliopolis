'use client';
import Image from 'next/image';
import type { Submission } from '@/types';
import { formatDateFr } from '@/lib/format';
import { Avatar, Pill } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:4000';

const CAT_VARIANTS: Record<string, 'rouge' | 'vert' | 'violet' | 'or'> = {
  PERSONNEL: 'rouge', COMMUNAUTAIRE: 'vert', SPIRITUEL: 'violet', LONG: 'or',
};
const CAT_LABELS: Record<string, string> = {
  PERSONNEL: 'Personnel', COMMUNAUTAIRE: 'Communautaire', SPIRITUEL: 'Spirituel', LONG: 'Défi long',
};
const CAT_BG: Record<string, string> = {
  PERSONNEL:     'from-[#C62828] to-[#7a1717]',
  COMMUNAUTAIRE: 'from-[#2E7D32] to-[#1a5021]',
  SPIRITUEL:     'from-[#6A1B9A] to-[#3d1163]',
  LONG:          'from-[#D9A441] to-[#8c6918]',
};
const CAT_ICON: Record<string, string> = {
  PERSONNEL: '🔥', COMMUNAUTAIRE: '🌿', SPIRITUEL: '✨', LONG: '🏔️',
};

interface CodexItemProps {
  submission: Submission;
  reactCount?: number;
  hasReacted?: boolean;
  onReact?: (id: string) => void;
}

export function CodexItem({ submission, reactCount, hasReacted, onReact }: CodexItemProps) {
  const g   = submission.gardien;
  const cat = submission.challenge?.categorie ?? 'COMMUNAUTAIRE';
  const initials = g ? `${g.nom?.[0] ?? ''}${g.prenoms?.[0] ?? ''}`.toUpperCase() : '?';
  const count = reactCount ?? submission._count?.reactions ?? submission.reactions?.length ?? 0;
  const reacted = hasReacted ?? false;

  const imageUrl = submission.preuveUrl
    ? submission.preuveUrl.startsWith('http')
      ? submission.preuveUrl
      : `${API_BASE}${submission.preuveUrl}`
    : null;

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#e8dfc8] mb-3.5 shadow-sm">

      {/* ── En-tête auteur ── */}
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <Avatar initials={initials} size={38} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[13px] text-[#1F1B2E] truncate">
            {g?.prenoms} {g?.nom}
          </div>
          <div className="text-[11px] text-[#8b7b5c] mt-0.5 truncate">
            {g?.parish?.nom ?? g?.district?.nom ?? 'Communauté'} · {formatDateFr(submission.submittedAt)}
          </div>
        </div>
        <Pill variant={CAT_VARIANTS[cat]} className="flex-shrink-0 text-[10px]">
          {CAT_ICON[cat]} {CAT_LABELS[cat]}
        </Pill>
      </div>

      {/* ── Nom du défi ── */}
      {submission.challenge?.titre && (
        <div className="px-3.5 pb-2">
          <span className="inline-flex items-center gap-1 bg-[#f5eed8] text-[#8b7b5c] text-[11px] font-semibold px-2 py-0.5 rounded-lg border border-[#e0d8c0]">
            🎯 {submission.challenge.titre}
          </span>
        </div>
      )}

      {/* ── Image ou gradient ── */}
      <div className={`relative ${imageUrl ? 'h-52' : 'h-40'} overflow-hidden`}>
        {imageUrl ? (
          <>
            <Image
              src={imageUrl}
              alt={submission.challenge?.titre ?? 'Preuve'}
              fill
              className="object-cover"
              sizes="(max-width: 448px) 100vw, 448px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${CAT_BG[cat]}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            {/* Icône centrale */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl opacity-20">{CAT_ICON[cat]}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Texte / légende ── */}
      {submission.texte && (
        <p className="px-3.5 py-3 text-[13px] leading-relaxed text-[#1F1B2E] italic border-t border-[#f0e8d8]">
          « {submission.texte} »
        </p>
      )}

      {/* ── Pied : réactions ── */}
      <div className="flex items-center gap-3 px-3.5 py-2.5 border-t border-[#f0e8d8]">
        <button
          onClick={() => onReact?.(submission.id)}
          disabled={reacted}
          className={`flex items-center gap-1.5 text-[12px] font-semibold rounded-full px-3 py-1.5 transition-all ${
            reacted
              ? 'bg-[#ffe6e6] text-[#C62828] cursor-default'
              : 'bg-[#f5eed8] text-[#8b7b5c] hover:bg-[#ffe6e6] hover:text-[#C62828]'
          }`}
        >
          {reacted ? '❤️' : '🤍'} {count > 0 ? count : ''}
          <span className="text-[11px] font-normal">{reacted ? 'Aimé' : "J'aime"}</span>
        </button>
      </div>
    </div>
  );
}
