'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { photothequeApi } from '@/lib/api';

interface CampMeta { id: string; nom: string; dateDebut?: string; _count?: { publications: number } }
interface CampPhoto { id: string; url: string }
interface CampPublication {
  id: string;
  caption?: string;
  campId?: string;
  camp?: { id: string; nom: string };
  uploader: { id: string; nom: string; prenoms: string; avatarUrl?: string };
  photos: CampPhoto[];
  createdAt: string;
}

interface Props {
  canUpload: boolean;
}

export function PhotothequeTab({ canUpload }: Props) {
  const [publications,  setPublications]  = useState<CampPublication[]>([]);
  const [camps,         setCamps]         = useState<CampMeta[]>([]);
  const [selectedCamp,  setSelectedCamp]  = useState<string | undefined>();
  const [loading,       setLoading]       = useState(true);
  const [uploading,     setUploading]     = useState(false);
  const [lightbox,      setLightbox]      = useState<{ photos: CampPhoto[]; index: number } | null>(null);
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchPublications = useCallback(async (campId?: string) => {
    setLoading(true);
    try {
      const r = await photothequeApi.publications(campId);
      setPublications(r.data as CampPublication[]);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    Promise.all([
      photothequeApi.camps().then(r => setCamps(r.data as CampMeta[])),
      fetchPublications(),
    ]).catch(() => {});
  }, [fetchPublications]);

  const handleCampFilter = (campId?: string) => {
    setSelectedCamp(campId);
    void fetchPublications(campId);
  };

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    try {
      await photothequeApi.createPublication(Array.from(files), selectedCamp);
      await fetchPublications(selectedCamp);
    } catch { /* ignore */ }
    finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await photothequeApi.deletePublication(id);
      setPublications(prev => prev.filter(p => p.id !== id));
      if (lightbox) setLightbox(null);
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const openLightbox = (photos: CampPhoto[], clicked: CampPhoto) => {
    const index = photos.findIndex(p => p.id === clicked.id);
    setLightbox({ photos, index: Math.max(0, index) });
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
                <span className="opacity-70">({c._count.publications})</span>
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
        ) : publications.length === 0 ? (
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
          <div className="space-y-4">
            {publications.map(pub => (
              <div key={pub.id} className="bg-white rounded-2xl border border-[#e8ddd5] overflow-hidden">
                {/* En-tête */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E55A35] to-[#6A1B9A] flex items-center justify-center text-white text-xs font-black overflow-hidden flex-shrink-0">
                      {pub.uploader.avatarUrl
                        ? <Image src={pub.uploader.avatarUrl} alt="" width={32} height={32} className="object-cover" />
                        : `${pub.uploader.prenoms[0]}${pub.uploader.nom[0]}`}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1F1B2E] leading-none">{pub.uploader.prenoms} {pub.uploader.nom}</p>
                      {pub.camp && <p className="text-[10px] text-[#8b7b5c] mt-0.5">⛺ {pub.camp.nom}</p>}
                    </div>
                  </div>
                  {canUpload && (
                    <button
                      onClick={() => handleDelete(pub.id)}
                      disabled={deleting === pub.id}
                      className="w-6 h-6 rounded-full text-[#6b6b78] hover:bg-[#fee2e2] hover:text-red-500 flex items-center justify-center text-[10px] transition-colors disabled:opacity-40"
                      title="Supprimer"
                    >
                      {deleting === pub.id ? '…' : '✕'}
                    </button>
                  )}
                </div>

                {pub.caption && (
                  <p className="px-4 pb-2 text-xs text-[#1F1B2E]">{pub.caption}</p>
                )}

                {/* Grille photos */}
                <div className="grid grid-cols-3 gap-0.5">
                  {pub.photos.slice(0, 6).map((photo, i) => (
                    <div
                      key={photo.id}
                      className="group relative aspect-square cursor-pointer bg-[#ececf0]"
                      onClick={() => openLightbox(pub.photos, photo)}
                    >
                      <Image
                        src={photo.url}
                        alt="Photo de camp"
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 33vw, 20vw"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                      {i === 5 && pub.photos.length > 6 && (
                        <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                          <span className="text-white text-lg font-black">+{pub.photos.length - 6}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="px-4 py-2 text-[10px] text-[#8b7b5c]">
                  {pub.photos.length} photo{pub.photos.length > 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={() => setLightbox(null)}
        >
          <div className="flex items-center justify-between p-4">
            <span className="text-white/60 text-sm">{lightbox.index + 1} / {lightbox.photos.length}</span>
            <button onClick={() => setLightbox(null)} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition">✕</button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            <div className="relative max-w-3xl w-full max-h-[80vh]">
              <Image
                src={lightbox.photos[lightbox.index].url}
                alt="Photo"
                width={900} height={700}
                className="object-contain w-full max-h-[80vh] rounded-xl"
              />
            </div>
          </div>
          {lightbox.photos.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto p-4 justify-center" onClick={e => e.stopPropagation()}>
              {lightbox.photos.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setLightbox(prev => prev ? { ...prev, index: i } : null)}
                  className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === lightbox.index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-80'}`}
                >
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
