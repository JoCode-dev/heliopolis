'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { GardiensBlazon } from '@/components/layout/GardiensBlazon';

const SUBTITLE = 'des gardiens de la création';

export function HeroSection() {
  const sunRef  = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sun  = sunRef.current;
    const halo = haloRef.current;
    if (!sun || !halo) return;

    // Preserve translateX(-50%) throughout animation for correct centering
    sun.style.transform  = 'translateX(-50%) translateY(120px)';
    sun.style.opacity    = '0';
    halo.style.transform = 'translateX(-50%) translateY(120px)';
    halo.style.opacity   = '0';

    const raf = requestAnimationFrame(() => {
      sun.style.transition  = 'transform 3.2s cubic-bezier(.18,.65,0,1.08), opacity 2.4s ease';
      halo.style.transition = 'transform 3.2s cubic-bezier(.18,.65,0,1.08), opacity 3s ease .5s';
      sun.style.transform   = 'translateX(-50%) translateY(0)';
      sun.style.opacity     = '1';
      halo.style.transform  = 'translateX(-50%) translateY(0)';
      halo.style.opacity    = '1';
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="relative text-white overflow-hidden w-full h-full"
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(180deg, #FFB36B 0%, #F58A4B 35%, #E55A35 65%, #7A2820 100%)',
      }}
    >
      <style>{`
        /* ── Mountains ── */
        .mtn-hero {
          position: absolute;
          bottom: 0;
          pointer-events: none;
          /* Desktop: full width */
          width: 100%;
          left: 0;
          right: 0;
        }
        /* Desktop mountain heights */
        .mtn-1 { height: 55vh; }
        .mtn-2 { height: 60vh; }
        .mtn-3 { height: 67vh; }
        .mtn-4 { height: 74vh; }
        .mtn-5 { height: 82vh; }

        /* Mobile: wider than viewport to reduce peak distortion from aspect-ratio squeeze */
        @media (max-width: 767px) {
          .mtn-hero {
            width: 720px !important;
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%);
          }
          .mtn-1 { height: 44vh; }
          .mtn-2 { height: 50vh; }
          .mtn-3 { height: 56vh; }
          .mtn-4 { height: 62vh; }
          .mtn-5 { height: 68vh; }

          /*
           * Soleil levant mobile :
           * pic premier plan ≈ 44vh × 40.3% ≈ 17.7vh du bas
           * rayon soleil = 85px → centre à 17vh+17px → ~58% visible au-dessus des crêtes
           */
          .sun-disc {
            bottom: calc(17vh - 68px) !important;
            left: 58% !important;
          }
          .sun-halo {
            width: 280px !important;
            height: 280px !important;
            bottom: calc(17vh - 123px) !important;
            left: 58% !important;
          }
        }

        /* ── Boutons CTA ── */
        .btn-primary {
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 32px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.12);
          background: linear-gradient(135deg, #2d2845 0%, #181025 100%) !important;
        }
        .btn-primary:active {
          transform: translateY(0px);
          box-shadow: 0 3px 12px rgba(0,0,0,.5);
        }

        .btn-secondary {
          transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .btn-secondary:hover {
          transform: translateY(-3px);
          background: rgba(255,255,255,.38) !important;
          border-color: rgba(255,255,255,.65) !important;
          box-shadow: 0 6px 24px rgba(255,255,255,.18);
        }
        .btn-secondary:active {
          transform: translateY(0px);
        }

        @keyframes wave-char {
          0%,100% { transform: translateY(0); }
          45%      { transform: translateY(-7px); }
        }
      `}</style>

      {/* Profondeur atmosphérique — overlay radial */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background:
            'radial-gradient(circle at 62% 80%, rgba(255,240,180,.28) 0%, transparent 45%), ' +
            'radial-gradient(circle at 15% 20%, rgba(255,200,120,.18) 0%, transparent 40%), ' +
            'radial-gradient(circle at 85% 10%, rgba(180,60,0,.15) 0%, transparent 38%)',
        }}
      />

      {/* Halo solaire */}
      <div
        ref={haloRef}
        className="sun-halo absolute rounded-full pointer-events-none"
        style={{
          zIndex: 2,
          bottom: 'calc(38vh - 36vw)',
          left: '62%',
          width: 'clamp(360px, 72vw, 640px)',
          height: 'clamp(360px, 72vw, 640px)',
          background:
            'radial-gradient(circle, rgba(255,255,200,.6) 0%, rgba(255,210,80,.32) 28%, rgba(255,140,20,.14) 55%, transparent 72%)',
          filter: 'blur(10px)',
        }}
      />

      {/* Disque solaire */}
      <div
        ref={sunRef}
        className="sun-disc absolute rounded-full pointer-events-none"
        style={{
          zIndex: 3,
          bottom: 'calc(38vh - 16vw)',
          left: '62%',
          width: 'clamp(170px, 30vw, 270px)',
          height: 'clamp(170px, 30vw, 270px)',
          background:
            'radial-gradient(circle at 34% 30%, #ffffff 0%, #fff8c0 18%, #ffe040 42%, #ff9000 72%, #d44000 100%)',
          boxShadow:
            '0 0 100px 50px rgba(255,220,80,.85), 0 0 200px 90px rgba(255,150,20,.55), 0 0 340px 130px rgba(220,80,0,.25)',
        }}
      />

      {/* ── Montagnes très lointaines ── */}
      <svg
        className="mtn-hero mtn-5"
        style={{ zIndex: 4 }}
        viewBox="0 0 1440 440"
        preserveAspectRatio="none"
      >
        <path
          d="M0,440 L0,340 L100,310 L220,325 L360,282 L500,305 L640,268 L780,295 L920,272 L1060,298 L1200,278 L1340,302 L1440,285 L1440,440 Z"
          fill="#7a2010"
          fillOpacity="0.45"
        />
        <path
          d="M0,440 L0,370 L140,338 L280,358 L420,312 L560,340 L700,302 L840,332 L980,310 L1120,338 L1260,318 L1440,335 L1440,440 Z"
          fill="#4a1008"
          fillOpacity="0.65"
        />
      </svg>

      {/* ── Montagnes lointaines ── */}
      <svg
        className="mtn-hero mtn-4"
        style={{ zIndex: 5 }}
        viewBox="0 0 1440 390"
        preserveAspectRatio="none"
      >
        <path
          d="M0,390 L0,318 L110,284 L240,308 L380,258 L520,285 L660,242 L800,272 L940,248 L1080,274 L1220,252 L1360,278 L1440,262 L1440,390 Z"
          fill="#2e0a06"
          fillOpacity="0.82"
        />
      </svg>

      {/* ── Montagnes intermédiaires ── */}
      <svg
        className="mtn-hero mtn-3"
        style={{ zIndex: 6 }}
        viewBox="0 0 1440 340"
        preserveAspectRatio="none"
      >
        <path
          d="M0,340 L0,282 L130,242 L270,268 L420,215 L560,248 L700,200 L840,235 L980,210 L1120,240 L1260,218 L1400,244 L1440,232 L1440,340 Z"
          fill="#1a0504"
          fillOpacity="0.92"
        />
      </svg>

      {/* ── Montagnes proches — pics aiguisés ── */}
      <svg
        className="mtn-hero mtn-2"
        style={{ zIndex: 7 }}
        viewBox="0 0 1440 295"
        preserveAspectRatio="none"
      >
        <path
          d="M0,295 L0,255 L100,218 L200,240 L340,188 L460,218 L580,168 L700,202 L820,158 L940,195 L1060,170 L1180,200 L1300,175 L1400,205 L1440,190 L1440,295 Z"
          fill="#0e0203"
          fillOpacity="0.97"
        />
      </svg>

      {/* ── Premier plan ── */}
      <svg
        className="mtn-hero mtn-1"
        style={{ zIndex: 8 }}
        viewBox="0 0 1440 248"
        preserveAspectRatio="none"
      >
        <path
          d="M0,248 L0,224 L90,196 L200,216 L340,172 L480,202 L610,155 L730,188 L860,148 L990,182 L1110,158 L1240,188 L1360,162 L1440,178 L1440,248 Z"
          fill="#060102"
        />
      </svg>

      {/* ── Texte + CTA ── */}
      <div
        className="relative flex flex-col items-center justify-center text-center px-6"
        style={{
          zIndex: 20,
          minHeight: '100dvh',
          paddingBottom: '40vh',
          paddingTop: '2.5rem',
        }}
      >
        {/* Logo */}
        <div className="relative mb-6">
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ boxShadow: '0 0 36px 16px rgba(255,200,80,.5), 0 0 72px 32px rgba(255,140,20,.25)' }}
          />
          <div
            className="relative rounded-full p-[7px]"
            style={{
              background: 'linear-gradient(135deg, rgba(255,230,120,.75) 0%, rgba(255,160,40,.5) 50%, rgba(255,230,120,.75) 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,.45)',
            }}
          >
            <div className="rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,.15)' }}>
              <GardiensBlazon size={130} className="drop-shadow-2xl" />
            </div>
          </div>
        </div>

        <p
          className="text-[11px] font-bold tracking-[.28em] uppercase mb-3"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,.55)', opacity: 0.85 }}
        >
          Héliopolis
        </p>

        <h1
          className="font-black leading-tight"
          style={{
            fontSize: 'clamp(1.6rem, 4.8vw, 3rem)',
            textShadow: '0 4px 24px rgba(0,0,0,.55), 0 2px 8px rgba(0,0,0,.4)',
            letterSpacing: '-0.01em',
          }}
        >
          À la quête de la nouvelle lignée
        </h1>

        <p
          className="mt-3 font-semibold"
          style={{
            fontSize: 'clamp(.82rem, 2.1vw, 1.05rem)',
            letterSpacing: '.06em',
            opacity: 0.9,
            textShadow: '0 2px 12px rgba(0,0,0,.45)',
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
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </p>

        {/* CTA */}
        <div className="mt-8 flex flex-col items-center gap-3 w-full max-w-xs">
          <Link
            href="/activation"
            className="btn-primary w-full py-3.5 rounded-2xl font-black text-sm tracking-wide text-center"
            style={{
              background: 'linear-gradient(135deg, #1F1B2E 0%, #0e0a1a 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,.45)',
              color: '#fff',
              textShadow: 'none',
            }}
          >
            Inscription →
          </Link>
          <Link
            href="/activation?login=1"
            className="btn-secondary w-full py-3 rounded-2xl font-semibold text-sm text-center"
            style={{
              background: 'rgba(255,255,255,.22)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,.35)',
              color: '#fff',
              textShadow: '0 1px 6px rgba(0,0,0,.3)',
            }}
          >
            Se connecter
          </Link>
        </div>

        <p
          className="mt-6 text-[10px] font-semibold tracking-widest uppercase opacity-55"
          style={{ textShadow: '0 1px 6px rgba(0,0,0,.4)' }}
        >
          Communauté Mahatma Gandhi · Région d&apos;Abidjan
        </p>
      </div>
    </div>
  );
}
