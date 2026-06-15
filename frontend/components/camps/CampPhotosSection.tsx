'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { photothequeApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const UPLOAD_ROLES = new Set(['ADMIN', 'REGION', 'PHOTOGRAPHE']);

interface CampPhoto { id: string; url: string }
interface CampPublication {
  id: string;
  caption?: string;
  camp?: { id: string; nom: string };
  uploader: { id: string; nom: string; prenoms: string; avatarUrl?: string };
  photos: CampPhoto[];
  createdAt: string;
}

/* Cellule réutilisable pour le collage multi-photos */
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

  /* 1 photo — fond flouté + image centrée en object-contain */
  if (n === 1) return (
    <div
      className="relative w-full h-full overflow-hidden cursor-pointer group"
      onClick={() => onPhotoClick(photos[0])}
    >
      {/* Fond flouté */}
      <Image src={photos[0].url} alt="" fill className="object-cover scale-110 blur-2xl opacity-70 brightness-75 pointer-events-none" aria-hidden sizes="80px" />
      {/* Image principale */}
      <Image src={photos[0].url} alt="Photo" fill className="object-contain group-hover:scale-[1.02] transition-transform duration-300" sizes="700px" />
      <DownloadBtn url={photos[0].url} />
    </div>
  );

  /* 2 photos — côte à côte */
  if (n === 2) return (
    <div className="grid grid-cols-2 gap-px h-full">
      {photos.map(p => <PhotoCell key={p.id} p={p} sizes="350px" onClick={() => onPhotoClick(p)} />)}
    </div>
  );

  /* 3 photos — grande à gauche, 2 petites à droite */
  if (n === 3) return (
    <div className="grid grid-cols-2 gap-px h-full">
      <PhotoCell p={photos[0]} sizes="350px" onClick={() => onPhotoClick(photos[0])} />
      <div className="grid grid-rows-2 gap-px">
        {photos.slice(1).map(p => <PhotoCell key={p.id} p={p} sizes="175px" onClick={() => onPhotoClick(p)} />)}
      </div>
    </div>
  );

  /* 4+ photos — grille 2×2 avec badge "+N" */
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

interface UploadModalProps {
  campId: string;
  onClose: () => void;
  onSuccess: (pub: CampPublication) => void;
}

