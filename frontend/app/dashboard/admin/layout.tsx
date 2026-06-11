'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { AdminMobileNav } from '@/components/layout/AdminMobileNav';
import { AdminRegionSidebar } from '@/components/layout/AdminRegionSidebar';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { useAuthStore } from '@/store/auth';
import { usePastoralYear } from '@/store/pastoralYear';

const MOBILE_NAV = [
  { icon: '⛺', label: 'Camps',        href: '/dashboard/admin/camps' },
  { icon: '👥', label: 'Participants', href: '/dashboard/admin/participants' },
  { icon: '🤝', label: 'Gardiens',       href: '/dashboard/admin/gardiens' },
  { icon: '📖', label: 'Encadrants',    href: '/dashboard/admin/guides' },
  { icon: '🌍', label: 'Membres rég.',  href: '/dashboard/admin/region' },
  { icon: '🛡️', label: 'Districts',    href: '/dashboard/admin/districts' },
  { icon: '⛪', label: 'Paroisses',    href: '/dashboard/admin/paroisses' },
  { icon: '🎯', label: 'Défis',        href: '/dashboard/admin/defis' },
  { icon: '🪶', label: 'Codex',        href: '/dashboard/admin/codex' },
  { icon: '📤', label: 'Exports',      href: '/dashboard/admin/export' },
  { icon: '📥', label: 'Import',       href: '/dashboard/admin/import' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const loadYear = usePastoralYear(s => s.load);
  useEffect(() => { loadYear(); }, [loadYear]);

  const currentSection = MOBILE_NAV.find(item => pathname.startsWith(item.href));

  return (
    <AuthGuard roles={['ADMIN']}>
      <div className="flex h-screen overflow-hidden bg-[#fdf6f0]">

        {/* Sidebar desktop — partagée avec région */}
        <AdminRegionSidebar onProfileClick={() => setProfileOpen(true)} />

        {/* Contenu principal */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">

          {/* Top bar mobile */}
          <div className="lg:hidden text-white px-4 py-3 flex items-center gap-3 flex-shrink-0" style={{ background: 'linear-gradient(90deg, #FFB36B 0%, #F58A4B 35%, #E55A35 65%, #7A2820 100%)' }}>
            <Link
              href="/dashboard/admin"
              prefetch={false}
              className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold flex-shrink-0"
            >
              ‹
            </Link>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] opacity-90 uppercase tracking-wider">Conseil d&apos;Héliopolis</div>
              <div className="text-sm font-bold truncate">
                {currentSection
                  ? `${currentSection.icon} ${currentSection.label}`
                  : pathname === '/dashboard/admin'
                    ? '🏠 Accueil'
                    : '🛡️ Administration'}
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

          {/* Espaceur + AdminMobileNav — mobile uniquement */}
          <div className="h-14 flex-shrink-0 lg:hidden" />
          <div className="lg:hidden">
            <AdminMobileNav />
          </div>
        </div>
      </div>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </AuthGuard>
  );
}
