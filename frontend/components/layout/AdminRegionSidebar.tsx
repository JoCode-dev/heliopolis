'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GardiensBlazon } from '@/components/layout/GardiensBlazon';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { useAuthStore } from '@/store/auth';
import { useUnreadCounts } from '@/store/unreadCounts';
import { ROLE_LABEL } from '@/lib/roles';

const ADMIN_NAV_GROUPS = [
  {
    label: 'Administration',
    items: [
      { href: '/dashboard/admin',              icon: '🏠', label: 'Accueil' },
      { href: '/dashboard/admin/camps',        icon: '⛺', label: 'Gérer les camps' },
      { href: '/dashboard/admin/annonces',    icon: '📣', label: 'Annonces' },
      { href: '/dashboard/admin/conseils',    icon: '🏛️', label: 'Conseils' },
      { href: '/dashboard/admin/codex',        icon: '🪶', label: 'Modération' },
      { href: '/dashboard/admin/messages',     icon: '💬', label: 'Messagerie' },
      { href: '/dashboard/admin/export',              icon: '📤', label: 'Exports' },
      { href: '/dashboard/admin/import',             icon: '📥', label: 'Import membres' },
      { href: '/dashboard/admin/comparaison-excel',  icon: '🔍', label: 'Comparaison Excel' },
    ],
  },
  {
    label: 'Région',
    items: [
      { href: '/dashboard/admin/participants', icon: '👥', label: 'Participants' },
      { href: '/dashboard/admin/gardiens',     icon: '🤝', label: 'Gardiens' },
      { href: '/dashboard/admin/guides',       icon: '📖', label: 'Encadrants' },
      { href: '/dashboard/admin/districts',     icon: '🛡️', label: 'Districts' },
      { href: '/dashboard/admin/paroisses',    icon: '⛪', label: 'Paroisses' },
      { href: '/dashboard/admin/defis',        icon: '🎯', label: 'Quêtes & soumissions' },
      { href: '/dashboard/admin/artefacts',    icon: '🏅', label: 'Artefacts'           },
    ],
  },
  {
    label: 'Système',
    items: [
      { href: '/dashboard/admin/parametres', icon: '⚙️', label: 'Paramètres' },
      { href: '/dashboard/admin/logs',      icon: '📋', label: 'Journal' },
    ],
  },
];

const REGION_NAV_GROUPS = [
  {
    label: 'Tableau de bord',
    items: [
      { href: '/dashboard/region',          icon: '🏠', label: 'Accueil' },
      { href: '/dashboard/region/camps',     icon: '⛺', label: 'Camps' },
      { href: '/dashboard/region/annonces', icon: '📣', label: 'Annonces' },
      { href: '/dashboard/region/conseils', icon: '🏛️', label: 'Conseils' },
      { href: '/dashboard/region/codex',    icon: '🪶', label: 'Modération' },
      { href: '/dashboard/region/messages', icon: '💬', label: 'Messagerie' },
      { href: '/dashboard/region/export',   icon: '📤', label: 'Exports' },
    ],
  },
  {
    label: 'Membres',
    items: [
      { href: '/dashboard/region/participants', icon: '👥', label: 'Participants' },
      { href: '/dashboard/region/gardiens',     icon: '🤝', label: 'Gardiens' },
      { href: '/dashboard/region/guides',       icon: '📖', label: 'Encadrants' },
      { href: '/dashboard/region/districts',     icon: '🛡️', label: 'Districts' },
      { href: '/dashboard/region/paroisses',    icon: '⛪', label: 'Paroisses' },
      { href: '/dashboard/region/defis',        icon: '🎯', label: 'Quêtes & soumissions' },
      { href: '/dashboard/region/artefacts',    icon: '🏅', label: 'Artefacts'           },
    ],
  },
  {
    label: 'Système',
    items: [
      { href: '/dashboard/region/parametres', icon: '⚙️', label: 'Paramètres' },
    ],
  },
];

interface AdminRegionSidebarProps {
  onProfileClick?: () => void;
  variant?: 'admin' | 'region';
}

export function AdminRegionSidebar({ onProfileClick, variant = 'admin' }: AdminRegionSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const unreadMessages = useUnreadCounts(s => s.messages);
  const unreadAnnonces = useUnreadCounts(s => s.annonces);

  const navGroups = variant === 'region' ? REGION_NAV_GROUPS : ADMIN_NAV_GROUPS;

  const getBadge = (href: string) => {
    if (href.endsWith('/messages')) return unreadMessages;
    if (href.endsWith('/annonces')) return unreadAnnonces;
    return 0;
  };

  return (
    <aside
      className="hidden lg:flex lg:flex-col w-60 text-white flex-shrink-0"
      style={{ background: 'linear-gradient(180deg, #FFB36B 0%, #F58A4B 35%, #E55A35 65%, #7A2820 100%)', textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}
    >

      {/* En-tête */}
      <div className="flex items-center gap-2.5 p-4 border-b border-white/10 flex-shrink-0">
        <GardiensBlazon size={56} />
        <div>
          <div className="text-[10px] tracking-widest opacity-90 uppercase">
            {user?.region?.nom ?? "Région d'Abidjan"}
          </div>
          <div className="text-sm font-bold leading-tight mt-0.5">
            Conseil<br />d&apos;Héliopolis
          </div>
        </div>
      </div>

      {/* Navigation groupée */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-4' : ''}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/70 px-3 mb-1">
              {group.label}
            </p>
            {group.items.map(item => {
              const active =
                item.href === '/dashboard/region' || item.href === '/dashboard/admin'
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                    active
                      ? 'bg-white/20 font-semibold text-white'
                      : 'text-white/90 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <span className="text-sm w-5 text-center">{item.icon}</span>
                  <span className="flex-1 text-[13px]">{item.label}</span>
                  {getBadge(item.href) > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-white/90 text-[#7A2820] text-[10px] font-black flex items-center justify-center leading-none">
                      {getBadge(item.href) > 99 ? '99+' : getBadge(item.href)}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Pied de page */}
      <div className="p-3 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={onProfileClick}
            className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-left"
            title="Modifier mon profil"
          >
            <UserAvatar
              avatarUrl={user?.avatarUrl}
              initials={user ? `${user.nom?.[0] ?? ''}${user.prenoms?.[0] ?? ''}` : '?'}
              sizeClass="w-8 h-8"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{user?.prenoms} {user?.nom}</div>
              <div className="text-[10px] opacity-80">{user ? (ROLE_LABEL[user.role] ?? user.role) : ''}</div>
            </div>
          </button>
          <LogoutButton className="text-white/80 hover:text-white transition-colors flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
}
