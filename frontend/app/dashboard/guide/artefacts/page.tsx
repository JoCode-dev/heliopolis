'use client';
import { ArtefactsCatalogView } from '@/components/badges/ArtefactsCatalogView';

export default function GuideArtefactsPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] text-white px-4 pt-4 pb-4 flex-shrink-0">
        <h1 className="text-xl font-bold">🏅 Artefacts</h1>
        <p className="text-xs opacity-85 mt-0.5">Règles d&apos;acquisition pour les Gardiens</p>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 bg-[#fafafa]">
        <div className="bg-[#fff7e0] border border-[#f0d98a] rounded-2xl p-3.5 mb-4 flex gap-2.5 items-start">
          <span className="text-base flex-shrink-0">ℹ️</span>
          <p className="text-xs text-[#5a4a1a] leading-relaxed">
            Les artefacts sont des badges gagnés par les Gardiens selon des conditions précises.
            Cette page présente le catalogue officiel et les règles d&apos;obtention.
          </p>
        </div>

        <ArtefactsCatalogView />
      </div>
    </div>
  );
}
