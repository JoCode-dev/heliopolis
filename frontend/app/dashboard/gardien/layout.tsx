'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { BottomNav } from '@/components/layout/BottomNav';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { useAuthStore } from '@/store/auth';
import { usePastoralYear } from '@/store/pastoralYear';
import { useUnreadCounts } from '@/store/unreadCounts';

const NAV = [
  { href: '/dashboard/gardien',            icon: '🤝', label: 'Accueil' },
  { href: '/dashboard/gardien/camps',      icon: '⛺', label: 'Camps' },
  { href: '/dashboard/gardien/missions',   icon: '🎯', label: 'Missions' },
  { href: '/dashboard/gardien/messages',   icon: '💬', label: 'Messages' },
  { href: '/dashboard/gardien/annonces',   icon: '📣', label: 'Annonces' },
  { href: '/dashboard/gardien/codex',      icon: '🪶', label: 'Codex' },
  { href: '/dashboard/gardien/artefacts',  icon: '🏅', label: 'Artefacts' },
  { href: '/dashboard/gardien/profil',     icon: '👤', label: 'Profil' },
];

const HOME = '/dashboard/gardien';

export default function GardienLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const loadYear = usePastoralYear(s => s.load);
  const refreshMessages = useUnreadCounts(s => s.refreshMessages);
  const refreshAnnonces = useUnreadCounts(s => s.refreshAnnonces);
  const unreadMessages = useUnreadCounts(s => s.messages);
  const unreadAnnonces = useUnreadCounts(s => s.annonces);
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

  const getBadge = (href: string) => {
    if (href.endsWith('/messages')) return unreadMessages;
    if (href.endsWith('/annonces')) return unreadAnnonces;
    return 0;
  };

  const isHome = pathname === HOME;
  const currentSection = NAV.find(item =>
    item.href === HOME ? pathname === item.href : pathname.startsWith(item.href),
  );
  const sectionLabel = currentSection
    ? `${currentSection.icon} ${currentSection.label}`
    : '🤝 Accueil';

  return (
    <AuthGuard roles={['GARDIEN', 'PHOTOGRAPHE']}>
      <div className="flex h-screen overflow-hidden bg-[#fdf6f0]">

        {/* ── Sidebar desktop ── */}
        <aside
          className="hidden lg:flex lg:flex-col w-56 text-white flex-shrink-0"
          style={{ background: 'linear-gradient(180deg, #FFB36B 0%, #F58A4B 35%, #E55A35 65%, #7A2820 100%)', textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}
        >
          <div className="p-4 border-b border-white/20 flex-shrink-0 flex items-center gap-2.5">
            <Image src="/logo.jpeg" alt="Logo" width={52} height={52} className="object-contain rounded flex-shrink-0" loading="eager" preload />
            <div>
              <div className="text-base font-bold">{user?.role === 'PHOTOGRAPHE' ? 'Photographe' : 'Gardien'}</div>
              <div className="text-[11px] opacity-90 mt-0.5">{user?.parish?.nom ?? 'Ma paroisse'}</div>
            </div>
          </div>

          <nav className="flex-1 p-2 overflow-y-auto">
            {NAV.map(item => {
              const active = item.href === HOME
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors ${
                    active ? 'bg-white/20 font-semibold text-white' : 'text-white/90 hover:bg-white/15 hover:text-white'
                  }`}>
                  <span className="text-base w-5 text-center">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {getBadge(item.href) > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-white/90 text-[#7A2820] text-[10px] font-black flex items-center justify-center leading-none">
                      {getBadge(item.href) > 99 ? '99+' : getBadge(item.href)}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-white/20 flex-shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setProfileOpen(true)}
                className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                <UserAvatar
                  avatarUrl={user?.avatarUrl}
                  initials={user ? `${user.nom?.[0] ?? ''}${user.prenoms?.[0] ?? ''}` : '?'}
                  sizeClass="w-7 h-7"
                  textClass="text-[11px] font-bold"
                  bgClass="bg-white/25"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{user?.prenoms} {user?.nom}</div>
                  <div className="text-[10px] opacity-80">{user?.role === 'PHOTOGRAPHE' ? 'Photographe' : user?.matricule}</div>
                </div>
              </button>
              <LogoutButton confirm className="text-white/80 hover:text-white transition-colors flex-shrink-0 text-lg p-1" />
            </div>
          </div>
        </aside>

        {/* ── Contenu principal ── */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">

          {/* ── Top bar mobile ── */}
          <div className="lg:hidden text-white px-3 py-2.5 flex items-center gap-2 flex-shrink-0" style={{ background: 'linear-gradient(90deg, #FFB36B 0%, #F58A4B 35%, #E55A35 65%, #7A2820 100%)' }}>

            {/* Bouton retour — masqué sur l'accueil */}
            {isHome ? (
              <div className="w-8 h-8 flex-shrink-0" />
            ) : (
              <Link href={HOME}
                className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold flex-shrink-0 hover:bg-white/25 transition">
                ‹
              </Link>
            )}

            {/* Titre centré */}
            <div className="flex-1 text-center">
              <div className="text-[10px] opacity-85 uppercase tracking-wider leading-none mb-0.5">Gardien</div>
              <div className="text-sm font-bold leading-tight">{sectionLabel}</div>
            </div>

            {/* Déconnexion + Avatar */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <LogoutButton
                confirm
                className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-base hover:bg-white/25 transition"
              >
                🚪
              </LogoutButton>
              <button onClick={() => setProfileOpen(true)}
                className="rounded-full hover:ring-2 hover:ring-white/50 transition-all">
                <UserAvatar
                  avatarUrl={user?.avatarUrl}
                  initials={user ? `${user.nom?.[0] ?? ''}${user.prenoms?.[0] ?? ''}` : '?'}
                  sizeClass="w-8 h-8"
                />
              </button>
            </div>
          </div>

          <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
          <div className="lg:hidden flex-shrink-0">
            <BottomNav variant="gardien" />
          </div>
        </div>
      </div>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </AuthGuard>
  );
}
