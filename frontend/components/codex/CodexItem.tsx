'use client';
import Image from 'next/image';
import { useState } from 'react';
import type { Submission } from '@/types';
import { formatDateFr } from '@/lib/format';
import { Avatar, Pill } from '@/components/ui';
import { getCodexReactionCount } from '@/hooks/useCodexReactions';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:4000';

function toRelativePath(url: string): string {
  try { return new URL(url).pathname; } catch { return url; }
}

const CAT_VARIANTS: Record<string, 'rouge' | 'vert' | 'violet' | 'or'> = {
  PERSONNEL: 'rouge', COMMUNAUTAIRE: 'vert', SPIRITUEL: 'violet', LONG: 'or',
};
const CAT_LABELS: Record<string, string> = {
  PERSONNEL: 'Personnel', COMMUNAUTAIRE: 'Communautaire', SPIRITUEL: 'Spirituel', LONG: 'Défi long',
};
const CAT_BG: Record<string, string> = {
  PERSONNEL:     'from-[#F58A4B] to-[#7A2820]',
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
  priority?: boolean;
  canReact?: boolean;
  isReacting?: boolean;
  onReact?: (id: string) => void;
  onUnreact?: (id: string) => void;
}

export function CodexItem({
  submission, reactCount, hasReacted, priority = false,
  canReact = false, isReacting = false, onReact, onUnreact,
}: CodexItemProps) {
  const [imgError, setImgError] = useState(false);
  const g   = submission.gardien;
  const cat = submission.challenge?.categorie ?? 'COMMUNAUTAIRE';
  const initials = g ? `${g.nom?.[0] ?? ''}${g.prenoms?.[0] ?? ''}`.toUpperCase() : '?';
  const count = reactCount ?? getCodexReactionCount(submission);
  const reacted = hasReacted ?? false;
  const reactionDisabled = !canReact || isReacting;

  const imageUrl = submission.preuveUrl && !imgError
    ? toRelativePath(
        submission.preuveUrl.startsWith('http')
          ? submission.preuveUrl
          : `${API_BASE}${submission.preuveUrl}`,
      )
    : null;

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#e8dfc8] shadow-sm mb-4">

      {/* ── En-tête auteur ── */}
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <Avatar initials={initials} size={38} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[13px] text-[#1F1B2E] truncate">
            {g?.prenoms} {g?.nom}
          </div>
          <div className="text-[11px] text-[#8b7b5c] mt-0.5 truncate">
            {g?.parish?.nom ?? g?.district?.nom ?? 'Communauté'}
          </div>
          <div className="text-[11px] text-[#8b7b5c] mt-0.5">
            ✅ Réalisé le {formatDateFr(submission.validatedAt ?? submission.submittedAt, { day: 'numeric', month: 'long', year: 'numeric' })}
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
      <div className={`relative ${imageUrl ? 'h-48' : 'h-24'} overflow-hidden`}>
        {imageUrl ? (
          <>
            <Image
              src={imageUrl}
              alt={submission.challenge?.titre ?? 'Preuve'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 480px"
              priority={priority}
              loading={priority ? 'eager' : 'lazy'}
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${CAT_BG[cat]} flex items-center justify-center`}>
            <span className="text-5xl opacity-25">{CAT_ICON[cat]}</span>
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
          disabled={reactionDisabled}
          onClick={() => {
            if (reactionDisabled) return;
            if (reacted) onUnreact?.(submission.id);
            else onReact?.(submission.id);
          }}
          title={!canReact ? 'Connecte-toi pour réagir' : isReacting ? 'Synchronisation…' : undefined}
          className={`flex items-center gap-1.5 text-[12px] font-semibold rounded-full px-3 py-1.5 transition-all ${
            !canReact
              ? 'bg-[#f5eed8] text-[#c0b49a] cursor-not-allowed'
              : reacted
                ? 'bg-[#fff8f3] text-[#E55A35] hover:bg-[#ffe8d8]'
                : 'bg-[#f5eed8] text-[#8b7b5c] hover:bg-[#fff8f3] hover:text-[#E55A35]'
          } ${isReacting ? 'opacity-70 cursor-wait' : ''}`}
        >
          {reacted ? '❤️' : '🤍'} {count > 0 ? count : ''}
          <span className="text-[11px] font-normal">{reacted ? 'Aimé' : "J'aime"}</span>
        </button>
      </div>
    </div>
  );
}
