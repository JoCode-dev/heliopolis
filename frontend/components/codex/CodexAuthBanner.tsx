'use client';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';

export function CodexAuthBanner() {
  const { user } = useAuthStore();

  if (user?.role === 'GARDIEN') {
    return (
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#e8f5e9] to-white border border-[#c8e6c9] rounded-2xl p-3 mb-4 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#4CAF50] to-[#2E7D32] rounded-l-2xl" />
        <span className="text-xl ml-1">🪶</span>
        <div className="flex-1 text-xs text-[#1F1B2E] leading-relaxed">
          Bienvenue, <strong>{user.prenoms}</strong>. Relève des défis et publie tes actions.
        </div>
        <Link
          href="/dashboard/gardien/missions"
          className="bg-[#2E7D32] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
        >
          Mes missions →
        </Link>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#EDE7F6] to-white border border-[#d1c4e9] rounded-2xl p-3 mb-4 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#7E57C2] to-[#4a1370] rounded-l-2xl" />
        <span className="text-xl ml-1">🛡️</span>
        <div className="flex-1 text-xs text-[#1F1B2E] leading-relaxed">
          Mur du Codex — <strong>{user.prenoms}</strong>. Modère et valide les soumissions.
        </div>
        <Link
          href="/dashboard/guide/codex"
          className="bg-[#6A1B9A] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
        >
          Modérer →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-gradient-to-r from-[#FFF1DC] to-white border border-[#f0d98a] rounded-2xl p-3 mb-4 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#F58A4B] to-[#C62828] rounded-l-2xl" />
      <span className="text-xl ml-1">✨</span>
      <div className="flex-1 text-xs text-[#1F1B2E] leading-relaxed">
        Pour <strong>publier ton action</strong> ou réagir, rejoins la Route.
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
