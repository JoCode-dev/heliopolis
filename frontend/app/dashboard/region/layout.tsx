'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { RegionMobileNav } from '@/components/layout/RegionMobileNav';
import { AdminRegionSidebar } from '@/components/layout/AdminRegionSidebar';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { useAuthStore } from '@/store/auth';

const NAV_FLAT = [
  { icon: '🏠', label: 'Accueil',            href: '/dashboard/region/camps' },
  { icon: '👥', label: 'Participants',        href: '/dashboard/region/participants' },
  { icon: '🤝', label: 'Gardiens',           href: '/dashboard/region/gardiens' },
  { icon: '📖', label: 'Encadrants',         href: '/dashboard/region/guides' },
  { icon: '🌍', label: 'Membres région',     href: '/dashboard/region/region' },
  { icon: '🛡️', label: 'Doyennés',           href: '/dashboard/region/doyennes' },
  { icon: '⛪', label: 'Paroisses',           href: '/dashboard/region/paroisses' },
  { icon: '🎯', label: 'Défis & soumissions', href: '/dashboard/region/defis' },
  { icon: '🪶', label: 'Modération',          href: '/dashboard/region/codex' },
  { icon: '💬', label: 'Messagerie',          href: '/dashboard/region/messages' },
  { icon: '📤', label: 'Exports Excel',       href: '/dashboard/region/export' },
];

export default function RegionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);

  const currentPage = NAV_FLAT.find(item => pathname.startsWith(item.href));

  return (
    <AuthGuard roles={['REGION']}>
      <div className="flex h-screen overflow-hidden bg-[#f6f6fa]">

        {/* Sidebar desktop — variante région */}
        <AdminRegionSidebar variant="region" onProfileClick={() => setProfileOpen(true)} />

        {/* Contenu principal */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">

          {/* Top bar mobile */}
          <div className="lg:hidden bg-gradient-to-r from-[#1F1B2E] to-[#3a1d4d] text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <Link
              href="/dashboard/region/camps"
              prefetch={false}
              className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold flex-shrink-0"
            >
              ‹
            </Link>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] opacity-70 uppercase tracking-wider">Conseil d&apos;Héliopolis</div>
              <div className="text-sm font-bold truncate">
                {currentPage ? `${currentPage.icon} ${currentPage.label}` : '📊 Vue régionale'}
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

          {/* Contenu des pages */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {children}
          </main>

          {/* Espaceur + AdminMobileNav — même nav que l'admin pour cohérence */}
          <div className="h-14 flex-shrink-0 lg:hidden" />
          <div className="lg:hidden">
            <RegionMobileNav />
          </div>
        </div>
      </div>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </AuthGuard>
  );
}
