'use client';
import Image from 'next/image';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import { campsApi, usersApi } from '@/lib/api';
import { getTerritoryLabel } from '@/lib/roles';
import { useAuthStore } from '@/store/auth';
import { useUnreadCounts } from '@/store/unreadCounts';
import type { User, Camp, CampParticipant } from '@/types';

// ─── Shared config ────────────────────────────────────────────────────────────

type AdhFilter = 'tous' | 'A_JOUR' | 'EN_ATTENTE' | 'NON_A_JOUR';

const ADH_CFG: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  A_JOUR:     { label: 'À jour',     dot: 'bg-[#2E7D32]', bg: 'bg-[#e8f5e9]', text: 'text-[#2E7D32]', border: 'border-[#a5d6a7]' },
  EN_ATTENTE: { label: 'En attente', dot: 'bg-[#D9A441]', bg: 'bg-[#fff8e6]', text: 'text-[#9c7218]', border: 'border-[#ffe082]' },
  NON_A_JOUR: { label: 'Non à jour', dot: 'bg-[#E55A35]', bg: 'bg-[#fff8f3]', text: 'text-[#E55A35]', border: 'border-[#ef9a9a]' },
};

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; border: string; icon: string }> = {
  SELECTIONNE: { label: 'Sélectionné',  bg: 'bg-[#EDE7F6]', text: 'text-[#6A1B9A]', border: 'border-[#ce93d8]', icon: '✓'  },
  CONFIRME:    { label: 'Confirmé',     bg: 'bg-[#e8f5e9]', text: 'text-[#2E7D32]', border: 'border-[#a5d6a7]', icon: '✓✓' },
  BLOQUE:      { label: 'Bloqué',       bg: 'bg-[#fff8f3]', text: 'text-[#E55A35]', border: 'border-[#ef9a9a]', icon: '🚫' },
  PRESENT:     { label: 'Présent',      bg: 'bg-[#e8f5e9]', text: 'text-[#2E7D32]', border: 'border-[#a5d6a7]', icon: '✓'  },
  ABSENT:      { label: 'Absent',       bg: 'bg-[#f5f5f5]', text: 'text-[#6b6b78]', border: 'border-[#e0e0e0]', icon: '—'  },
  DESISTE:     { label: 'Désisté',      bg: 'bg-[#fff8e6]', text: 'text-[#9c7218]', border: 'border-[#ffe082]', icon: '←'  },
  EN_ATTENTE:  { label: 'En attente',   bg: 'bg-[#fff8e6]', text: 'text-[#9c7218]', border: 'border-[#ffe082]', icon: '⏳' },
};

