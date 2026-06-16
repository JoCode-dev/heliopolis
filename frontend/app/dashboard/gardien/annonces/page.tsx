'use client';
import { AnnoncesSection } from '@/components/annonces/AnnoncesSection';

export default function GardienAnnoncesPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] flex-shrink-0 px-4 py-4">
        <h1 className="text-[18px] font-black text-white tracking-tight">Annonces</h1>
        <p className="text-[11px] text-white/60 mt-0.5">Messages de la communauté</p>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#fdf6f0] p-4">
        <AnnoncesSection />
      </div>
    </div>
  );
}
