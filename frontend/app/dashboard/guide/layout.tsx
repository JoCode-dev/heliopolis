'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { BottomNav } from '@/components/layout/BottomNav';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { useAuthStore } from '@/store/auth';
import { ROLE_LABEL, getTerritoryLabel } from '@/lib/roles';

const NAV_BASE = [
  { href: '/dashboard/guide',              icon: '📖', label: 'Accueil' },
  { href: '/dashboard/guide/membres',      icon: '👥', label: 'Membres' },
  { href: '/dashboard/guide/camps',        icon: '⛺', label: 'Camps' },
  { href: '/dashboard/guide/messages',     icon: '💬', label: 'Messages' },
  { href: '/dashboard/guide/adhesions',    icon: '📋', label: 'Adhésions' },
  { href: '/dashboard/guide/codex',        icon: '🪶', label: 'Codex' },
];

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);

  const currentSection = NAV_BASE.find(item =>
    item.href === '/dashboard/guide'
      ? pathname === item.href
      : pathname.startsWith(item.href),
  );

  return (
    <AuthGuard roles={['GUIDE', 'SENTINELLE']}>
      <div className="flex h-screen overflow-hidden bg-[#fafafa]">

        {/* ── Sidebar desktop ── */}
        <aside className="hidden lg:flex lg:flex-col w-56 bg-gradient-to-b from-[#6A1B9A] to-[#4a1370] text-white flex-shrink-0">
          <div className="p-4 border-b border-white/20 flex-shrink-0 flex items-center gap-2.5">
            <Image src="/logo.jpeg" alt="Logo" width={36} height={36} className="object-contain rounded flex-shrink-0" loading="eager" preload />
            <div>
              <div className="text-base font-bold">{user ? ROLE_LABEL[user.role] : 'Guide'}</div>
              <div className="text-[11px] opacity-75 mt-0.5">{getTerritoryLabel(user)}</div>
            </div>
          </div>

          <nav className="flex-1 p-2 overflow-y-auto">
            {NAV_BASE.map(item => {
              const active = item.href === '/dashboard/guide'
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors ${
                    active ? 'bg-white/20 font-semibold text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}>
                  <span className="text-base w-5 text-center">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-white/20 flex-shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setProfileOpen(true)}
                className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-left"
                title="Modifier mon profil"
              >
                <UserAvatar
                  avatarUrl={user?.avatarUrl}
                  initials={user ? `${user.nom[0]}${user.prenoms[0]}` : '?'}
                  sizeClass="w-7 h-7"
                  textClass="text-[11px] font-bold"
                  bgClass="bg-white/25"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{user?.prenoms} {user?.nom}</div>
                  <div className="text-[10px] opacity-60">{user?.role}</div>
                </div>
              </button>
              <LogoutButton className="text-white/60 hover:text-white transition-colors flex-shrink-0" />
            </div>
          </div>
        </aside>

        {/* ── Contenu principal ── */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">

          {/* Top bar mobile */}
          <div className="lg:hidden bg-gradient-to-r from-[#6A1B9A] to-[#4a1370] text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <Link
              href="/dashboard/guide"
              className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold flex-shrink-0"
            >
              ‹
            </Link>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] opacity-70 uppercase tracking-wider">Guide</div>
              <div className="text-sm font-bold truncate">
                {currentSection
                  ? `${currentSection.icon} ${currentSection.label}`
                  : '📖 Accueil'}
              </div>
            </div>
            <button
              onClick={() => setProfileOpen(true)}
              className="rounded-full hover:ring-2 hover:ring-white/50 transition-all flex-shrink-0"
              title="Mon profil"
            >
              <UserAvatar
                avatarUrl={user?.avatarUrl}
                initials={user ? `${user.nom[0]}${user.prenoms[0]}` : '?'}
                sizeClass="w-8 h-8"
              />
            </button>
          </div>

          <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
          <div className="lg:hidden flex-shrink-0">
            <BottomNav variant="guide" />
          </div>
        </div>
      </div>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </AuthGuard>
  );
}
