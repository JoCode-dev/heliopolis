'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { annoncesApi } from '@/lib/api';
import type { Annonce, AnnouncementStatus } from '@/types';

/* ── helpers ──────────────────────────────────────────────────── */

const STATUS_META: Record<AnnouncementStatus, { label: string; color: string }> = {
  BROUILLON: { label: 'Brouillon',  color: 'bg-[#f3f3f5] text-[#6b6b78]' },
  PUBLIE:    { label: 'Publiée',    color: 'bg-[#e1f4e3] text-[#2E7D32]' },
  PLANIFIE:  { label: 'Planifiée',  color: 'bg-[#fff3d6] text-[#9c7218]' },
  ARCHIVE:   { label: 'Archivée',   color: 'bg-[#fde8e8] text-[#E55A35]' },
};

const TABS: { key: AnnouncementStatus | 'TOUTES'; label: string }[] = [
  { key: 'TOUTES',   label: 'Toutes' },
  { key: 'PUBLIE',   label: 'Publiées' },
  { key: 'PLANIFIE', label: 'Planifiées' },
  { key: 'BROUILLON',label: 'Brouillons' },
  { key: 'ARCHIVE',  label: 'Archivées' },
];

function formatDT(s?: string) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ── formulaire de création / édition ────────────────────────── */

interface FormData {
  titre: string;
  contenu: string;
  statut: AnnouncementStatus;
  publishedAt: string;
  expiresAt: string;
}

const EMPTY_FORM: FormData = { titre: '', contenu: '', statut: 'BROUILLON', publishedAt: '', expiresAt: '' };

interface ModalProps {
  initial?: Annonce;
  onClose: () => void;
  onSaved: (a: Annonce) => void;
}

