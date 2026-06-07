'use client';
import { useEffect, useState, useCallback } from 'react';
import type { Badge } from '@/types';

const LEVEL_GRADIENT: Record<string, string> = {
  BRONZE:  'from-amber-600 to-amber-800',
  ARGENT:  'from-slate-300 to-slate-500',
  OR:      'from-yellow-400 to-amber-600',
  LEGENDE: 'from-purple-500 to-indigo-700',
};
const LEVEL_GLOW: Record<string, string> = {
  BRONZE:  'shadow-amber-500/60',
  ARGENT:  'shadow-slate-300/60',
  OR:      'shadow-yellow-400/70',
  LEGENDE: 'shadow-purple-500/70',
};
const LEVEL_EMOJI: Record<string, string> = {
  BRONZE: '🪨', ARGENT: '🥈', OR: '🏅', LEGENDE: '⚜️',
};
const PARTICLES = ['✨', '⭐', '🌟', '💫', '🎉', '🏅', '✨', '⭐'];

interface Particle {
  id: number;
  emoji: string;
  x: number;
  delay: number;
  duration: number;
  size: number;
}

function generateParticles(): Particle[] {
  return PARTICLES.map((emoji, i) => ({
    id: i,
    emoji,
    x: 5 + (i / PARTICLES.length) * 90,
    delay: i * 0.15,
    duration: 1.4 + (i % 3) * 0.3,
    size: 16 + (i % 3) * 8,
  }));
}

interface Props {
  badges: Badge[];
  onClose: () => void;
}

export function BadgeUnlockModal({ badges, onClose }: Props) {
  const [index, setIndex]       = useState(0);
  const [phase, setPhase]       = useState<'enter' | 'idle' | 'exit'>('enter');
  const [particles]             = useState(generateParticles);

  const badge = badges[index];
  const isLast = index === badges.length - 1;

  // Séquence d'entrée automatique
  useEffect(() => {
    setPhase('enter');
    const t = setTimeout(() => setPhase('idle'), 50);
    return () => clearTimeout(t);
  }, [index]);

  const advance = useCallback(() => {
    if (isLast) {
      setPhase('exit');
      setTimeout(onClose, 350);
    } else {
      setPhase('exit');
      setTimeout(() => {
        setIndex(i => i + 1);
      }, 300);
    }
  }, [isLast, onClose]);

  // Fermeture clavier
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') advance(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [advance]);

  if (!badge) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={advance}
      />

      {/* Particules */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map(p => (
          <span
            key={p.id}
            className="absolute bottom-0 select-none"
            style={{
              left: `${p.x}%`,
              fontSize: p.size,
              animation: `floatUp ${p.duration}s ${p.delay}s ease-out infinite`,
              opacity: 0,
            }}
          >
            {p.emoji}
          </span>
        ))}
      </div>

      {/* Carte badge */}
      <div
        className={`relative z-10 w-full max-w-sm transition-all duration-300 ease-out ${
          phase === 'enter'
            ? 'opacity-0 scale-50 translate-y-8'
            : phase === 'idle'
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-90 -translate-y-4'
        }`}
      >
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">

          {/* En-tête coloré */}
          <div className={`bg-gradient-to-br ${LEVEL_GRADIENT[badge.niveau] ?? 'from-gray-400 to-gray-600'} p-8 flex flex-col items-center gap-3`}>
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest">
              Artefact débloqué !
            </p>

            <div
              className={`w-24 h-24 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-5xl shadow-xl ${LEVEL_GLOW[badge.niveau] ?? ''} shadow-lg`}
              style={{ animation: 'pulseBadge 1.8s ease-in-out infinite' }}
            >
              {LEVEL_EMOJI[badge.niveau] ?? '🏅'}
            </div>

            <h2 className="text-white text-xl font-black text-center leading-tight mt-1">
              {badge.nom}
            </h2>

            <span className="bg-white/25 text-white text-[11px] font-bold px-3 py-1 rounded-full">
              {badge.niveau}
            </span>
          </div>

          {/* Corps */}
          <div className="p-5">
            {badge.description && (
              <p className="text-sm text-[#1F1B2E] text-center leading-relaxed mb-3">
                {badge.description}
              </p>
            )}

            <div className="bg-[#f7f5ff] border border-[#6A1B9A]/15 rounded-xl p-3 mb-5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#6A1B9A] mb-1">Comment il a été obtenu</p>
              <p className="text-xs text-[#1F1B2E] leading-relaxed">{badge.condition}</p>
            </div>

            {/* Navigation multi-badges */}
            {badges.length > 1 && (
              <div className="flex justify-center gap-1.5 mb-4">
                {badges.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-200 ${
                      i === index
                        ? 'w-5 h-2 bg-[#C62828]'
                        : i < index
                          ? 'w-2 h-2 bg-[#C62828]/40'
                          : 'w-2 h-2 bg-[#e0e0e8]'
                    }`}
                  />
                ))}
              </div>
            )}

            <button
              onClick={advance}
              className="w-full py-3.5 rounded-2xl bg-[#C62828] text-white font-bold text-sm hover:bg-[#b51d1d] active:scale-95 transition-all"
            >
              {isLast ? '🎉 Continuer' : `Suivant · ${index + 1} / ${badges.length}`}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) rotate(0deg);   opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes pulseBadge {
          0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
          50%       { transform: scale(1.07); box-shadow: 0 0 0 16px rgba(255,255,255,0); }
        }
      `}</style>
    </div>
  );
}
