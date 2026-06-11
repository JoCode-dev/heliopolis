'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { photothequeApi } from '@/lib/api';

interface CampMeta { id: string; nom: string; dateDebut?: string; _count?: { photos: number } }
interface CampPhoto {
  id: string;
  url: string;
  caption?: string;
  campId?: string;
  camp?: { id: string; nom: string };
  uploader: { id: string; nom: string; prenoms: string; avatarUrl?: string };
  createdAt: string;
}

interface Props {
  canUpload: boolean;
}

export function PhotothequeTab({ canUpload }: Props) {
  const [photos,       setPhotos]       = useState<CampPhoto[]>([]);
  const [camps,        setCamps]        = useState<CampMeta[]>([]);
  const [selectedCamp, setSelectedCamp] = useState<string | undefined>();
  const [loading,      setLoading]      = useState(true);
  const [uploading,    setUploading]    = useState(false);
  const [lightbox,     setLightbox]     = useState<CampPhoto | null>(null);
  const [deleting,     setDeleting]     = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async (campId?: string) => {
    setLoading(true);
    try {
      const r = await photothequeApi.list(campId);
      setPhotos(r.data as CampPhoto[]);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    Promise.all([
      photothequeApi.camps().then(r => setCamps(r.data as CampMeta[])),
      fetchPhotos(),
    ]).catch(() => {});
  }, [fetchPhotos]);

  const handleCampFilter = (campId?: string) => {
    setSelectedCamp(campId);
    void fetchPhotos(campId);
  };

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await photothequeApi.upload(file, selectedCamp);
      }
      await fetchPhotos(selectedCamp);
    } catch { /* ignore */ }
    finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await photothequeApi.delete(id);
      setPhotos(prev => prev.filter(p => p.id !== id));
      if (lightbox?.id === id) setLightbox(null);
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#fdf6f0]">

      {/* ── Filtres par camp ── */}
      {camps.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-2" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => handleCampFilter(undefined)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
              !selectedCamp
                ? 'bg-[#E55A35] text-white shadow-sm'
                : 'bg-white text-[#6b6b78] border border-[#e8e0d8]'
            }`}
          >
            Tous les camps
          </button>
          {camps.map(c => (
            <button
              key={c.id}
              onClick={() => handleCampFilter(c.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                selectedCamp === c.id
                  ? 'bg-[#E55A35] text-white shadow-sm'
                  : 'bg-white text-[#6b6b78] border border-[#e8e0d8]'
              }`}
            >
              ⛺ {c.nom}
              {c._count && (
                <span className="opacity-70">({c._count.photos})</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Barre upload ── */}
      {canUpload && (
        <div className="px-4 py-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all"
            style={{ background: 'linear-gradient(90deg, #F58A4B, #E55A35)' }}
          >
            {uploading ? (
              <><span className="animate-spin">⏳</span> Envoi en cours…</>
            ) : (
              <>📸 Ajouter des photos</>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            hidden
            onChange={e => { if (e.target.files?.length) void handleFiles(e.target.files); }}
          />
        </div>
      )}

      {/* ── Contenu ── */}
      <div className="px-4 pb-8 pt-2">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-white/60 animate-pulse" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-white border border-[#e8ddd5] flex items-center justify-center text-4xl mb-4">
              📷
            </div>
            <p className="font-bold text-[#1F1B2E] text-sm">Aucune photo pour le moment</p>
            <p className="text-xs text-[#8b7b5c] mt-1">
              {canUpload
                ? 'Ajoutez les premières photos des camps.'
                : 'Les photos des camps apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {photos.map(photo => (
              <div
                key={photo.id}
                className="group relative aspect-square rounded-xl overflow-hidden bg-white border border-[#e8ddd5] cursor-pointer"
                onClick={() => setLightbox(photo)}
              >
                <Image
                  src={photo.url}
                  alt={photo.caption ?? photo.camp?.nom ?? 'Photo de camp'}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
                {/* Overlay au survol */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all" />
                {photo.camp && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-[10px] font-semibold truncate">⛺ {photo.camp.nom}</p>
                  </div>
                )}
                {/* Bouton suppression */}
                {canUpload && (
                  <button
                    onClick={e => { e.stopPropagation(); void handleDelete(photo.id); }}
                    disabled={deleting === photo.id}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 disabled:opacity-50"
                  >
                    {deleting === photo.id ? '…' : '✕'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden">
              <Image
                src={lightbox.url}
                alt={lightbox.caption ?? 'Photo'}
                width={900}
                height={600}
                className="object-contain w-full h-full max-h-[70vh]"
              />
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                {lightbox.caption && (
                  <p className="text-white text-sm font-medium">{lightbox.caption}</p>
                )}
                <p className="text-white/60 text-xs mt-0.5">
                  {lightbox.camp ? `⛺ ${lightbox.camp.nom} · ` : ''}
                  📷 {lightbox.uploader.prenoms} {lightbox.uploader.nom}
                </p>
              </div>
              <button
                onClick={() => setLightbox(null)}
                className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white flex-shrink-0 hover:bg-white/25 transition"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
