'use client';
import { useEffect, useRef } from 'react';
import { GardiensBlazon } from '@/components/layout/GardiensBlazon';

const SUBTITLE = 'des gardiens de la création';

export function HeroSection() {
  const sunRef = useRef<HTMLDivElement>(null);

  /* Soleil levant — animation légère au montage */
  useEffect(() => {
    const el = sunRef.current;
    if (!el) return;
    el.style.transform = 'translateY(24px)';
    el.style.opacity = '0';
    const raf = requestAnimationFrame(() => {
      el.style.transition = 'transform 1.8s cubic-bezier(.22,.68,0,1.2), opacity 1.4s ease';
      el.style.transform = 'translateY(0)';
      el.style.opacity = '1';
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="relative text-white overflow-hidden flex-shrink-0"
      style={{
        minHeight: 'clamp(320px, 45vh, 480px)',
        background:
          'linear-gradient(180deg, #0a0614 0%, #1a0a2e 12%, #3d1060 28%, #7a2820 55%, #c75c2a 72%, #f0903a 85%, #ffd580 100%)',
      }}
    >
      {/* Étoiles */}
      <StarField />

      {/* Halo du soleil */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
        style={{
          bottom: 'clamp(60px, 14%, 110px)',
          width: 'clamp(200px, 42vw, 380px)',
          height: 'clamp(200px, 42vw, 380px)',
          background:
            'radial-gradient(circle, rgba(255,213,100,.22) 0%, rgba(255,140,60,.12) 40%, transparent 72%)',
          filter: 'blur(2px)',
        }}
      />

      {/* Soleil */}
      <div
        ref={sunRef}
        className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
        style={{
          bottom: 'clamp(70px, 15%, 120px)',
          width: 'clamp(68px, 13vw, 110px)',
          height: 'clamp(68px, 13vw, 110px)',
          background: 'radial-gradient(circle at 38% 38%, #fff8e0, #ffd060 40%, #ff8c20)',
          boxShadow:
            '0 0 60px 20px rgba(255,180,60,.55), 0 0 120px 40px rgba(255,120,30,.25)',
        }}
      />

      {/* Ligne d'horizon */}
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: 'clamp(50px, 11%, 90px)',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(255,200,80,.6) 30%, rgba(255,200,80,.6) 70%, transparent)',
        }}
      />

      {/* Vague de base */}
      <svg
        className="absolute bottom-0 left-0 right-0 w-full"
        style={{ height: 'clamp(48px, 9vw, 80px)' }}
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
      >
        <path
          d="M0,80 C200,30 400,65 600,42 C800,18 1000,55 1200,35 C1350,18 1410,40 1440,38 L1440,80 Z"
          fill="#f6f6fa"
        />
      </svg>

      {/* Contenu central */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-8 pb-24 lg:pb-28"
        style={{ minHeight: 'inherit' }}>
        <GardiensBlazon size={72} className="mb-5 drop-shadow-2xl" />

        <h1
          className="font-black leading-tight"
          style={{
            fontSize: 'clamp(1.65rem, 5vw, 3.2rem)',
            textShadow: '0 4px 24px rgba(0,0,0,.55)',
            letterSpacing: '-0.01em',
          }}
        >
          À la quête de la nouvelle lignée
        </h1>

        {/* Sous-titre avec ondulation lettre par lettre */}
        <p
          className="mt-3 font-semibold"
          style={{
            fontSize: 'clamp(.85rem, 2.2vw, 1.1rem)',
            letterSpacing: '.06em',
            opacity: 0.88,
          }}
          aria-label={SUBTITLE}
        >
          {SUBTITLE.split('').map((ch, i) => (
            <span
              key={i}
              className="inline-block"
              style={{
                animation: `wave-char 2.8s ease-in-out ${(i * 0.07).toFixed(2)}s infinite`,
                whiteSpace: ch === ' ' ? 'pre' : undefined,
              }}
            >
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </p>

        <style>{`
          @keyframes wave-char {
            0%,100% { transform: translateY(0); }
            45%      { transform: translateY(-7px); }
          }
        `}</style>
      </div>
    </div>
  );
}

/* ── Champ d'étoiles statique (SVG léger) ── */
function StarField() {
  const stars = [
    [12,8],[22,5],[35,3],[48,9],[60,4],[75,7],[88,11],[8,20],[30,18],[55,14],[70,22],[92,6],
    [18,30],[42,26],[65,32],[85,28],[5,40],[25,38],[50,42],[78,35],[95,43],
  ] as [number, number][];

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: .7 }}>
      {stars.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={`${cx}%`}
          cy={`${cy}%`}
          r={i % 3 === 0 ? 1.4 : 0.8}
          fill="white"
          style={{
            animation: `twinkle ${2 + (i % 5) * .4}s ease-in-out ${(i * .2) % 2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          0%,100% { opacity:.9 }
          50%      { opacity:.25 }
        }
      `}</style>
    </svg>
  );
}
