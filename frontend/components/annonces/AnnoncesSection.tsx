'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { annoncesApi } from '@/lib/api';
import type { Annonce, AnnouncementPhoto } from '@/types';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 2) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  if (h < 24) return `Il y a ${h}h`;
  if (d < 7) return `Il y a ${d}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function AnnoncePhotos({ photos, onLightbox }: { photos: AnnouncementPhoto[]; onLightbox: (i: number) => void }) {
  const n = photos.length;
  if (n === 0) return null;

  if (n === 1) return (
    <div className="relative w-full aspect-[16/7] overflow-hidden cursor-pointer group" onClick={() => onLightbox(0)}>
      <Image src={photos[0].url} alt="" fill className="object-cover scale-110 blur-2xl opacity-60 brightness-75 pointer-events-none" aria-hidden sizes="80px" />
      <Image src={photos[0].url} alt="Photo annonce" fill className="object-contain group-hover:scale-[1.02] transition-transform duration-300" sizes="900px" />
    </div>
  );

  if (n === 2) return (
    <div className="grid grid-cols-2 gap-px aspect-[2/1]">
      {photos.map((p, i) => (
        <div key={p.id} className="relative overflow-hidden cursor-pointer group" onClick={() => onLightbox(i)}>
          <Image src={p.url} alt="" fill className="object-cover group-hover:scale-[1.03] transition-transform duration-300" sizes="450px" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
        </div>
      ))}
    </div>
  );

  if (n === 3) return (
    <div className="grid grid-cols-2 gap-px aspect-[4/3]">
      <div className="relative overflow-hidden cursor-pointer group" onClick={() => onLightbox(0)}>
        <Image src={photos[0].url} alt="" fill className="object-cover group-hover:scale-[1.03] transition-transform duration-300" sizes="450px" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
      </div>
      <div className="grid grid-rows-2 gap-px">
        {photos.slice(1).map((p, i) => (
          <div key={p.id} className="relative overflow-hidden cursor-pointer group" onClick={() => onLightbox(i + 1)}>
            <Image src={p.url} alt="" fill className="object-cover group-hover:scale-[1.03] transition-transform duration-300" sizes="225px" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
          </div>
        ))}
      </div>
    </div>
  );

  const visible = photos.slice(0, 4);
  const remaining = n - 4;
  return (
    <div className="grid grid-cols-2 gap-px aspect-square">
      {visible.map((p, i) => {
        const isLast = i === 3 && remaining > 0;
        return (
          <div key={p.id} className="relative overflow-hidden cursor-pointer group" onClick={() => onLightbox(i)}>
            <Image src={p.url} alt="" fill className="object-cover group-hover:scale-[1.03] transition-transform duration-300" sizes="225px" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
            {isLast && (
              <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                <span className="text-white text-3xl font-black">+{remaining}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const SCOPE_LABEL: Record<string, string> = {
  COMMUNAUTE: 'Communauté', REGION: 'Région', DOYENNE: 'Doyenné', PAROISSE: 'Paroisse',
};

export function AnnoncesSection() {
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{ photos: AnnouncementPhoto[]; index: number } | null>(null);

  const fetch = useCallback(async () => {
    try {
      const { data } = await annoncesApi.list();
      setAnnonces(data as Annonce[]);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetch(); }, [fetch]);

  if (loading) return (
    <div className="space-y-4">
      {[1, 2].map(i => (
        <div key={i} className="bg-white border border-[#ececf0] rounded-2xl overflow-hidden animate-pulse">
          <div className="flex gap-3 p-4">
            <div className="w-10 h-10 rounded-full bg-[#ececf0] flex-shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 w-48 bg-[#ececf0] rounded" />
              <div className="h-3 w-24 bg-[#ececf0] rounded" />
            </div>
          </div>
          <div className="h-40 bg-[#ececf0]" />
        </div>
      ))}
    </div>
  );

  if (annonces.length === 0) return (
    <div className="rounded-2xl border border-dashed border-[#e0d8d0] bg-[#fdf9f6] py-10 px-6 text-center">
      <div className="text-3xl mb-3">📣</div>
      <p className="text-sm font-semibold text-[#1F1B2E]">Aucune annonce pour le moment</p>
      <p className="text-xs text-[#8b7b5c] mt-1">Les annonces seront publiées ici.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {annonces.map(a => (
        <article key={a.id} className="bg-white border border-[#ececf0] rounded-2xl overflow-hidden shadow-sm">
          {/* En-tête */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E55A35] to-[#6A1B9A] flex items-center justify-center text-white text-xs font-black flex-shrink-0 overflow-hidden ring-2 ring-white">
              {a.author.avatarUrl
                ? <Image src={a.author.avatarUrl} alt="" width={40} height={40} className="object-cover w-full h-full" />
                : `${a.author.prenoms[0]}${a.author.nom[0]}`}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#1F1B2E] leading-tight">{a.author.prenoms} {a.author.nom}</p>
              <p className="text-[11px] text-[#9b9ba8]">
                {timeAgo(a.publishedAt ?? a.createdAt)} · {SCOPE_LABEL[a.portee] ?? a.portee}
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fff3d6] text-[#9c7218] flex-shrink-0">
              📣 Annonce
            </span>
          </div>

          {/* Photos */}
          {a.photos.length > 0 && (
            <AnnoncePhotos
              photos={a.photos}
              onLightbox={i => setLightbox({ photos: a.photos, index: i })}
            />
          )}

          {/* Titre + contenu */}
          <div className="px-4 py-3">
            <h3 className="font-black text-[#1F1B2E] text-base leading-snug">{a.titre}</h3>
            {a.contenu && (
              <p className="text-sm text-[#4b4b5a] mt-1.5 leading-relaxed whitespace-pre-line">{a.contenu}</p>
            )}
          </div>
        </article>
      ))}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={() => setLightbox(null)}>
          <div className="flex items-center justify-between p-4">
            <span className="text-white/60 text-sm">{lightbox.index + 1} / {lightbox.photos.length}</span>
            <button onClick={() => setLightbox(null)} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25">✕</button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            <div className="relative max-w-3xl w-full max-h-[80vh]">
              <Image src={lightbox.photos[lightbox.index].url} alt="Photo" width={900} height={700} className="object-contain w-full max-h-[80vh] rounded-xl" />
            </div>
          </div>
          {lightbox.photos.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto p-4 justify-center" onClick={e => e.stopPropagation()}>
              {lightbox.photos.map((p, i) => (
                <button key={p.id} onClick={() => setLightbox(prev => prev ? { ...prev, index: i } : null)}
                  className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === lightbox.index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-80'}`}>
                  <Image src={p.url} alt="" width={48} height={48} className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