const GRAD = [
  'from-[#F58A4B] via-[#E55A35] to-[#7A2820]', 'from-[#6A1B9A] to-[#4a1370]',
  'from-[#2E7D32] to-[#1a5021]', 'from-[#1F1B2E] to-[#3a1d4d]',
  'from-[#D9A441] to-[#9c7218]',
];

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastState { id: number; msg: string; ok: boolean }
function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const counter = useRef(0);
  const show = useCallback((msg: string, ok: boolean) => {
    const id = ++counter.current;
    setToasts(p => [...p, { id, msg, ok }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  return { toasts, show };
}

// ─── Avatar helper ────────────────────────────────────────────────────────────

function Avatar({ user: u, idx, size = 'md', greyed = false }: {
  user: Partial<User>; idx: number; size?: 'sm' | 'md'; greyed?: boolean;
}) {
  const sz = size === 'sm' ? 'w-9 h-9 text-xs' : 'w-11 h-11 text-sm';
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br ${GRAD[idx % GRAD.length]} flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden relative ${greyed ? 'grayscale opacity-60' : ''}`}>
      {u.avatarUrl ? <Image src={u.avatarUrl} fill className="object-cover" alt="" sizes="44px" /> : `${(u.nom ?? '?')[0]}${(u.prenoms ?? '?')[0]}`}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function SelectionPage({ params }: { params: Promise<{ campId: string }> }) {
  const { campId } = use(params);
  const { user }   = useAuthStore();
  const isSentinelle = user?.role === 'SENTINELLE';
  const { toasts, show: toast } = useToast();

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white">
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto px-4 py-3 rounded-2xl text-white text-sm font-semibold shadow-xl flex items-center gap-2.5 min-w-[280px] ${t.ok ? 'bg-[#2E7D32]' : 'bg-[#E55A35]'}`}>
            <span>{t.ok ? '✓' : '✕'}</span><span className="flex-1">{t.msg}</span>
          </div>
        ))}
      </div>
      {isSentinelle
        ? <SentinelleView campId={campId} user={user} toast={toast} />
        : <GuideView      campId={campId} user={user} toast={toast} />
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VUE GUIDE — sélection + blocage de gardiens
// ─────────────────────────────────────────────────────────────────────────────

function GuideView({ campId, user, toast }: {
  campId: string;
  user: User | null;
  toast: (msg: string, ok: boolean) => void;
}) {
  const refreshCampRequests = useUnreadCounts(s => s.refreshCampRequests);

  const [camp, setCamp]             = useState<Camp | null>(null);
  const [gardiens, setGardiens]     = useState<User[]>([]);
  const [confirmed, setConfirmed]   = useState<Set<string>>(new Set());
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [blocked, setBlocked]       = useState<Set<string>>(new Set());
  const [waitingIds, setWaitingIds] = useState<Set<string>>(new Set());
  const [saving, setSaving]         = useState(false);
  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [adhFilter, setAdhFilter]   = useState<AdhFilter>('tous');
  const [loading, setLoading]       = useState(true);

  const reload = useCallback(() => {
    if (!user) return;
    const p: Record<string, string> = { role: 'GARDIEN' };
    if (user.parish?.id) p.parishId = user.parish.id;
    Promise.all([
      campsApi.get(campId),
      usersApi.list(p),
      campsApi.participants(campId),
    ]).then(([c, u, pp]) => {
      setCamp(c.data);
      const parts = pp.data as CampParticipant[];
      const blockedIds = new Set<string>(parts.filter(x => x.participationStatus === 'BLOQUE').map(x => x.userId));
      const pendingIds  = new Set<string>(parts.filter(x => x.participationStatus === 'EN_ATTENTE').map(x => x.userId));
      const selectedIds = new Set<string>(parts.filter(x => x.participationStatus !== 'BLOQUE' && x.participationStatus !== 'EN_ATTENTE').map(x => x.userId));
      setGardiens(u.data as User[]);
      setBlocked(blockedIds);
      setWaitingIds(pendingIds);
      setConfirmed(new Set(selectedIds));
      setSelected(new Set(selectedIds));
    }).catch(() => toast('Erreur lors du chargement.', false))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campId, user]);

  useEffect(() => { reload(); }, [reload]);

  const toggle = (id: string) => {
    if (blocked.has(id)) return;
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const handleBlock = async (userId: string, name: string) => {
    setBlockingId(userId);
    try {
      await campsApi.blockParticipant(campId, userId);
      toast(`${name} bloqué pour ce camp.`, true);
      reload();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur lors du blocage.';
      toast(msg, false);
    } finally { setBlockingId(null); }
  };

  const handleUnblock = async (userId: string, name: string) => {
    setBlockingId(userId);
    try {
      await campsApi.unblockParticipant(campId, userId);
      toast(`${name} débloqué.`, true);
      reload();
    } catch { toast('Erreur lors du déblocage.', false); }
    finally { setBlockingId(null); }
  };

  const toAdd    = [...selected].filter(id => !confirmed.has(id));
  const toRemove = [...confirmed].filter(id => !selected.has(id));
  const hasChanges = toAdd.length > 0 || toRemove.length > 0;

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    let addOk = 0, removeOk = 0;
    const firstError = { msg: '' };
    await Promise.all([
      ...toAdd.map(id => campsApi.selectParticipant(campId, id)
        .then(() => addOk++)
        .catch((e: unknown) => {
          const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '';
          if (!firstError.msg && msg) firstError.msg = msg;
        })),
      ...toRemove.map(id => campsApi.removeParticipant(campId, id)
        .then(() => removeOk++)
        .catch((e: unknown) => {
          const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '';
          if (!firstError.msg && msg) firstError.msg = msg;
        })),
    ]);
    const errors = (toAdd.length - addOk) + (toRemove.length - removeOk);
    if (errors === 0) {
      const parts = [];
      if (addOk)    parts.push(`${addOk} ajouté${addOk > 1 ? 's' : ''}`);
      if (removeOk) parts.push(`${removeOk} retiré${removeOk > 1 ? 's' : ''}`);
      toast(`✓ ${parts.join(', ')}.`, true);
      setConfirmed(new Set(selected));
      setWaitingIds(prev => {
        const s = new Set(prev);
        toAdd.forEach(id => s.delete(id));
        return s;
      });
      void refreshCampRequests();
    } else if (addOk > 0 || removeOk > 0) {
      const parts = [];
      if (addOk)    parts.push(`${addOk} ajouté${addOk > 1 ? 's' : ''}`);
      if (removeOk) parts.push(`${removeOk} retiré${removeOk > 1 ? 's' : ''}`);
      toast(`${parts.join(', ')} · ${errors} échoué${errors > 1 ? 's' : ''} — ${firstError.msg || 'Erreur inconnue'}`, false);
      setConfirmed(new Set(selected));
    } else {
      toast(firstError.msg || `Impossible de sélectionner ${errors} participant${errors > 1 ? 's' : ''}.`, false);
    }
    setSaving(false);
  };

  const visibleGardiens = gardiens.filter(g => !blocked.has(g.id));
  const blockedGardiens = gardiens.filter(g => blocked.has(g.id));

  const filteredVisible = visibleGardiens.filter(r => {
    const q = search.trim().toLowerCase();
    if (q && !`${r.nom} ${r.prenoms} ${r.matricule ?? ''}`.toLowerCase().includes(q)) return false;
    if (adhFilter === 'tous') return true;
    return (r.adhesions?.[0]?.statut ?? 'NON_A_JOUR') === adhFilter;
  });

  const countByAdh = (s: string) => visibleGardiens.filter(r => (r.adhesions?.[0]?.statut ?? 'NON_A_JOUR') === s).length;

  // En attente en tête, puis non-inscrits, puis inscrits
  const sortedVisible = filteredVisible.slice().sort((a, b) => {
    const aW = waitingIds.has(a.id) ? 0 : confirmed.has(a.id) ? 2 : 1;
    const bW = waitingIds.has(b.id) ? 0 : confirmed.has(b.id) ? 2 : 1;
    return aW - bW;
  });

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] text-white px-4 pt-4 pb-5 flex-shrink-0">
        <button onClick={() => history.back()} className="flex items-center gap-1 text-xs opacity-75 mb-3">‹ Retour</button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black">Sélection des participants</h1>
            <p className="text-xs opacity-80 mt-0.5">{camp?.nom ?? 'Camp'} · {user?.parish?.nom ?? 'Ma paroisse'}</p>
          </div>
          {camp && <div className="text-right"><div className="text-2xl font-black">{selected.size}</div><div className="text-[10px] opacity-70 uppercase tracking-wider">sélectionnés</div></div>}
        </div>
        {!loading && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { label: 'Total',     value: visibleGardiens.length,              color: 'bg-white/15' },
              { label: 'En attente',value: waitingIds.size,                     color: waitingIds.size > 0 ? 'bg-[#D9A441]/80' : 'bg-white/10', pulse: waitingIds.size > 0 },
              { label: 'Inscrits',  value: confirmed.size,                      color: 'bg-[#6A1B9A]/60' },
              { label: 'Bloqués',   value: blockedGardiens.length,              color: blockedGardiens.length > 0 ? 'bg-[#E55A35]/60' : 'bg-white/10' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-xl p-2 text-center relative ${'pulse' in s && s.pulse ? 'ring-2 ring-white/60' : ''}`}>
                <div className="text-base font-black">{s.value}</div>
                <div className="text-[9px] opacity-80 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="border-b border-[#f0f0f0] px-4 py-2.5 flex-shrink-0 bg-white">
        <div className="flex items-center bg-[#F0F2F5] rounded-full px-3 py-2 gap-2 mb-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#9b9ba8]" placeholder="Nom ou matricule…" />
          {search && <button onClick={() => setSearch('')} className="text-[#9b9ba8]">✕</button>}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {([
            { key: 'tous',       label: `Tous (${visibleGardiens.length})` },
            { key: 'A_JOUR',     label: `À jour (${countByAdh('A_JOUR')})` },
            { key: 'EN_ATTENTE', label: `Attente (${countByAdh('EN_ATTENTE')})` },
            { key: 'NON_A_JOUR', label: `Non à jour (${countByAdh('NON_A_JOUR')})` },
          ] as { key: AdhFilter; label: string }[]).map(f => (
            <button key={f.key} onClick={() => setAdhFilter(f.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold ${adhFilter === f.key ? 'bg-[#6A1B9A] text-white' : 'bg-[#f3f3f5] text-[#6b6b78]'}`}>
              {f.label}
            </button>
          ))}
          <div className="ml-auto flex gap-1.5 flex-shrink-0">
            <button onClick={() => setSelected(new Set(filteredVisible.map(r => r.id)))} className="text-[11px] font-semibold text-[#6A1B9A] px-2.5 py-1.5 rounded-full bg-[#f0e8ff]">Tout cocher</button>
            <button onClick={() => setSelected(new Set())} className="text-[11px] font-semibold text-[#6b6b78] px-2.5 py-1.5 rounded-full bg-[#f3f3f5]">Décocher</button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 flex-shrink-0">
        <div className="flex gap-2 items-start bg-[#f0e8ff] border border-[#c8a8f0] rounded-xl px-3 py-2 text-xs text-[#4a1370]">
          <span>💡</span>
          <span>Coche pour sélectionner · <strong>🚫 Bloquer</strong> exclut définitivement un gardien pour ce camp.</span>
        </div>
      </div>

      {/* Liste gardiens */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {loading && <div className="flex flex-col items-center justify-center py-16 text-[#9b9ba8]"><div className="text-4xl animate-pulse mb-3">👥</div><p className="text-sm">Chargement…</p></div>}

        {!loading && (
          <>
            {/* Disponibles */}
            {filteredVisible.length > 0 && (
              <>
                <div className="px-4 py-1.5 bg-[#F7F8FA] border-b border-[#f0f0f0]">
                  <span className="text-[11px] text-[#9b9ba8] font-semibold uppercase tracking-wider">
                    {filteredVisible.length} gardien{filteredVisible.length > 1 ? 's' : ''}
                    {selected.size > 0 ? ` · ${selected.size} sélectionné${selected.size > 1 ? 's' : ''}` : ''}
                  </span>
                </div>
                <div className="divide-y divide-[#f5f5f7]">
                  {sortedVisible.map((r, idx) => {
                    const adhStatut    = r.adhesions?.[0]?.statut ?? 'NON_A_JOUR';
                    const adh          = ADH_CFG[adhStatut] ?? ADH_CFG.NON_A_JOUR;
                    const isWaiting    = waitingIds.has(r.id);
                    const isSelected   = selected.has(r.id);
                    const wasConfirmed = confirmed.has(r.id);
                    const isNew        = isSelected && !wasConfirmed && !isWaiting;
                    const isRemoved    = !isSelected && wasConfirmed;

                    return (
                      <div key={r.id} className={`flex items-center px-4 py-3 gap-3 transition-colors border-l-4 ${
                        isWaiting  ? 'bg-[#fffbef] border-[#D9A441]' :
                        isSelected ? 'bg-[#f5f0ff] border-transparent' :
                        isRemoved  ? 'bg-[#fff5f5] border-transparent' :
                                     'hover:bg-[#fafafa] border-transparent'
                      }`}>
                        {/* Checkbox zone */}
                        <button onClick={() => toggle(r.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                          <Avatar user={r} idx={idx} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-semibold text-sm ${isRemoved ? 'line-through text-[#9b9ba8]' : 'text-[#1F1B2E]'}`}>{r.prenoms} {r.nom}</span>
                              {isWaiting   && <span className="inline-flex items-center gap-1 text-[10px] text-[#9c7218] font-black bg-[#D9A441] text-white px-2 py-0.5 rounded-full animate-pulse">⏳ Demande</span>}
                              {wasConfirmed && !isRemoved && !isWaiting && <span className="text-[10px] text-[#6A1B9A] font-bold bg-[#f0e8ff] px-1.5 py-0.5 rounded-full">Inscrit</span>}
                              {isNew       && <span className="text-[10px] text-[#2E7D32] font-bold bg-[#e8f5e9] px-1.5 py-0.5 rounded-full">+ Nouveau</span>}
                              {isRemoved   && <span className="text-[10px] text-[#E55A35] font-bold bg-[#fff8f3] px-1.5 py-0.5 rounded-full">À retirer</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-[#9b9ba8] font-mono">{r.matricule ?? '—'}</span>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${adh.bg} ${adh.text} ${adh.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${adh.dot}`} />{adh.label}
                              </span>
                            </div>
                          </div>
                        </button>

                        {/* Bloquer + Checkbox */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleBlock(r.id, `${r.prenoms} ${r.nom}`)}
                            disabled={blockingId === r.id}
                            title="Bloquer ce gardien pour ce camp"
                            className="w-7 h-7 rounded-lg bg-[#fff8f3] text-[#E55A35] border border-[#ef9a9a] flex items-center justify-center text-xs hover:bg-[#E55A35] hover:text-white transition-colors disabled:opacity-60">
                            {blockingId === r.id ? '…' : '🚫'}
                          </button>
                          <button onClick={() => toggle(r.id)}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#6A1B9A] border-[#6A1B9A] text-white' : 'border-[#d0d0d8] bg-white'}`}>
                            {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Bloqués (section séparée) */}
            {blockedGardiens.length > 0 && (
              <>
                <div className="px-4 py-1.5 bg-[#fff5f5] border-y border-[#fdd]">
                  <span className="text-[11px] text-[#E55A35] font-semibold uppercase tracking-wider">
                    🚫 {blockedGardiens.length} bloqué{blockedGardiens.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="divide-y divide-[#f5f5f7]">
                  {blockedGardiens.map((r, idx) => (
                    <div key={r.id} className="flex items-center px-4 py-3 gap-3 bg-[#fff8f8] opacity-80">
                      <Avatar user={r} idx={idx} greyed />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm text-[#9b9ba8] line-through">{r.prenoms} {r.nom}</span>
                        <div className="text-[11px] text-[#9b9ba8] font-mono mt-0.5">{r.matricule ?? '—'}</div>
                      </div>
                      <button onClick={() => handleUnblock(r.id, `${r.prenoms} ${r.nom}`)} disabled={blockingId === r.id}
                        className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[#e8f5e9] text-[#2E7D32] border border-[#a5d6a7] hover:bg-[#2E7D32] hover:text-white transition-colors disabled:opacity-60">
                        {blockingId === r.id ? '…' : '↩ Débloquer'}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {filteredVisible.length === 0 && blockedGardiens.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-[#9b9ba8]">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-sm font-semibold">Aucun gardien trouvé</p>
              </div>
            )}
          </>
        )}
        <div className="h-4" />
      </div>

      {/* Barre d'action — flex-shrink-0 pour ne pas chevaucher la BottomNav */}
      <div className="flex-shrink-0 p-4 bg-white border-t border-[#ececf0] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {hasChanges && (
          <div className="flex items-center gap-2 mb-2 text-xs">
            {toAdd.length > 0    && <span className="text-[#2E7D32] font-semibold">+ {toAdd.length} à ajouter</span>}
            {toAdd.length > 0 && toRemove.length > 0 && <span className="text-[#9b9ba8]">·</span>}
            {toRemove.length > 0 && <span className="text-[#E55A35] font-semibold">− {toRemove.length} à retirer</span>}
          </div>
        )}
        <button onClick={handleSave} disabled={saving || !hasChanges}
          className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${hasChanges ? 'bg-gradient-to-r from-[#F58A4B] via-[#E55A35] to-[#7A2820] text-white shadow-md' : 'bg-[#f3f3f5] text-[#9b9ba8] cursor-not-allowed'} disabled:opacity-60`}>
          {saving ? 'Enregistrement…'
            : hasChanges ? `Enregistrer (${selected.size} participant${selected.size > 1 ? 's' : ''})`
            : `Sélection enregistrée · ${selected.size} participant${selected.size > 1 ? 's' : ''}`}
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VUE SENTINELLE — onglets Gardiens / Guides
// ─────────────────────────────────────────────────────────────────────────────

function SentinelleView({ campId, user, toast }: {
  campId: string;
  user: User | null;
  toast: (msg: string, ok: boolean) => void;
}) {
  const [camp, setCamp]                   = useState<Camp | null>(null);
  const [participants, setParticipants]   = useState<CampParticipant[]>([]);
  const [guides, setGuides]               = useState<User[]>([]);
  const [loading, setLoading]             = useState(true);
  const [actionId, setActionId]           = useState<string | null>(null);
  const [search, setSearch]               = useState('');
  const [tab, setTab]                     = useState<'gardiens' | 'guides'>('gardiens');
  const [statusFilter, setStatusFilter]   = useState<'tous' | 'SELECTIONNE' | 'BLOQUE' | 'CONFIRME'>('tous');

  const reload = useCallback(() => {
    const districtId = user?.district?.id;
    Promise.allSettled([
      campsApi.get(campId),
      campsApi.participants(campId),
      districtId ? usersApi.list({ role: 'GUIDE', districtId }) : Promise.resolve({ data: [] }),
    ]).then(([c, p, g]) => {
      if (c.status === 'fulfilled') setCamp(c.value.data);
      if (p.status === 'fulfilled') setParticipants(p.value.data as CampParticipant[]);
      if (g.status === 'fulfilled') setGuides(g.value.data as User[]);
    }).catch(() => toast('Erreur lors du chargement.', false))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campId, user]);

  useEffect(() => { reload(); }, [reload]);

  const handle = async (action: 'remove' | 'block' | 'unblock' | 'select', userId: string, name: string) => {
    setActionId(userId + '-' + action);
    try {
      if (action === 'remove')   await campsApi.removeParticipant(campId, userId);
      if (action === 'block')    await campsApi.blockParticipant(campId, userId);
      if (action === 'unblock')  await campsApi.unblockParticipant(campId, userId);
      if (action === 'select')   await campsApi.selectParticipant(campId, userId);
      const msgs: Record<string, string> = {
        remove: `${name} retiré du camp.`,
        block:  `${name} bloqué pour ce camp.`,
        unblock:`${name} débloqué.`,
        select: `${name} sélectionné pour ce camp.`,
      };
      toast(msgs[action], true);
      reload();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast(msg ?? 'Erreur.', false);
    } finally { setActionId(null); }
  };

  // ── Onglet Gardiens ──
  const gardienParts = participants.filter(p => p.user?.role === 'GARDIEN' || !p.user?.role || p.user.role === undefined);
  const nbSel  = gardienParts.filter(p => p.participationStatus === 'SELECTIONNE').length;
  const nbConf = gardienParts.filter(p => p.participationStatus === 'CONFIRME').length;
  const nbBloq = gardienParts.filter(p => p.participationStatus === 'BLOQUE').length;

  const filteredGardiens = gardienParts.filter(p => {
    const u = p.user;
    const q = search.trim().toLowerCase();
    if (q && !`${u?.nom ?? ''} ${u?.prenoms ?? ''} ${u?.matricule ?? ''}`.toLowerCase().includes(q)) return false;
    return statusFilter === 'tous' || p.participationStatus === statusFilter;
  });

  // ── Onglet Guides ──
  const guidePartsMap = new Map(
    participants.filter(p => p.user?.role === 'GUIDE').map(p => [p.userId, p])
  );
  const filteredGuides = guides.filter(g => {
    const q = search.trim().toLowerCase();
    return !q || `${g.nom} ${g.prenoms} ${g.matricule ?? ''}`.toLowerCase().includes(q);
  });
  const nbGuidesSel  = guides.filter(g => guidePartsMap.has(g.id) && guidePartsMap.get(g.id)?.participationStatus !== 'BLOQUE').length;
  const nbGuidesBloq = guides.filter(g => guidePartsMap.get(g.id)?.participationStatus === 'BLOQUE').length;

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] text-white px-4 pt-4 pb-5 flex-shrink-0">
        <button onClick={() => history.back()} className="flex items-center gap-1 text-xs opacity-75 mb-3">‹ Retour</button>
        <h1 className="text-xl font-black">Gestion des participants</h1>
        <p className="text-xs opacity-80 mt-0.5">{camp?.nom ?? 'Camp'} · {getTerritoryLabel(user)}</p>

        {!loading && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { label: 'Sélect.',  value: nbSel,          color: 'bg-[#6A1B9A]/60' },
              { label: 'Confirmés',value: nbConf,         color: 'bg-[#2E7D32]/60' },
              { label: 'Bloqués',  value: nbBloq,         color: nbBloq > 0 ? 'bg-[#E55A35]/60' : 'bg-white/10' },
              { label: 'Guides',   value: nbGuidesSel,    color: 'bg-white/15' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-xl p-2 text-center`}>
                <div className="text-base font-black">{s.value}</div>
                <div className="text-[9px] opacity-80 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info banner */}
      <div className="px-4 pt-3 flex-shrink-0">
        <div className="flex gap-2 items-start bg-[#fff8e6] border border-[#ffe082] rounded-xl px-3 py-2 text-xs text-[#9c7218]">
          <span>🛡️</span>
          <div><strong>Retirer</strong> : le guide peut resélectionner. <strong>Bloquer</strong> : irréversible par les guides.</div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-[#f0f0f0] px-4 mt-3 flex-shrink-0 bg-white">
        {([
          { key: 'gardiens', label: `👤 Gardiens (${gardienParts.length})` },
          { key: 'guides',   label: `📖 Guides (${guides.length})` },
        ] as { key: typeof tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); setStatusFilter('tous'); }}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider relative transition-colors ${tab === t.key ? 'text-[#1F1B2E]' : 'text-[#9b9ba8]'}`}>
            {t.label}
            {tab === t.key && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#6A1B9A] rounded-t-full" />}
          </button>
        ))}
      </div>

      {/* Recherche + filtres */}
      <div className="border-b border-[#f0f0f0] px-4 py-2.5 flex-shrink-0 bg-white">
        <div className="flex items-center bg-[#F0F2F5] rounded-full px-3 py-2 gap-2 mb-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#9b9ba8]" placeholder="Nom ou matricule…" />
          {search && <button onClick={() => setSearch('')} className="text-[#9b9ba8]">✕</button>}
        </div>
        {tab === 'gardiens' && (
          <div className="flex gap-1.5 overflow-x-auto">
            {([
              { key: 'tous',       label: `Tous (${gardienParts.length})` },
              { key: 'SELECTIONNE',label: `Sélect. (${nbSel})` },
              { key: 'CONFIRME',   label: `Confirmés (${nbConf})` },
              { key: 'BLOQUE',     label: `Bloqués (${nbBloq})` },
            ] as { key: typeof statusFilter; label: string }[]).map(f => (
              <button key={f.key} onClick={() => setStatusFilter(f.key)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold ${statusFilter === f.key ? 'bg-[#1F1B2E] text-white' : 'bg-[#f3f3f5] text-[#6b6b78]'}`}>
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {loading && <div className="flex flex-col items-center justify-center py-16 text-[#9b9ba8]"><div className="text-4xl animate-pulse mb-3">⛺</div></div>}

        {/* ── Onglet Gardiens ── */}
        {!loading && tab === 'gardiens' && (
          <>
            {filteredGardiens.length === 0 && <div className="flex flex-col items-center justify-center py-12 text-[#9b9ba8]"><div className="text-3xl mb-2">🔍</div><p className="text-sm">Aucun participant</p></div>}
            <div className="divide-y divide-[#f5f5f7]">
              {filteredGardiens.map((p, idx) => {
                const u          = p.user;
                const statusCfg  = STATUS_CFG[p.participationStatus] ?? STATUS_CFG.SELECTIONNE;
                const adh        = ADH_CFG[p.adhesionStatusSnapshot] ?? ADH_CFG.NON_A_JOUR;
                const isBlocked  = p.participationStatus === 'BLOQUE';
                const isLocked   = p.participationStatus === 'CONFIRME' || p.participationStatus === 'PRESENT';
                const busy       = actionId?.startsWith(p.userId);

                return (
                  <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${isBlocked ? 'bg-[#fff5f5] opacity-75' : 'hover:bg-[#fafafa]'}`}>
                    <Avatar user={u ?? {}} idx={idx} greyed={isBlocked} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-sm ${isBlocked ? 'line-through text-[#9b9ba8]' : 'text-[#1F1B2E]'}`}>{u?.prenoms} {u?.nom}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>{statusCfg.icon} {statusCfg.label}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-[#9b9ba8] font-mono">{u?.matricule ?? '—'}</span>
                        {p.parish?.nom && <span className="text-[11px] text-[#9b9ba8]">· {p.parish.nom}</span>}
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${adh.bg} ${adh.text} ${adh.border}`}><span className={`w-1.5 h-1.5 rounded-full ${adh.dot}`}/>{adh.label}</span>
                      </div>
                    </div>
                    {!isLocked && (
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        {isBlocked ? (
                          <button onClick={() => handle('unblock', p.userId, `${u?.prenoms} ${u?.nom}`)} disabled={!!busy}
                            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[#e8f5e9] text-[#2E7D32] border border-[#a5d6a7] disabled:opacity-60 hover:bg-[#2E7D32] hover:text-white transition-colors">
                            {busy ? '…' : '↩ Débloquer'}
                          </button>
                        ) : (
                          <>
                            <button onClick={() => handle('remove', p.userId, `${u?.prenoms} ${u?.nom}`)} disabled={!!busy}
                              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[#fff8e6] text-[#9c7218] border border-[#ffe082] disabled:opacity-60 hover:bg-[#D9A441] hover:text-white transition-colors">
                              {actionId === p.userId + '-remove' ? '…' : '− Retirer'}
                            </button>
                            <button onClick={() => handle('block', p.userId, `${u?.prenoms} ${u?.nom}`)} disabled={!!busy}
                              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[#fff8f3] text-[#E55A35] border border-[#ef9a9a] disabled:opacity-60 hover:bg-[#E55A35] hover:text-white transition-colors">
                              {actionId === p.userId + '-block' ? '…' : '🚫 Bloquer'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {isLocked && <span className="text-[10px] text-[#9b9ba8] flex-shrink-0">Verrouillé</span>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Onglet Guides ── */}
        {!loading && tab === 'guides' && (
          <>
            {filteredGuides.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-[#9b9ba8]">
                <div className="text-3xl mb-2">📖</div>
                <p className="text-sm">Aucun guide dans ce district</p>
              </div>
            )}

            {filteredGuides.length > 0 && (
              <>
                <div className="px-4 py-1.5 bg-[#F7F8FA] border-b border-[#f0f0f0]">
                  <span className="text-[11px] text-[#9b9ba8] font-semibold uppercase tracking-wider">
                    {filteredGuides.length} guide{filteredGuides.length > 1 ? 's' : ''} · {nbGuidesSel} sélectionné{nbGuidesSel > 1 ? 's' : ''} · {nbGuidesBloq} bloqué{nbGuidesBloq > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="divide-y divide-[#f5f5f7]">
                  {filteredGuides.map((g, idx) => {
                    const part       = guidePartsMap.get(g.id);
                    const isBlocked  = part?.participationStatus === 'BLOQUE';
                    const isSelected = !!part && !isBlocked;
                    const busy       = actionId?.startsWith(g.id);
                    const statusCfg  = isBlocked ? STATUS_CFG.BLOQUE : isSelected ? STATUS_CFG.SELECTIONNE : null;

                    return (
                      <div key={g.id} className={`flex items-center gap-3 px-4 py-3 ${isBlocked ? 'bg-[#fff5f5] opacity-75' : isSelected ? 'bg-[#f5f0ff]' : 'hover:bg-[#fafafa]'}`}>
                        <Avatar user={g} idx={idx} greyed={isBlocked} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold text-sm ${isBlocked ? 'line-through text-[#9b9ba8]' : 'text-[#1F1B2E]'}`}>{g.prenoms} {g.nom}</span>
                            {statusCfg && (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                                {statusCfg.icon} {statusCfg.label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-[#9b9ba8] font-mono">{g.matricule ?? '—'}</span>
                            {g.parish?.nom && <span className="text-[11px] text-[#9b9ba8]">· {g.parish.nom}</span>}
                          </div>
                        </div>

                        {/* Actions guides */}
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          {isBlocked ? (
                            <button onClick={() => handle('unblock', g.id, `${g.prenoms} ${g.nom}`)} disabled={!!busy}
                              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[#e8f5e9] text-[#2E7D32] border border-[#a5d6a7] disabled:opacity-60 hover:bg-[#2E7D32] hover:text-white transition-colors">
                              {busy ? '…' : '↩ Débloquer'}
                            </button>
                          ) : isSelected ? (
                            <>
                              <button onClick={() => handle('remove', g.id, `${g.prenoms} ${g.nom}`)} disabled={!!busy}
                                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[#fff8e6] text-[#9c7218] border border-[#ffe082] disabled:opacity-60 hover:bg-[#D9A441] hover:text-white transition-colors">
                                {actionId === g.id + '-remove' ? '…' : '− Retirer'}
                              </button>
                              <button onClick={() => handle('block', g.id, `${g.prenoms} ${g.nom}`)} disabled={!!busy}
                                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[#fff8f3] text-[#E55A35] border border-[#ef9a9a] disabled:opacity-60 hover:bg-[#E55A35] hover:text-white transition-colors">
                                {actionId === g.id + '-block' ? '…' : '🚫 Bloquer'}
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handle('select', g.id, `${g.prenoms} ${g.nom}`)} disabled={!!busy}
                                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[#EDE7F6] text-[#6A1B9A] border border-[#ce93d8] disabled:opacity-60 hover:bg-[#6A1B9A] hover:text-white transition-colors">
                                {actionId === g.id + '-select' ? '…' : '+ Sélectionner'}
                              </button>
                              <button onClick={() => handle('block', g.id, `${g.prenoms} ${g.nom}`)} disabled={!!busy}
                                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[#fff8f3] text-[#E55A35] border border-[#ef9a9a] disabled:opacity-60 hover:bg-[#E55A35] hover:text-white transition-colors">
                                {actionId === g.id + '-block' ? '…' : '🚫 Bloquer'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
        <div className="h-8" />
      </div>
    </>
  );
}
