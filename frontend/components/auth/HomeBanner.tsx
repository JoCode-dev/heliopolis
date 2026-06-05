'use client';
import Link from 'next/link';
import { useAuthHydrated, useAuthStore } from '@/store/auth';
import { ROLE_LABEL, getHomeForRole } from '@/lib/roles';

export function HomeBanner() {
  const hydrated = useAuthHydrated();
  const { user: storedUser } = useAuthStore();
  const user = hydrated ? storedUser : null;

  if (user) {
    const homeLink = getHomeForRole(user.role);
    const roleLabel = ROLE_LABEL[user.role] ?? user.role;
    return (
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#e8f5e9] to-[#f1f8e9] border border-[#c8e6c9] rounded-2xl p-3 mb-4 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#4CAF50] to-[#2E7D32] rounded-l-2xl" />
        <span className="text-xl ml-1">🛡️</span>
        <div className="flex-1 text-xs text-[#1F1B2E] leading-relaxed">
          Bienvenue, <strong>{user.prenoms}</strong>. Tu es connecté(e) en tant que{' '}
          <strong>{roleLabel}</strong>.
        </div>
        <Link
          href={homeLink}
          className="bg-[#2E7D32] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
        >
          Mon espace →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-gradient-to-r from-[#FFF1DC] to-[#fff5e0] border border-[#f0d98a] rounded-2xl p-3 mb-4 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#F58A4B] to-[#C62828] rounded-l-2xl" />
      <span className="text-xl ml-1">🔍</span>
      <div className="flex-1 text-xs text-[#1F1B2E] leading-relaxed">
        Tu es en <strong>mode invité</strong>. Active ton profil pour participer aux camps et
        défis.
      </div>
      <Link
        href="/rejoindre"
        className="bg-[#C62828] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
      >
        Rejoindre →
      </Link>
    </div>
  );
}