function UploadModal({ campId, onClose, onSuccess }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | File[]) => {
    const valid = Array.from(incoming).filter(f => f.type.startsWith('image/'));
    setFiles(prev => [...prev, ...valid]);
    valid.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setPreviews(prev => [...prev, e.target!.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeFile = (i: number) => {
    setFiles(prev => prev.filter((_, j) => j !== i));
    setPreviews(prev => prev.filter((_, j) => j !== i));
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const res = await photothequeApi.createPublication(files, campId, caption || undefined);
      onSuccess(res.data as CampPublication);
      onClose();
    } catch { /* ignore */ }
    finally { setUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#ececf0]">
          <h3 className="font-black text-[#1F1B2E] text-base">Nouvelle publication</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f3f3f5] flex items-center justify-center text-[#6b6b78] hover:bg-[#e8e8ed]">✕</button>
        </div>

        <div className="p-4 max-h-[75vh] overflow-y-auto">
          {/* Zone de dépôt */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors mb-3 ${
              dragging ? 'border-[#E55A35] bg-orange-50' : 'border-[#ddd] bg-[#fafafa] hover:border-[#F58A4B]'
            }`}
          >
            <div className="text-2xl mb-2">📸</div>
            <p className="text-sm font-semibold text-[#1F1B2E]">Glisser des photos ici</p>
            <p className="text-xs text-[#6b6b78] mt-1">ou cliquer pour choisir — JPG, PNG, WebP</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              hidden
              onChange={e => { if (e.target.files) addFiles(e.target.files); }}
            />
          </div>

          {/* Prévisualisations */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                  <Image src={src} alt="" fill className="object-cover" sizes="120px" />
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Texte optionnel */}
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Ajouter un texte (optionnel)…"
            rows={3}
            className="w-full rounded-xl border border-[#e6e6ea] px-3 py-2.5 text-sm text-[#1F1B2E] placeholder-[#9b9ba8] resize-none focus:outline-none focus:border-[#E55A35] transition-colors"
          />
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-2 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#e6e6ea] text-sm font-semibold text-[#6b6b78]">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={files.length === 0 || uploading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity"
            style={{ background: 'linear-gradient(90deg,#F58A4B,#E55A35)' }}
          >
            {uploading ? '⏳ Envoi…' : `Publier ${files.length > 0 ? `(${files.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CampPhotosSectionProps {
  campId: string;
  externalUploadOpen?: boolean;
  onExternalUploadClose?: () => void;
}

export function CampPhotosSection({ campId, externalUploadOpen, onExternalUploadClose }: CampPhotosSectionProps) {
  const { user } = useAuthStore();
  const canUpload = user ? UPLOAD_ROLES.has(user.role) : false;
  const isExternallyControlled = externalUploadOpen !== undefined;

  const [publications, setPublications] = useState<CampPublication[]>([]);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore]       = useState(false);
  const [internalModal, setInternalModal] = useState(false);
  const showModal = isExternallyControlled ? (externalUploadOpen ?? false) : internalModal;
  const setShowModal = (v: boolean) => {
    setInternalModal(v);
    if (!v) onExternalUploadClose?.();
  };
  const [lightbox, setLightbox] = useState<{ photos: CampPhoto[]; index: number } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const parsePubs = (data: unknown) => {
    type Paginated = { items: CampPublication[]; nextCursor: string | null; hasMore: boolean };
    if (Array.isArray(data)) return { items: data as CampPublication[], nextCursor: null, hasMore: false };
    const p = data as Paginated;
    return { items: p.items ?? [], nextCursor: p.nextCursor ?? null, hasMore: p.hasMore ?? false };
  };

  const fetchPubs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await photothequeApi.publications(campId);
      const { items, nextCursor: nc, hasMore: hm } = parsePubs(data);
      setPublications(items);
      setNextCursor(nc);
      setHasMore(hm);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [campId]);

  useEffect(() => { void fetchPubs(); }, [fetchPubs]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data } = await photothequeApi.publications(campId, nextCursor);
      const { items, nextCursor: nc, hasMore: hm } = parsePubs(data);
      setPublications(prev => [...prev, ...items]);
      setNextCursor(nc);
      setHasMore(hm);
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await photothequeApi.deletePublication(id);
      setPublications(prev => prev.filter(p => p.id !== id));
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const openLightbox = (photos: CampPhoto[], clicked: CampPhoto) => {
    const index = photos.findIndex(p => p.id === clicked.id);
    setLightbox({ photos, index: Math.max(0, index) });
  };

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-black text-[#1F1B2E]">Photos du camp</h3>
          {publications.length > 0 && (
            <p className="text-xs text-[#9b9ba8] mt-0.5">
              {publications.length}{hasMore ? '+' : ''} publication{publications.length > 1 ? 's' : ''} · {publications.reduce((s, p) => s + p.photos.length, 0)}{hasMore ? '+' : ''} photos
            </p>
          )}
        </div>
        {canUpload && !isExternallyControlled && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg,#F58A4B,#E55A35)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Publier
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
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
        <div className="rounded-2xl border border-dashed border-[#e0d8d0] bg-[#fdf9f6] py-10 px-6 text-center">
          <div className="text-3xl mb-3">📷</div>
          <p className="text-sm font-semibold text-[#1F1B2E]">Aucune photo pour le moment</p>
          <p className="text-xs text-[#8b7b5c] mt-1 leading-relaxed">
            {canUpload
              ? 'Publiez les premières photos de ce camp.'
              : 'Les photos de ce camp seront publiées ici prochainement.'}
          </p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {publications.map((pub) => (
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
                    <p className="text-[11px] text-[#9b9ba8] mt-0.5 leading-none">{timeAgo(pub.createdAt)}</p>
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

              {/* Texte */}
              {pub.caption && (
                <p className="px-4 pt-3 text-sm text-[#1F1B2E] leading-relaxed whitespace-pre-line">{pub.caption}</p>
              )}

              {/* Pied de publication */}
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-t border-[#f3f3f5] flex-shrink-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                <span className="text-[11px] text-[#9b9ba8]">{pub.photos.length} photo{pub.photos.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Charger plus */}
        {hasMore && (
          <div className="mt-5 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[#e0e0e8] bg-white text-sm font-semibold text-[#1F1B2E] hover:border-[#1F1B2E] transition-colors disabled:opacity-60"
            >
              {loadingMore ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-[#1F1B2E]/30 border-t-[#1F1B2E] animate-spin" />
                  Chargement…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  Charger plus de photos
                </>
              )}
            </button>
          </div>
        )}
        </>
      )}

      {/* Modal upload */}
      {showModal && (
        <UploadModal
          campId={campId}
          onClose={() => setShowModal(false)}
          onSuccess={pub => setPublications(prev => [pub, ...prev])}
        />
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={() => setLightbox(null)}>
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
                <button key={p.id} onClick={() => setLightbox(prev => prev ? { ...prev, index: i } : null)}
                  className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === lightbox.index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-80'}`}>
                  <Image src={p.url} alt="" width={48} height={48} className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
