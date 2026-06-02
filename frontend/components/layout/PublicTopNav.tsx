'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { GardiensBlazon } from '@/components/layout/GardiensBlazon';
import { getHomeForRole } from '@/lib/roles';

const NAV = [
  { href: '/',         label: 'Accueil' },
  { href: '/camps',    label: 'Camps'   },
  { href: '/codex',    label: 'Codex'   },
  { href: '/rejoindre',label: 'Rejoindre' },
];

export function PublicTopNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <header className="hidden lg:flex items-center gap-6 px-8 py-3 bg-[#1F1B2E] text-white border-b border-white/10 flex-shrink-0 z-20">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
        <GardiensBlazon size={34} />
        <div>
          <div className="text-[8px] tracking-[3px] opacity-55 uppercase">Route en Joie 2026</div>
          <div className="text-[13px] font-bold leading-tight">Codex des Gardiens</div>
        </div>
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-0.5 flex-1">
        {NAV.map(item => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/65 hover:text-white hover:bg-white/10'
              }`}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* CTA */}
      {user ? (
        <Link href={getHomeForRole(user.role)}
          className="flex items-center gap-1.5 bg-gradient-to-r from-[#C62828] to-[#8e1a1a] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:from-[#b51d1d] hover:to-[#7d1616] transition-all">
          Mon espace →
        </Link>
      ) : (
        <Link href="/activation"
          className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          Se connecter
        </Link>
      )}
    </header>
  );
}
