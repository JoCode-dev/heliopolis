'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { photothequeApi } from '@/lib/api';

const PAGE_SIZE = 12;

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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 2) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  if (h < 24) return `Il y a ${h}h`;
  if (d < 7) return `Il y a ${d}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function DownloadBtn({ url }: { url: string }) {
  const download = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = url.split('/').pop() ?? 'photo.jpg';
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, '_blank');
    }
  };
  return (
    <button
      onClick={download}
      className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 backdrop-blur-sm"
      title="Télécharger"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    </button>
  );
}

function PhotoCell({ p, sizes, onClick }: { p: CampPhoto; sizes: string; onClick: () => void }) {
  return (
    <div className="relative overflow-hidden cursor-pointer group" onClick={onClick}>
      <Image src={p.url} alt="Photo" fill className="object-cover group-hover:scale-[1.03] transition-transform duration-300" sizes={sizes} />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
      <DownloadBtn url={p.url} />
    </div>
  );
}

function PhotoCollage({ photos, onPhotoClick }: { photos: CampPhoto[]; onPhotoClick: (p: CampPhoto) => void }) {
  const n = photos.length;
  if (n === 0) return null;

  if (n === 1) return (
    <div className="relative w-full h-full overflow-hidden cursor-pointer group" onClick={() => onPhotoClick(photos[0])}>
      <Image src={photos[0].url} alt="" fill className="object-cover scale-110 blur-2xl opacity-70 brightness-75 pointer-events-none" aria-hidden sizes="80px" />
      <Image src={photos[0].url} alt="Photo" fill className="object-contain group-hover:scale-[1.02] transition-transform duration-300" sizes="700px" />
      <DownloadBtn url={photos[0].url} />
    </div>
  );

  if (n === 2) return (
    <div className="grid grid-cols-2 gap-px h-full">
      {photos.map(p => <PhotoCell key={p.id} p={p} sizes="350px" onClick={() => onPhotoClick(p)} />)}
    </div>
  );

  if (n === 3) return (
    <div className="grid grid-cols-2 gap-px h-full">
      <PhotoCell p={photos[0]} sizes="350px" onClick={() => onPhotoClick(photos[0])} />
      <div className="grid grid-rows-2 gap-px">
        {photos.slice(1).map(p => <PhotoCell key={p.id} p={p} sizes="175px" onClick={() => onPhotoClick(p)} />)}
      </div>
    </div>
  );

  const visible = photos.slice(0, 4);
  const remaining = n - 4;
  return (
    <div className="grid grid-cols-2 gap-px h-full">
      {visible.map((p, i) => {
        const isLast = i === 3 && remaining > 0;
        return (
          <div key={p.id} className="relative overflow-hidden cursor-pointer group" onClick={() => onPhotoClick(isLast ? photos[3] : p)}>
            <Image src={p.url} alt="Photo" fill className="object-cover group-hover:scale-[1.03] transition-transform duration-300" sizes="350px" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
            {isLast ? (
              <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                <span className="text-white text-3xl font-black">+{remaining}</span>
              </div>
            ) : (
              <DownloadBtn url={p.url} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PhotothequeTab({ canUpload }: Props) {
  const [publications,  setPublications]  = useState<CampPublication[]>([]);
  const [camps,         setCamps]         = useState<CampMeta[]>([]);
  const [selectedCamp,  setSelectedCamp]  = useState<string | undefined>();
  const [loading,       setLoading]       = useState(true);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [hasMore,       setHasMore]       = useState(false);
  const [nextCursor,    setNextCursor]    = useState<string | null>(null);
  const [uploading,     setUploading]     = useState(false);
  const [lightbox,      setLightbox]      = useState<{ photos: CampPhoto[]; index: number } | null>(null);
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Chargement initial / reset filtres ──────────────────────────────────
  const fetchFirst = useCallback(async (campId?: string) => {
    setLoading(true);
    setPublications([]);
    setNextCursor(null);
    setHasMore(false);
    try {
      const r = await photothequeApi.publications(campId, undefined, PAGE_SIZE);
      const { items, nextCursor: nc, hasMore: hm } = r.data as {
        items: CampPublication[]; nextCursor: string | null; hasMore: boolean;
      };
      setPublications(items);
      setNextCursor(nc);
      setHasMore(hm);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  // ── Chargement page suivante ─────────────────────────────────────────────
  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const r = await photothequeApi.publications(selectedCamp, nextCursor, PAGE_SIZE);
      const { items, nextCursor: nc, hasMore: hm } = r.data as {
        items: CampPublication[]; nextCursor: string | null; hasMore: boolean;
      };
      setPublications(prev => [...prev, ...items]);
      setNextCursor(nc);
      setHasMore(hm);
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  }, [loadingMore, hasMore, nextCursor, selectedCamp]);

  // ── IntersectionObserver sur le sentinel ────────────────────────────────
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) void fetchMore(); },
      { rootMargin: '200px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchMore]);

  useEffect(() => {
    Promise.all([
      photothequeApi.camps().then(r => setCamps(r.data as CampMeta[])),
      fetchFirst(),
    ]).catch(() => {});
  }, [fetchFirst]);

  const handleCampFilter = (campId?: string) => {
    setSelectedCamp(campId);
    void fetchFirst(campId);
  };

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    try {
      await photothequeApi.createPublication(Array.from(files), selectedCamp);
      await fetchFirst(selectedCamp);
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

      {/* ── Barre filtres + bouton upload ── */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        {/* Filtres scrollables */}
        <div className="flex gap-2 overflow-x-auto flex-1 min-w-0" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => handleCampFilter(undefined)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
              !selectedCamp ? 'bg-[#E55A35] text-white shadow-sm' : 'bg-white text-[#6b6b78] border border-[#e8e0d8]'
            }`}
          >
            Tous les camps
          </button>
          {camps.map(c => (
            <button key={c.id} onClick={() => handleCampFilter(c.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                selectedCamp === c.id ? 'bg-[#E55A35] text-white shadow-sm' : 'bg-white text-[#6b6b78] border border-[#e8e0d8]'
              }`}
            >
              ⛺ {c.nom}
              {c._count && <span className="opacity-70">({c._count.publications})</span>}
            </button>
          ))}
        </div>

        {/* Bouton upload — fixé à droite */}
        {canUpload && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all active:scale-95 hover:brightness-110 hover:shadow-md cursor-pointer"
              style={{ background: 'linear-gradient(90deg, #F58A4B, #E55A35)' }}
            >
              {uploading
                ? <><span className="animate-spin text-base">⏳</span><span className="hidden sm:inline">Envoi…</span></>
                : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><span className="hidden sm:inline">Ajouter des photos</span></>}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden
              onChange={e => { if (e.target.files?.length) void handleFiles(e.target.files); }} />
          </>
        )}
      </div>

      {/* ── Grille publications ── */}
      <div className="px-4 pb-8 pt-2">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-[#ececf0] rounded-2xl overflow-hidden animate-pulse">
                <div className="flex gap-3 p-4">
                  <div className="w-10 h-10 rounded-full bg-[#ececf0] flex-shrink-0" />
                  <div className="flex-1 space-y-1.5 pt-1">
                    <div className="h-3 w-28 bg-[#ececf0] rounded" />
                    <div className="h-2 w-16 bg-[#ececf0] rounded" />
                  </div>
                </div>
                <div className="aspect-[4/3] bg-[#ececf0]" />
              </div>
            ))}
          </div>
        ) : publications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-white border border-[#e8ddd5] flex items-center justify-center text-4xl mb-4">📷</div>
            <p className="font-bold text-[#1F1B2E] text-sm">Aucune photo pour le moment</p>
            <p className="text-xs text-[#8b7b5c] mt-1">
              {canUpload ? 'Ajoutez les premières photos des camps.' : 'Les photos des camps apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publications.map(pub => (
              <div key={pub.id} className="bg-white border border-[#ececf0] rounded-2xl overflow-hidden shadow-sm flex flex-col">

                {/* En-tête */}
                <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E55A35] to-[#6A1B9A] flex items-center justify-center text-white text-xs font-black flex-shrink-0 overflow-hidden ring-2 ring-white">
                      {pub.uploader.avatarUrl
                        ? <Image src={pub.uploader.avatarUrl} alt="" width={40} height={40} className="object-cover w-full h-full" />
                        : `${pub.uploader.prenoms[0]}${pub.uploader.nom[0]}`}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1F1B2E] leading-tight">{pub.uploader.prenoms} {pub.uploader.nom}</p>
                      <p className="text-[11px] text-[#9b9ba8] mt-0.5 leading-none">
                        {pub.camp ? `⛺ ${pub.camp.nom}` : timeAgo(pub.createdAt)}
                      </p>
                    </div>
                  </div>
                  {canUpload && (
                    <button
                      onClick={() => handleDelete(pub.id)}
                      disabled={deleting === pub.id}
                      className="w-8 h-8 rounded-full text-[#9b9ba8] hover:bg-[#fee2e2] hover:text-red-500 flex items-center justify-center transition-colors disabled:opacity-40"
                      title="Supprimer la publication"
                    >
                      {deleting === pub.id
                        ? <span className="text-xs">…</span>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>}
                    </button>
                  )}
                </div>

                {/* Collage photos — bord à bord */}
                <div className="flex-1 min-h-[200px] overflow-hidden">
                  <PhotoCollage photos={pub.photos} onPhotoClick={p => openLightbox(pub.photos, p)} />
                </div>

                {/* Caption */}
                {pub.caption && (
                  <p className="px-4 pt-3 text-sm text-[#1F1B2E] leading-relaxed whitespace-pre-line">{pub.caption}</p>
                )}

                {/* Pied */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-t border-[#f3f3f5] flex-shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                  <span className="text-[11px] text-[#9b9ba8]">{pub.photos.length} photo{pub.photos.length > 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Skeleton "load more" ── */}
        {loadingMore && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-[#ececf0] rounded-2xl overflow-hidden animate-pulse">
                <div className="flex gap-3 p-4">
                  <div className="w-10 h-10 rounded-full bg-[#ececf0] flex-shrink-0" />
                  <div className="flex-1 space-y-1.5 pt-1">
                    <div className="h-3 w-28 bg-[#ececf0] rounded" />
                    <div className="h-2 w-16 bg-[#ececf0] rounded" />
                  </div>
                </div>
                <div className="aspect-[4/3] bg-[#ececf0]" />
              </div>
            ))}
          </div>
        )}

        {/* Sentinel — déclenche fetchMore quand visible */}
        <div ref={sentinelRef} className="h-4" />

        {!loading && !hasMore && publications.length > 0 && (
          <p className="text-center text-xs text-[#9b9ba8] py-4">
            {publications.length} publication{publications.length > 1 ? 's' : ''} au total
          </p>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={() => setLightbox(null)}>
          <div className="flex items-center justify-between p-4">
            <span className="text-white/60 text-sm">{lightbox.index + 1} / {lightbox.photos.length}</span>
            <button onClick={() => setLightbox(null)} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition">✕</button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            <div className="relative max-w-3xl w-full max-h-[80vh]">
              <Image src={lightbox.photos[lightbox.index].url} alt="Photo" width={900} height={700}
                className="object-contain w-full max-h-[80vh] rounded-xl" />
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
