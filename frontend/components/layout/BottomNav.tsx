'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isManagementRole } from '@/lib/roles';
import { useAuthStore } from '@/store/auth';

interface NavItem { href: string; icon: string; label: string; }

const GUEST_ITEMS: NavItem[] = [
  { href: '/', icon: '🏠', label: 'Accueil' },
  { href: '/camps', icon: '⛺', label: 'Camps' },
  { href: '/codex', icon: '🪶', label: 'Codex' },
  { href: '/rejoindre', icon: '✨', label: 'Rejoindre' },
];

const GARDIEN_ITEMS: NavItem[] = [
  { href: '/dashboard/gardien', icon: '🤝', label: 'Accueil' },
  { href: '/dashboard/gardien/camps', icon: '⛺', label: 'Camps' },
  { href: '/dashboard/gardien/missions', icon: '🎯', label: 'Missions' },
  { href: '/dashboard/gardien/messages', icon: '💬', label: 'Messages' },
  { href: '/dashboard/gardien/codex', icon: '🪶', label: 'Codex' },
];

const GUIDE_BASE_ITEMS: NavItem[] = [
  { href: '/dashboard/guide', icon: '📖', label: 'Accueil' },
  { href: '/dashboard/guide/camps', icon: '⛺', label: 'Camps' },
  { href: '/dashboard/guide/messages', icon: '💬', label: 'Messages' },
  { href: '/dashboard/guide/codex', icon: '🪶', label: 'Codex' },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: '/dashboard/admin', icon: '🏠', label: 'Accueil' },
  { href: '/dashboard/admin/camps', icon: '⛺', label: 'Camps' },
  { href: '/dashboard/admin/codex', icon: '🪶', label: 'Codex' },
  { href: '/dashboard/admin/messages', icon: '💬', label: 'Messages' },
  { href: '/dashboard/region', icon: '📊', label: 'Vue rég.' },
];

export function BottomNav({ variant = 'guest' }: { variant?: 'guest' | 'gardien' | 'guide' | 'admin' }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const effectiveVariant =
    variant === 'gardien' && isManagementRole(user?.role) ? 'guide' : variant;
  const guideItems =
    user?.role === 'ADMIN' || user?.role === 'REGION'
      ? [...GUIDE_BASE_ITEMS, { href: '/dashboard/region', icon: '📊', label: 'Region' }]
      : user?.role === 'SENTINELLE'
        ? [...GUIDE_BASE_ITEMS, { href: '/dashboard/guide/adhesions', icon: '📋', label: 'Adhésions' }]
        : [...GUIDE_BASE_ITEMS, { href: '/', icon: '🏠', label: 'Accueil' }];
  const items =
    effectiveVariant === 'guest'
      ? GUEST_ITEMS
      : effectiveVariant === 'admin'
        ? ADMIN_ITEMS
        : effectiveVariant === 'guide'
          ? guideItems
          : GARDIEN_ITEMS;

  return (
    <nav className="flex-shrink-0 bg-white border-t border-[#e6e6ea] flex justify-around pb-safe">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-2 flex-1 text-[10px] transition-colors ${active ? 'text-[#C62828]' : 'text-[#6b6b78]'}`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
