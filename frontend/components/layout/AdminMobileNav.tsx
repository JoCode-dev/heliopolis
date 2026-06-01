'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';

// 4 items principaux — stables sur toutes les pages admin
const PRIMARY = [
  { href: '/dashboard/admin',              icon: '🏠', label: 'Accueil' },
  { href: '/dashboard/admin/camps',        icon: '⛺', label: 'Camps' },
  { href: '/dashboard/admin/messages',     icon: '💬', label: 'Messages' },
  { href: '/dashboard/admin/participants', icon: '👥', label: 'Membres' },
];

const DRAWER_SECTIONS = [
  {
    group: 'Personnes',
    items: [
      { href: '/dashboard/admin/participants', icon: '👥', label: 'Participants' },
      { href: '/dashboard/admin/gardiens',     icon: '🤝', label: 'Gardiens' },
      { href: '/dashboard/admin/guides',       icon: '📖', label: 'Encadrants' },
      { href: '/dashboard/admin/region',       icon: '🌍', label: 'Membres rég.' },
    ],
  },
  {
    group: 'Territoire',
    items: [
      { href: '/dashboard/admin/doyennes',  icon: '🛡️', label: 'Doyennés' },
      { href: '/dashboard/admin/paroisses', icon: '⛪', label: 'Paroisses' },
      { href: '/dashboard/admin/defis',     icon: '🎯', label: 'Défis' },
      { href: '/dashboard/admin/codex',     icon: '🪶', label: 'Codex' },
    ],
  },
  {
    group: 'Administration',
    items: [
      { href: '/dashboard/admin/export',        icon: '📤', label: 'Exports' },
      { href: '/dashboard/admin/camps/nouveau', icon: '➕', label: 'Nouveau camp' },
    ],
  },
];

export function AdminMobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    router.push('/activation');
  };

  const isActive = (href: string) =>
    href === '/dashboard/admin'
      ? pathname === href
      : pathname.startsWith(href);

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
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#f0f0f4] sticky top-0 bg-white z-10">
          <span className="text-sm font-bold text-[#1F1B2E]">Navigation</span>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-full bg-[#f0f0f4] flex items-center justify-center text-[#6b6b78] text-xs font-bold"
          >✕</button>
        </div>

        <div className="overflow-y-auto px-4 pt-3 pb-4" style={{ maxHeight: 'calc(72vh - 56px)' }}>
          {DRAWER_SECTIONS.map(section => (
            <div key={section.group} className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6b78] mb-2">
                {section.group}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {section.items.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl py-2.5 transition-colors ${
                      isActive(item.href)
                        ? 'bg-[#1F1B2E]/10 text-[#1F1B2E]'
                        : 'bg-[#f7f7fb] text-[#1F1B2E] hover:bg-[#e8e6f0]'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-[10px] font-semibold text-center leading-tight px-0.5">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}

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

      {/* BottomNav — stable et identique sur toutes les pages */}
      <nav className="bg-white border-t border-[#e6e6ea] flex justify-around safe-area-bottom">
        {PRIMARY.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-2 flex-1 text-[10px] transition-colors ${
              isActive(item.href) ? 'text-[#1F1B2E] font-semibold' : 'text-[#6b6b78]'
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <button
          onClick={() => setOpen(v => !v)}
          className={`flex flex-col items-center gap-0.5 py-2 flex-1 text-[10px] transition-colors ${
            open ? 'text-[#1F1B2E] font-semibold' : 'text-[#6b6b78]'
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
