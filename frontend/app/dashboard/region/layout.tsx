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

const HOME = '/dashboard/region';

const NAV_LABELS: { prefix: string; icon: string; label: string }[] = [
  { prefix: '/dashboard/region/camps',        icon: '⛺', label: 'Camps'              },
  { prefix: '/dashboard/region/conseils',    icon: '🏛️', label: 'Conseils'           },
  { prefix: '/dashboard/region/participants', icon: '👥', label: 'Participants'        },
  { prefix: '/dashboard/region/gardiens',     icon: '🤝', label: 'Gardiens'           },
  { prefix: '/dashboard/region/guides',       icon: '📖', label: 'Encadrants'         },
  { prefix: '/dashboard/region/region',       icon: '🌍', label: 'Membres région'     },
  { prefix: '/dashboard/region/doyennes',     icon: '🛡️', label: 'Doyennés'           },
  { prefix: '/dashboard/region/paroisses',    icon: '⛪', label: 'Paroisses'           },
  { prefix: '/dashboard/region/defis',        icon: '🎯', label: 'Défis & soumissions'},
  { prefix: '/dashboard/region/codex',        icon: '🪶', label: 'Modération'         },
  { prefix: '/dashboard/region/messages',     icon: '💬', label: 'Messagerie'         },
  { prefix: '/dashboard/region/export',       icon: '📤', label: 'Exports'            },
];

export default function RegionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const loadYear = usePastoralYear(s => s.load);
  useEffect(() => { loadYear(); }, [loadYear]);

  const isHome = pathname === HOME;
  const current = NAV_LABELS.find(n => pathname.startsWith(n.prefix));

  return (
    <AuthGuard roles={['REGION']}>
      <div className="flex h-screen overflow-hidden bg-[#f6f6fa]">

        {/* Sidebar desktop */}
        <AdminRegionSidebar variant="region" onProfileClick={() => setProfileOpen(true)} />

        {/* Contenu principal */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">

          {/* ── Top bar mobile ── */}
          <div className="lg:hidden bg-gradient-to-r from-[#C62828] to-[#8e1a1a] text-white px-3 py-2.5 flex items-center gap-2 flex-shrink-0">

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
              <div className="text-[10px] opacity-60 uppercase tracking-wider leading-none mb-0.5">
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
                  initials={user ? `${user.nom[0]}${user.prenoms[0]}` : '?'}
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
