'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';

const PRIMARY = [
  { href: '/dashboard/region',             icon: '🏠', label: 'Accueil',  prefetch: true,  exact: true  },
  { href: '/dashboard/region/camps',       icon: '⛺', label: 'Camps',    prefetch: true,  exact: false },
  { href: '/dashboard/region/messages',    icon: '💬', label: 'Messages', prefetch: false, exact: false },
  { href: '/dashboard/region/defis',       icon: '🎯', label: 'Quêtes',    prefetch: true,  exact: false },
];

const DRAWER_SECTIONS = [
  {
    group: 'Membres',
    items: [
      { href: '/dashboard/region/gardiens',  icon: '🤝', label: 'Gardiens',   prefetch: true },
      { href: '/dashboard/region/guides',    icon: '📖', label: 'Encadrants', prefetch: true },
      { href: '/dashboard/region/districts',  icon: '🛡️', label: 'Districts',  prefetch: true },
    ],
  },
  {
    group: 'Contenu & Outils',
    items: [
      { href: '/dashboard/region/annonces',   icon: '📣', label: 'Annonces',   prefetch: true },
      { href: '/dashboard/region/conseils',  icon: '🏛️', label: 'Conseils',   prefetch: true },
      { href: '/dashboard/region/paroisses', icon: '⛪', label: 'Paroisses',  prefetch: true },
      { href: '/dashboard/region/codex',     icon: '🪶', label: 'Modération', prefetch: true },
      { href: '/dashboard/region/export',    icon: '📤', label: 'Exports',    prefetch: false },
    ],
  },
];

export function RegionMobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    router.push('/activation');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer — s'ouvre vers le haut */}
      <div
        className={`relative z-50 bg-white rounded-t-2xl shadow-2xl overflow-hidden transition-all duration-300 ease-out ${
          open ? 'max-h-[72vh]' : 'max-h-0'
        }`}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#f0f0f4] sticky top-0 bg-white z-10">
          <span className="text-sm font-bold text-[#1F1B2E]">Navigation régionale</span>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-full bg-[#f0f0f4] flex items-center justify-center text-[#6b6b78] text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto px-4 pt-3 pb-4" style={{ maxHeight: 'calc(72vh - 56px)' }}>
          {DRAWER_SECTIONS.map(section => (
            <div key={section.group} className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6b78] mb-2 px-0.5">
                {section.group}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {section.items.map(item => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={item.prefetch}
                      onClick={() => setOpen(false)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl py-2.5 transition-colors ${
                        active
                          ? 'bg-[#1F1B2E]/10 text-[#1F1B2E]'
                          : 'bg-[#f7f7fb] text-[#1F1B2E] hover:bg-[#e8e6f0]'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-[10px] font-semibold text-center leading-tight px-0.5">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Déconnexion */}
          <div className="border-t border-[#f0f0f4] pt-3 mt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#fff5f5] text-[#C62828] font-semibold text-sm hover:bg-[#ffe0e0] transition-colors"
            >
              <span className="text-lg">🚪</span>
              Se déconnecter
            </button>
          </div>
        </div>
      </div>

      {/* BottomNav principal */}
      <nav className="bg-white border-t border-[#e6e6ea] flex justify-around safe-area-bottom">
        {PRIMARY.map(item => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={item.prefetch}
              className={`flex flex-col items-center gap-0.5 py-2 flex-1 text-[10px] transition-colors ${
                active ? 'text-[#1F1B2E]' : 'text-[#6b6b78]'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {/* Bouton Plus */}
        <button
          onClick={() => setOpen(v => !v)}
          className={`flex flex-col items-center gap-0.5 py-2 flex-1 text-[10px] transition-colors ${
            open ? 'text-[#1F1B2E]' : 'text-[#6b6b78]'
          }`}
        >
          <span className={`text-lg leading-none transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>
            ⊕
          </span>
          Plus
        </button>
      </nav>
    </div>
  );
}
