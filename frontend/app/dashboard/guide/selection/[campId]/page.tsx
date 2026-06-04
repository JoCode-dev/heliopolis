'use client';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import { campsApi, usersApi } from '@/lib/api';
import { getTerritoryLabel } from '@/lib/roles';
import { useAuthStore } from '@/store/auth';
import type { User, Camp, CampParticipant } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type AdhFilter = 'tous' | 'A_JOUR' | 'EN_ATTENTE' | 'NON_A_JOUR';

const ADH_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  A_JOUR:     { label: 'À jour',     dot: 'bg-[#2E7D32]', bg: 'bg-[#e8f5e9]', text: 'text-[#2E7D32]', border: 'border-[#a5d6a7]' },
  EN_ATTENTE: { label: 'En attente', dot: 'bg-[#D9A441]', bg: 'bg-[#fff8e6]', text: 'text-[#9c7218]', border: 'border-[#ffe082]' },
  NON_A_JOUR: { label: 'Non à jour', dot: 'bg-[#C62828]', bg: 'bg-[#fff0f0]', text: 'text-[#C62828]', border: 'border-[#ef9a9a]' },
};

const GRAD = [
  'from-[#C62828] to-[#8e1a1a]', 'from-[#6A1B9A] to-[#4a1370]',
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SelectionPage({ params }: { params: Promise<{ campId: string }> }) {
  const { campId } = use(params);
  const { user }   = useAuthStore();
  const { toasts, show: toast } = useToast();

  const [camp, setCamp]         = useState<Camp | null>(null);
  const [gardiens, setGardiens] = useState<User[]>([]);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set()); // déjà en BDD
  const [selected, setSelected]   = useState<Set<string>>(new Set()); // état courant
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');
  const [adhFilter, setAdhFilter] = useState<AdhFilter>('tous');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!user) return;
    const params: Record<string, string> = { role: 'GARDIEN' };
    if (user.role === 'GUIDE'      && user.parish?.id)   params.parishId   = user.parish.id;
    if (user.role === 'SENTINELLE' && user.district?.id) params.districtId = user.district.id;

    Promise.all([
      campsApi.get(campId),
      usersApi.list(params),
      campsApi.participants(campId),
    ]).then(([c, u, p]) => {
      setCamp(c.data);
      setGardiens(u.data);
      const ids = new Set<string>((p.data as CampParticipant[]).map(pp => pp.userId));
      setConfirmed(ids);
      setSelected(new Set(ids));
    }).catch(() => toast('Erreur lors du chargement.', false))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campId, user]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll   = () => setSelected(new Set(filtered.map(r => r.id)));
  const selectNone  = () => setSelected(new Set());

  // Diff : ajouts et retraits par rapport à l'état confirmé
  const toAdd    = [...selected].filter(id => !confirmed.has(id));
  const toRemove = [...confirmed].filter(id => !selected.has(id));
  const hasChanges = toAdd.length > 0 || toRemove.length > 0;

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    let addOk = 0, removeOk = 0, errors = 0;
    try {
      await Promise.all([
        ...toAdd.map(id =>
          campsApi.selectParticipant(campId, id)
            .then(() => addOk++)
            .catch(() => errors++)
        ),
        ...toRemove.map(id =>
          campsApi.removeParticipant(campId, id)
            .then(() => removeOk++)
            .catch(() => errors++)
        ),
      ]);

      // Mettre à jour l'état confirmé
      const newConfirmed = new Set(selected);
      toRemove.forEach(id => newConfirmed.delete(id));
      setConfirmed(newConfirmed);

      if (errors === 0) {
        const parts: string[] = [];
        if (addOk > 0)    parts.push(`${addOk} ajouté${addOk > 1 ? 's' : ''}`);
        if (removeOk > 0) parts.push(`${removeOk} retiré${removeOk > 1 ? 's' : ''}`);
        toast(`✓ Sélection enregistrée — ${parts.join(', ')}.`, true);
      } else {
        toast(`${errors} erreur${errors > 1 ? 's' : ''} sur ${toAdd.length + toRemove.length} opérations.`, false);
      }
    } catch {
      toast('Erreur lors de l\'enregistrement.', false);
    } finally {
      setSaving(false);
    }
  };

  // Filtres
  const filtered = gardiens.filter(r => {
    const q = search.trim().toLowerCase();
    if (q && !`${r.nom} ${r.prenoms} ${r.matricule ?? ''}`.toLowerCase().includes(q)) return false;
    if (adhFilter === 'tous') return true;
    const adh = r.adhesions?.[0]?.statut ?? 'NON_A_JOUR';
    return adh === adhFilter;
  });

  const countByAdh = (status: string) =>
    gardiens.filter(r => (r.adhesions?.[0]?.statut ?? 'NON_A_JOUR') === status).length;

  const isSentinelle = user?.role === 'SENTINELLE';

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white">

      {/* ── Toasts ── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-2xl text-white text-sm font-semibold shadow-xl flex items-center gap-2.5 min-w-[280px] animate-in fade-in slide-in-from-top-2 duration-300 ${
              t.ok ? 'bg-[#2E7D32]' : 'bg-[#C62828]'
            }`}>
            <span className="text-lg">{t.ok ? '✓' : '✕'}</span>
            <span className="flex-1">{t.msg}</span>
          </div>
        ))}
      </div>

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-[#6A1B9A] via-[#5a1280] to-[#1F1B2E] text-white px-4 pt-4 pb-5 flex-shrink-0">
        <button onClick={() => history.back()}
          className="flex items-center gap-1 text-xs opacity-75 hover:opacity-100 transition mb-3">
          ‹ Retour
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black">Sélection des participants</h1>
            <p className="text-xs opacity-80 mt-0.5">
              {camp?.nom ?? 'Camp'} · {getTerritoryLabel(user)}
            </p>
          </div>
          {camp && (
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-black">{selected.size}</div>
              <div className="text-[10px] opacity-70 uppercase tracking-wider">sélectionnés</div>
            </div>
          )}
        </div>

        {/* Stats rapides */}
        {!loading && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { label: 'Total',      value: gardiens.length,       color: 'bg-white/15' },
              { label: 'À jour',     value: countByAdh('A_JOUR'),  color: 'bg-[#2E7D32]/60' },
              { label: 'Inscrits',   value: confirmed.size,        color: 'bg-[#6A1B9A]/60' },
              { label: 'Modifiés',   value: toAdd.length + toRemove.length, color: hasChanges ? 'bg-[#D9A441]/60' : 'bg-white/10' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-xl p-2 text-center`}>
                <div className="text-base font-black">{s.value}</div>
                <div className="text-[9px] opacity-80 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Filtres ── */}
      <div className="border-b border-[#f0f0f0] px-4 py-2.5 flex-shrink-0 bg-white">
        {/* Recherche */}
        <div className="flex items-center bg-[#F0F2F5] rounded-full px-3 py-2 gap-2 mb-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#9b9ba8]"
            placeholder="Rechercher par nom ou matricule…" />
          {search && <button onClick={() => setSearch('')} className="text-[#9b9ba8]">✕</button>}
        </div>

        {/* Filtres adhésion + actions rapides */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {([
            { key: 'tous',      label: `Tous (${gardiens.length})` },
            { key: 'A_JOUR',    label: `À jour (${countByAdh('A_JOUR')})` },
            { key: 'EN_ATTENTE',label: `Attente (${countByAdh('EN_ATTENTE')})` },
            { key: 'NON_A_JOUR',label: `Non à jour (${countByAdh('NON_A_JOUR')})` },
          ] as { key: AdhFilter; label: string }[]).map(f => (
            <button key={f.key} onClick={() => setAdhFilter(f.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                adhFilter === f.key
                  ? 'bg-[#6A1B9A] text-white'
                  : 'bg-[#f3f3f5] text-[#6b6b78] hover:bg-[#ebebf0]'
              }`}>
              {f.label}
            </button>
          ))}
          <div className="ml-auto flex gap-1.5 flex-shrink-0">
            <button onClick={selectAll}
              className="text-[11px] font-semibold text-[#6A1B9A] px-2.5 py-1.5 rounded-full bg-[#f0e8ff] hover:bg-[#e0d0ff] transition">
              Tout cocher
            </button>
            <button onClick={selectNone}
              className="text-[11px] font-semibold text-[#6b6b78] px-2.5 py-1.5 rounded-full bg-[#f3f3f5] hover:bg-[#ebebf0] transition">
              Tout décocher
            </button>
          </div>
        </div>
      </div>

      {/* ── Bannière règle 5.4 ── */}
      <div className="px-4 pt-3 pb-0 flex-shrink-0">
        <div className="flex gap-2 items-start bg-[#f0e8ff] border border-[#c8a8f0] rounded-xl px-3 py-2 text-xs text-[#4a1370]">
          <span>💡</span>
          <span>Tu peux sélectionner même les gardiens <strong>non à jour</strong> d'adhésion (règle 5.4).</span>
        </div>
      </div>

      {/* ── Liste ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-[#9b9ba8]">
            <div className="text-4xl animate-pulse mb-3">👥</div>
            <p className="text-sm">Chargement des gardiens…</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[#9b9ba8]">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm font-semibold text-[#1F1B2E]">
              {search ? `Aucun résultat pour « ${search} »` : 'Aucun gardien dans cette catégorie'}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            <div className="px-4 py-1.5 bg-[#F7F8FA] border-b border-[#f0f0f0]">
              <span className="text-[11px] text-[#9b9ba8] font-semibold uppercase tracking-wider">
                {filtered.length} gardien{filtered.length > 1 ? 's' : ''}
                {selected.size > 0 ? ` · ${selected.size} sélectionné${selected.size > 1 ? 's' : ''}` : ''}
              </span>
            </div>

            <div className="divide-y divide-[#f5f5f7]">
              {filtered.map((r, idx) => {
                const adhStatut = r.adhesions?.[0]?.statut ?? 'NON_A_JOUR';
                const adh       = ADH_CONFIG[adhStatut] ?? ADH_CONFIG.NON_A_JOUR;
                const isSelected = selected.has(r.id);
                const wasConfirmed = confirmed.has(r.id);
                const isNew     = isSelected && !wasConfirmed;
                const isRemoved = !isSelected && wasConfirmed;
                const color     = GRAD[idx % GRAD.length];

                return (
                  <button key={r.id} onClick={() => toggle(r.id)}
                    className={`flex items-center w-full px-4 py-3.5 text-left transition-colors ${
                      isSelected ? 'bg-[#f5f0ff]' : isRemoved ? 'bg-[#fff5f5]' : 'hover:bg-[#F5F5F5]'
                    }`}>

                    {/* Avatar */}
                    <div className={`w-[48px] h-[48px] rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden`}>
                      {r.avatarUrl
                        ? <img src={r.avatarUrl} className="w-full h-full object-cover" alt="" />
                        : `${r.nom[0]}${r.prenoms[0]}`}
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0 ml-3 py-1 border-b border-[#F2F2F2]">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className={`font-semibold text-[15px] truncate ${isRemoved ? 'line-through text-[#9b9ba8]' : 'text-[#1F1B2E]'}`}>
                          {r.prenoms} {r.nom}
                        </span>
                        {wasConfirmed && !isRemoved && (
                          <span className="text-[10px] text-[#6A1B9A] font-bold bg-[#f0e8ff] px-1.5 py-0.5 rounded-full flex-shrink-0">
                            Inscrit
                          </span>
                        )}
                        {isNew && (
                          <span className="text-[10px] text-[#2E7D32] font-bold bg-[#e8f5e9] px-1.5 py-0.5 rounded-full flex-shrink-0">
                            + Nouveau
                          </span>
                        )}
                        {isRemoved && (
                          <span className="text-[10px] text-[#C62828] font-bold bg-[#fff0f0] px-1.5 py-0.5 rounded-full flex-shrink-0">
                            À retirer
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[12px] text-[#9b9ba8] font-mono">{r.matricule ?? '—'}</span>
                        {isSentinelle && r.parish && (
                          <span className="text-[11px] text-[#9b9ba8] truncate">· {r.parish.nom}</span>
                        )}
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${adh.bg} ${adh.text} ${adh.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${adh.dot}`} />
                          {adh.label}
                        </span>
                      </div>
                    </div>

                    {/* Checkbox */}
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ml-3 flex-shrink-0 ${
                      isSelected
                        ? 'bg-[#6A1B9A] border-[#6A1B9A] text-white'
                        : 'border-[#d0d0d8] bg-white'
                    }`}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="h-28" />
      </div>

      {/* ── Bouton de sauvegarde flottant ── */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-[#ececf0] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {hasChanges && (
          <div className="flex items-center gap-2 mb-2 text-xs text-[#6b6b78]">
            {toAdd.length > 0 && (
              <span className="flex items-center gap-1 text-[#2E7D32] font-semibold">
                <span className="w-4 h-4 rounded-full bg-[#e8f5e9] flex items-center justify-center text-[10px]">+</span>
                {toAdd.length} à ajouter
              </span>
            )}
            {toAdd.length > 0 && toRemove.length > 0 && <span>·</span>}
            {toRemove.length > 0 && (
              <span className="flex items-center gap-1 text-[#C62828] font-semibold">
                <span className="w-4 h-4 rounded-full bg-[#fff0f0] flex items-center justify-center text-[10px]">−</span>
                {toRemove.length} à retirer
              </span>
            )}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.99] ${
            hasChanges
              ? 'bg-gradient-to-r from-[#6A1B9A] to-[#4a1370] text-white shadow-md'
              : 'bg-[#f3f3f5] text-[#9b9ba8] cursor-not-allowed'
          } disabled:opacity-60`}>
          {saving
            ? '⏳ Enregistrement…'
            : hasChanges
              ? `Enregistrer la sélection (${selected.size} participant${selected.size > 1 ? 's' : ''})`
              : `Sélection enregistrée · ${selected.size} participant${selected.size > 1 ? 's' : ''}`
          }
        </button>
      </div>
    </div>
  );
}