function AnnonceModal({ initial, onClose, onSaved }: ModalProps) {
  const [form, setForm] = useState<FormData>(
    initial
      ? {
          titre:       initial.titre,
          contenu:     initial.contenu ?? '',
          statut:      initial.statut,
          publishedAt: initial.publishedAt ? initial.publishedAt.slice(0, 16) : '',
          expiresAt:   initial.expiresAt   ? initial.expiresAt.slice(0, 16)   : '',
        }
      : EMPTY_FORM,
  );
  const [files, setFiles]       = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | File[]) => {
    const valid = Array.from(incoming).filter(f => f.type.startsWith('image/'));
    setFiles(p => [...p, ...valid]);
    valid.forEach(f => {
      const r = new FileReader();
      r.onload = e => setPreviews(p => [...p, e.target!.result as string]);
      r.readAsDataURL(f);
    });
  };

  const removeFile = (i: number) => {
    setFiles(p => p.filter((_, j) => j !== i));
    setPreviews(p => p.filter((_, j) => j !== i));
  };

  const set = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.titre.trim()) { setError('Le titre est requis'); return; }
    setSaving(true); setError('');
    try {
      const body = {
        titre:       form.titre,
        contenu:     form.contenu || undefined,
        statut:      form.statut,
        publishedAt: form.publishedAt || undefined,
        expiresAt:   form.expiresAt   || undefined,
      };
      const res = initial
        ? await annoncesApi.update(initial.id, body, files.length ? files : undefined)
        : await annoncesApi.create(body, files.length ? files : undefined);
      onSaved(res.data as Annonce);
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Une erreur est survenue');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#ececf0] flex-shrink-0">
          <h3 className="font-black text-[#1F1B2E] text-base">{initial ? 'Modifier l\'annonce' : 'Nouvelle annonce'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f3f3f5] flex items-center justify-center text-[#6b6b78] hover:bg-[#e8e8ed]">✕</button>
        </div>

        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

          {/* Titre */}
          <div>
            <label className="text-[11px] font-bold text-[#6b6b78] uppercase tracking-wide">Titre *</label>
            <input
              value={form.titre}
              onChange={e => set('titre', e.target.value)}
              placeholder="Titre de l'annonce"
              className="mt-1 w-full rounded-xl border border-[#e6e6ea] px-3 py-2.5 text-sm text-[#1F1B2E] placeholder-[#9b9ba8] focus:outline-none focus:border-[#E55A35]"
            />
          </div>

          {/* Contenu */}
          <div>
            <label className="text-[11px] font-bold text-[#6b6b78] uppercase tracking-wide">Contenu</label>
            <textarea
              value={form.contenu}
              onChange={e => set('contenu', e.target.value)}
              placeholder="Corps du message (optionnel)…"
              rows={4}
              className="mt-1 w-full rounded-xl border border-[#e6e6ea] px-3 py-2.5 text-sm text-[#1F1B2E] placeholder-[#9b9ba8] resize-none focus:outline-none focus:border-[#E55A35]"
            />
          </div>

          {/* Statut */}
          <div>
            <label className="text-[11px] font-bold text-[#6b6b78] uppercase tracking-wide">Statut</label>
            <div className="mt-1 grid grid-cols-4 gap-1.5">
              {(['BROUILLON', 'PUBLIE', 'PLANIFIE', 'ARCHIVE'] as AnnouncementStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => set('statut', s)}
                  className={`py-2 rounded-xl text-[11px] font-bold border transition-colors ${
                    form.statut === s
                      ? 'bg-[#1F1B2E] text-white border-[#1F1B2E]'
                      : 'bg-white border-[#e6e6ea] text-[#6b6b78] hover:border-[#6A1B9A] hover:text-[#6A1B9A]'
                  }`}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Date de publication (si PLANIFIE) */}
          {(form.statut === 'PLANIFIE' || form.publishedAt) && (
            <div>
              <label className="text-[11px] font-bold text-[#6b6b78] uppercase tracking-wide">
                Date de publication {form.statut === 'PLANIFIE' ? '*' : ''}
              </label>
              <input
                type="datetime-local"
                value={form.publishedAt}
                onChange={e => set('publishedAt', e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e6e6ea] px-3 py-2.5 text-sm text-[#1F1B2E] focus:outline-none focus:border-[#E55A35]"
              />
            </div>
          )}

          {/* Date d'expiration */}
          <div>
            <label className="text-[11px] font-bold text-[#6b6b78] uppercase tracking-wide">Expiration (optionnel)</label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={e => set('expiresAt', e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#e6e6ea] px-3 py-2.5 text-sm text-[#1F1B2E] focus:outline-none focus:border-[#E55A35]"
            />
          </div>

          {/* Photos existantes (édition) */}
          {initial && initial.photos.length > 0 && (
            <div>
              <label className="text-[11px] font-bold text-[#6b6b78] uppercase tracking-wide">Photos actuelles</label>
              <div className="mt-1 flex gap-2 flex-wrap">
                {initial.photos.map(p => (
                  <div key={p.id} className="relative w-16 h-16 rounded-xl overflow-hidden">
                    <Image src={p.url} alt="" fill className="object-cover" sizes="64px" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload photos */}
          <div>
            <label className="text-[11px] font-bold text-[#6b6b78] uppercase tracking-wide">
              {initial ? 'Ajouter des photos' : 'Photos (optionnel)'}
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="mt-1 rounded-2xl border-2 border-dashed border-[#ddd] bg-[#fafafa] hover:border-[#F58A4B] p-4 text-center cursor-pointer transition-colors"
            >
              <div className="text-xl mb-1">📸</div>
              <p className="text-xs text-[#6b6b78]">Cliquer pour choisir des photos</p>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { if (e.target.files) addFiles(e.target.files); }} />
            </div>
            {previews.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                    <Image src={src} alt="" fill className="object-cover" sizes="80px" />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-2 flex gap-2 flex-shrink-0 border-t border-[#ececf0]">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#e6e6ea] text-sm font-semibold text-[#6b6b78]">Annuler</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(90deg,#F58A4B,#E55A35)' }}
          >
            {saving ? '⏳ Enregistrement…' : initial ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── page principale ──────────────────────────────────────────── */

export function AnnoncesManagePage() {
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<AnnouncementStatus | 'TOUTES'>('TOUTES');
  const [modal, setModal]       = useState<'create' | Annonce | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await annoncesApi.listAll();
      setAnnonces(data as Annonce[]);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSaved = (a: Annonce) => {
    setAnnonces(prev => {
      const idx = prev.findIndex(x => x.id === a.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = a; return n; }
      return [a, ...prev];
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    setDeleting(id);
    try {
      await annoncesApi.remove(id);
      setAnnonces(prev => prev.filter(a => a.id !== id));
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const filtered = tab === 'TOUTES' ? annonces : annonces.filter(a => a.statut === tab);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6">
      <div className="max-w-4xl mx-auto">

        {/* En-tête */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-black text-[#1F1B2E]">Annonces</h1>
            <p className="text-xs text-[#6b6b78] mt-0.5">{annonces.length} annonce{annonces.length !== 1 ? 's' : ''} au total</p>
          </div>
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg,#F58A4B,#E55A35)' }}
          >
            <span className="text-base leading-none">+</span> Nouvelle annonce
          </button>
        </div>

        {/* Onglets filtre */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {TABS.map(t => {
            const count = t.key === 'TOUTES' ? annonces.length : annonces.filter(a => a.statut === t.key).length;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                  tab === t.key
                    ? 'bg-[#1F1B2E] text-white border-[#1F1B2E]'
                    : 'bg-white border-[#e6e6ea] text-[#6b6b78] hover:border-[#1F1B2E] hover:text-[#1F1B2E]'
                }`}
              >
                {t.label} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Liste */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white border border-[#ececf0] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#e0d8d0] py-10 text-center">
            <div className="text-3xl mb-2">📣</div>
            <p className="text-sm text-[#6b6b78]">Aucune annonce dans cette catégorie.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(a => {
              const sm = STATUS_META[a.statut];
              return (
                <div key={a.id} className="bg-white border border-[#ececf0] rounded-2xl p-4 flex gap-4 items-start hover:border-[#d8d8e0] transition-colors">

                  {/* Miniature si photos */}
                  {a.photos.length > 0 && (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                      <Image src={a.photos[0].url} alt="" fill className="object-cover" sizes="64px" />
                      {a.photos.length > 1 && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white text-xs font-black">+{a.photos.length - 1}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-black text-[#1F1B2E] text-sm truncate">{a.titre}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${sm.color}`}>{sm.label}</span>
                    </div>
                    {a.contenu && (
                      <p className="text-xs text-[#6b6b78] line-clamp-2 mb-1">{a.contenu}</p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-[#9b9ba8]">
                      <span>Par {a.author.prenoms} {a.author.nom}</span>
                      {a.statut === 'PLANIFIE' && a.publishedAt && (
                        <span className="text-[#9c7218]">⏰ {formatDT(a.publishedAt)}</span>
                      )}
                      {a.statut === 'PUBLIE' && a.publishedAt && (
                        <span>Publié le {formatDT(a.publishedAt)}</span>
                      )}
                      {a.expiresAt && (
                        <span className="text-[#E55A35]">Expire {formatDT(a.expiresAt)}</span>
                      )}
                      {a.photos.length > 0 && (
                        <span>📷 {a.photos.length} photo{a.photos.length > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setModal(a)}
                      className="w-8 h-8 rounded-full bg-[#f3f3f5] text-[#6b6b78] hover:bg-[#e8e8ed] flex items-center justify-center transition-colors"
                      title="Modifier"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={deleting === a.id}
                      className="w-8 h-8 rounded-full text-[#9b9ba8] hover:bg-[#fee2e2] hover:text-red-500 flex items-center justify-center transition-colors disabled:opacity-40"
                      title="Supprimer"
                    >
                      {deleting === a.id
                        ? <span className="text-xs">…</span>
                        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <AnnonceModal
          initial={modal === 'create' ? undefined : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
