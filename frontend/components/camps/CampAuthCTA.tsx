'use client';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { isManagementRole } from '@/lib/roles';
import { ShareButton } from '@/components/camps/ShareButton';

export function CampAuthCTA({ campId, campNom = 'Camp' }: { campId: string; campNom?: string }) {
  const { user } = useAuthStore();

  if (user && isManagementRole(user.role)) {
    return (
      <>
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#EDE7F6] to-white border border-[#d1c4e9] rounded-2xl p-3 mb-3 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#7E57C2] to-[#4a1370] rounded-l-2xl" />
          <span className="text-lg ml-1">📋</span>
          <div className="text-xs text-[#1F1B2E] leading-relaxed flex-1">
            En tant que <strong>{user.prenoms}</strong>, tu peux sélectionner les participants
            pour ce camp.
          </div>
        </div>
        <Link
          href={`/dashboard/guide/selection/${campId}`}
          className="block w-full text-center bg-[#6A1B9A] text-white font-bold text-sm py-3.5 rounded-xl mb-2"
        >
          📋 Sélectionner des participants
        </Link>
        <ShareButton campNom={campNom} />
      </>
    );
  }

  if (user?.role === 'GARDIEN') {
    return (
      <>
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#e8f5e9] to-white border border-[#c8e6c9] rounded-2xl p-3 mb-3 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#4CAF50] to-[#2E7D32] rounded-l-2xl" />
          <span className="text-lg ml-1">⛺</span>
          <div className="text-xs text-[#1F1B2E] leading-relaxed flex-1">
            Pour t&apos;inscrire à ce camp, contacte ton Guide paroissial. Il te sélectionnera
            depuis son tableau de bord.
          </div>
        </div>
        <Link
          href="/dashboard/gardien/messages"
          className="block w-full text-center bg-[#C62828] text-white font-bold text-sm py-3.5 rounded-xl mb-2"
        >
          💬 Contacter mon Guide
        </Link>
        <ShareButton campNom={campNom} />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#FFF1DC] to-white border border-[#f0d98a] rounded-2xl p-3 mb-3 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#F58A4B] to-[#C62828] rounded-l-2xl" />
        <span className="text-lg ml-1">🔍</span>
        <div className="text-xs text-[#1F1B2E] leading-relaxed flex-1">
          L&apos;inscription est réservée aux membres.{' '}
          <strong>Active ton profil</strong> ou contacte ton Guide.
        </div>
      </div>
      <Link
        href="/rejoindre"
        className="block w-full text-center bg-[#C62828] text-white font-bold text-sm py-3.5 rounded-xl mb-2"
      >
        ✨ Je veux rejoindre
      </Link>
      <ShareButton campNom={campNom} />
    </>
  );
}
