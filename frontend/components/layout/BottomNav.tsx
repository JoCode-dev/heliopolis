'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isManagementRole } from '@/lib/roles';
import { useAuthStore } from '@/store/auth';

interface NavItem { href: string; icon: string; label: string; }

// ─── Configurations ───────────────────────────────────────────────────────────

const GUEST_ITEMS: NavItem[] = [
  { href: '/',          icon: '🏠', label: 'Accueil'  },
  { href: '/codex',     icon: '🪶', label: 'Codex'    },
  { href: '/activation',icon: '🛡️', label: 'S\'inscrire' },
];

const GARDIEN_ITEMS: NavItem[] = [
  { href: '/dashboard/gardien',          icon: '🤝', label: 'Accueil'  },
  { href: '/dashboard/gardien/camps',    icon: '⛺', label: 'Camps'    },
  { href: '/dashboard/gardien/missions', icon: '🎯', label: 'Missions' },
  { href: '/dashboard/gardien/messages', icon: '💬', label: 'Messages' },
];

const GARDIEN_OVERFLOW: NavItem[] = [
  { href: '/dashboard/gardien/codex',    icon: '🪶', label: 'Codex'    },
  { href: '/dashboard/gardien/artefacts',icon: '🏅', label: 'Artefacts'},
  { href: '/dashboard/gardien/profil',   icon: '👤', label: 'Profil'   },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: '/dashboard/admin', icon: '🏠', label: 'Accueil' },
  { href: '/dashboard/admin/camps', icon: '⛺', label: 'Camps' },
  { href: '/dashboard/admin/codex', icon: '🪶', label: 'Codex' },
  { href: '/dashboard/admin/messages', icon: '💬', label: 'Messages' },
  { href: '/dashboard/region', icon: '📊', label: 'Vue rég.' },
];

// Guide : 4 onglets principaux + overflow via "+"
const GUIDE_PRIMARY: NavItem[] = [
  { href: '/dashboard/guide',           icon: '📖', label: 'Accueil'   },
  { href: '/dashboard/guide/missions',  icon: '🎯', label: 'Missions'  },
  { href: '/dashboard/guide/membres',   icon: '👥', label: 'Membres'   },
  { href: '/dashboard/guide/messages',  icon: '💬', label: 'Messages'  },
];

const GUIDE_OVERFLOW_BASE: NavItem[] = [
  { href: '/dashboard/guide/camps',      icon: '⛺', label: 'Camps'      },
  { href: '/dashboard/guide/adhesions',  icon: '📋', label: 'Adhésions'  },
  { href: '/dashboard/guide/codex',      icon: '🪶', label: 'Codex'      },
  { href: '/dashboard/guide/artefacts',  icon: '🏅', label: 'Artefacts'  },
  { href: '/dashboard/guide/profil',     icon: '👤', label: 'Profil'     },
];

// ─── Composant ────────────────────────────────────────────────────────────────

export function BottomNav({ variant = 'guest' }: { variant?: 'guest' | 'gardien' | 'guide' | 'admin' }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [moreOpen, setMoreOpen] = useState(false);

  const effectiveVariant =
    variant === 'gardien' && isManagementRole(user?.role) ? 'guide' : variant;

  // Items overflow selon le rôle
  const overflowItems: NavItem[] =
    effectiveVariant === 'guide'
      ? user?.role === 'ADMIN' || user?.role === 'REGION'
        ? [...GUIDE_OVERFLOW_BASE, { href: '/dashboard/region', icon: '📊', label: 'Région' }]
        : GUIDE_OVERFLOW_BASE
      : effectiveVariant === 'gardien'
        ? GARDIEN_OVERFLOW
        : [];

  const primaryItems =
    effectiveVariant === 'guest'   ? GUEST_ITEMS    :
    effectiveVariant === 'admin'   ? ADMIN_ITEMS    :
    effectiveVariant === 'guide'   ? GUIDE_PRIMARY  :
    GARDIEN_ITEMS;

  const isActive = (href: string) =>
    href === '/dashboard/guide'
      ? pathname === href
      : href !== '/' && pathname.startsWith(href);

  const overflowActive = overflowItems.some(item => isActive(item.href));

  return (
    <>
      <nav className="flex-shrink-0 bg-white border-t border-[#e6e6ea] flex justify-around pb-safe">
        {primaryItems.map(item => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2 flex-1 text-[10px] font-medium transition-colors ${
                active ? 'text-[#E55A35]' : 'text-[#6b6b78]'
              }`}>
              <span className="text-[20px] leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {/* Bouton "+" pour les onglets supplémentaires */}
        {overflowItems.length > 0 && (
          <button
            onClick={() => setMoreOpen(v => !v)}
            className={`flex flex-col items-center gap-0.5 py-2 flex-1 text-[10px] font-medium transition-colors ${
              overflowActive ? 'text-[#E55A35]' : moreOpen ? 'text-[#6A1B9A]' : 'text-[#6b6b78]'
            }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              moreOpen ? 'bg-[#6A1B9A] text-white rotate-45' : 'bg-[#f3f3f5] text-[#6b6b78]'
            }`}>
              +
            </span>
            Plus
          </button>
        )}
      </nav>

      {/* ── Sheet des onglets supplémentaires ── */}
      {moreOpen && overflowItems.length > 0 && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setMoreOpen(false)}
          />
          {/* Panel */}
          <div className="fixed bottom-[57px] left-0 right-0 z-50 bg-white border-t border-[#e6e6ea] shadow-[0_-4px_24px_rgba(0,0,0,0.12)] rounded-t-2xl pb-safe">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#f0f0f0]">
              <span className="text-xs font-bold text-[#6b6b78] uppercase tracking-wider">Plus d&apos;onglets</span>
              <button onClick={() => setMoreOpen(false)}
                className="w-6 h-6 rounded-full bg-[#f3f3f5] flex items-center justify-center text-[#6b6b78] text-xs">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-4 gap-0">
              {overflowItems.map(item => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-1 py-3.5 px-2 text-[11px] font-medium transition-colors ${
                      active ? 'text-[#E55A35] bg-[#fff8f3]' : 'text-[#6b6b78] hover:bg-[#f7f7fa]'
                    }`}>
                    <span className="text-[22px] leading-none">{item.icon}</span>
                    {item.label}
                    {active && (
                      <span className="w-1 h-1 rounded-full bg-[#E55A35]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
