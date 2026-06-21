'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { RegionMobileNav } from '@/components/layout/RegionMobileNav';
import { AdminRegionSidebar } from '@/components/layout/AdminRegionSidebar';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { useAuthStore } from '@/store/auth';
import { usePastoralYear } from '@/store/pastoralYear';
import { useUnreadCounts } from '@/store/unreadCounts';

import type { RegionRole } from '@/types';

const HOME = '/dashboard/region';

type NavItem = { prefix: string; icon: string; label: string; minRole?: RegionRole };

const ALL_NAV: NavItem[] = [
  { prefix: '/dashboard/region/camps',        icon: '⛺', label: 'Camps'               },
  { prefix: '/dashboard/region/conseils',     icon: '🏛️', label: 'Conseils',           minRole: 'ADJOINT' },
  { prefix: '/dashboard/region/participants', icon: '👥', label: 'Participants',        minRole: 'ADJOINT' },
  { prefix: '/dashboard/region/gardiens',     icon: '🤝', label: 'Gardiens',            minRole: 'ADJOINT' },
  { prefix: '/dashboard/region/guides',       icon: '📖', label: 'Encadrants',          minRole: 'ADJOINT' },
  { prefix: '/dashboard/region/districts',    icon: '🛡️', label: 'Districts',           minRole: 'RESPONSABLE' },
  { prefix: '/dashboard/region/paroisses',    icon: '⛪', label: 'Paroisses',            minRole: 'RESPONSABLE' },
  { prefix: '/dashboard/region/defis',        icon: '🎯', label: 'Quêtes & soumissions',minRole: 'ADJOINT' },
  { prefix: '/dashboard/region/codex',        icon: '🪶', label: 'Modération',          minRole: 'ADJOINT' },
  { prefix: '/dashboard/region/messages',     icon: '💬', label: 'Messagerie'           },
  { prefix: '/dashboard/region/export',       icon: '📤', label: 'Exports',             minRole: 'ADJOINT' },
];

const ROLE_LEVEL: Record<RegionRole, number> = {
  RESPONSABLE:          3,
  ADJOINT:              2,
  CHARGE_COMMUNICATION: 1,
};
const MIN_LEVEL: Record<RegionRole, number> = ROLE_LEVEL;

function filterNav(regionRole: RegionRole | null | undefined): NavItem[] {
  const level = regionRole ? (ROLE_LEVEL[regionRole] ?? 3) : 3;
  return ALL_NAV.filter(item => {
    if (!item.minRole) return true;
    return level >= (MIN_LEVEL[item.minRole] ?? 1);
  });
}

export default function RegionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const loadYear = usePastoralYear(s => s.load);
  const refreshMessages = useUnreadCounts(s => s.refreshMessages);
  const refreshAnnonces = useUnreadCounts(s => s.refreshAnnonces);
  useEffect(() => { loadYear(); }, [loadYear]);
  useEffect(() => {
    if (!user?.id) return;
    void refreshMessages();
    void refreshAnnonces(user.id);
    const mi = setInterval(() => void refreshMessages(), 10_000);
    const ai = setInterval(() => void refreshAnnonces(user.id), 120_000);
    return () => { clearInterval(mi); clearInterval(ai); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const NAV_LABELS = filterNav(user?.regionRole);
  const isHome = pathname === HOME;
  const current = NAV_LABELS.find(n => pathname.startsWith(n.prefix));

  return (
    <AuthGuard roles={['REGION']}>
      <div className="flex h-screen overflow-hidden bg-[#fdf6f0]">

        {/* Sidebar desktop */}
        <AdminRegionSidebar variant="region" onProfileClick={() => setProfileOpen(true)} />

        {/* Contenu principal */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">

          {/* ── Top bar mobile ── */}
          <div className="lg:hidden text-white px-3 py-2.5 flex items-center gap-2 flex-shrink-0" style={{ background: 'linear-gradient(90deg, #FFB36B 0%, #F58A4B 35%, #E55A35 65%, #7A2820 100%)' }}>

            {/* Bouton retour — masqué sur l'accueil */}
            {isHome ? (
              <div className="w-8 h-8 flex-shrink-0" />
            ) : (
              <button
                onClick={() => router.back()}
                className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold flex-shrink-0 hover:bg-white/25 transition"
              >
                ‹
              </button>
            )}

            {/* Titre centré */}
            <div className="flex-1 text-center">
              <div className="text-[10px] opacity-85 uppercase tracking-wider leading-none mb-0.5">
                {user?.region?.nom ?? 'Conseil régional'}
              </div>
              <div className="text-sm font-bold leading-tight">
                {isHome
                  ? '🏠 Accueil'
                  : current
                    ? `${current.icon} ${current.label}`
                    : '📊 Vue régionale'}
              </div>
            </div>

            {/* Avatar + déconnexion */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <LogoutButton
                confirm
                className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-base hover:bg-white/25 transition"
              >
                🚪
              </LogoutButton>
              <button
                onClick={() => setProfileOpen(true)}
                className="rounded-full hover:ring-2 hover:ring-white/50 transition-all"
                title="Mon profil"
              >
                <UserAvatar
                  avatarUrl={user?.avatarUrl}
                  initials={user ? `${user.nom?.[0] ?? ''}${user.prenoms?.[0] ?? ''}` : '?'}
                  sizeClass="w-8 h-8"
                />
              </button>
            </div>
          </div>

          {/* Contenu des pages */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {children}
          </main>

          {/* Bottom nav mobile */}
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
