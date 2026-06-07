'use client';
import { useEffect, useState, useCallback } from 'react';
import { councilsApi } from '@/lib/api';
import type { Council, CouncilStatus } from '@/types';

// ─── Config rôles ─────────────────────────────────────────────────────────────

const ROLE_PRESETS: { key: string; label: string; roles: string[]; icon: string; color: string }[] = [
  { key: 'SENTINELLES',        label: 'Sentinelles',           roles: ['SENTINELLE'],                   icon: '🛡️',  color: 'bg-[#D9A441]/10 text-[#D9A441]' },
  { key: 'GUIDES',             label: 'Guides',                roles: ['GUIDE'],                        icon: '📖', color: 'bg-[#6A1B9A]/10 text-[#6A1B9A]' },
  { key: 'SENT_GUIDES',        label: 'Sentinelles + Guides',  roles: ['SENTINELLE', 'GUIDE'],          icon: '🛡️📖', color: 'bg-[#1F1B2E]/10 text-[#1F1B2E]' },
  { key: 'GARDIENS',           label: 'Gardiens',              roles: ['GARDIEN'],                      icon: '🤝', color: 'bg-[#C62828]/10 text-[#C62828]' },
  { key: 'GUIDES_GARDIENS',    label: 'Guides + Gardiens',     roles: ['GUIDE', 'GARDIEN'],             icon: '📖🤝', color: 'bg-[#2E7D32]/10 text-[#2E7D32]' },
  { key: 'TOUS',               label: 'Tous les membres',      roles: ['GARDIEN', 'GUIDE', 'SENTINELLE'], icon: '🌍', color: 'bg-[#6A1B9A]/10 text-[#6A1B9A]' },
];

const STATUS_STYLE: Record<CouncilStatus, { label: string; bg: string; text: string; border: string }> = {
  PLANIFIE: { label: '📅 Planifié',  bg: 'bg-[#EDE7F6]', text: 'text-[#6A1B9A]', border: 'border-[#ce93d8]' },
  EN_COURS: { label: '🔴 En cours',  bg: 'bg-[#fff8e1]', text: 'text-[#D9A441]', border: 'border-[#ffe082]' },
  TERMINE:  { label: '✓ Terminé',    bg: 'bg-[#e8f5e9]', text: 'text-[#2E7D32]', border: 'border-[#a5d6a7]' },
  ANNULE:   { label: '✕ Annulé',     bg: 'bg-[#f5f5f5]', text: 'text-[#9b9ba8]', border: 'border-[#e0e0e0]' },
};

function getRolesLabel(roles: string[]) {
  const preset = ROLE_PRESETS.find(p => JSON.stringify([...p.roles].sort()) === JSON.stringify([...roles].sort()));
  if (preset) return { label: preset.label, icon: preset.icon, color: preset.color };
  return { label: roles.join(' + '), icon: '👥', color: 'bg-[#f5f5f5] text-[#6b6b78]' };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminConseils() {
  const [councils, setCouncils]     = useState<Council[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editTarget, setEditTarget] = useState<Council | null>(null);
  const [deleting, setDeleting]     = useState<string | null>(null);

  const load = useCallback(() => {
    councilsApi.list()
      .then(r => setCouncils(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try { await councilsApi.remove(id); load(); } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="bg-white border-b border-[#ececf0] px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-black text-[#1F1B2E]">🏛️ Conseils de communauté</h1>
          <button onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="flex items-center gap-1 bg-[#1F1B2E] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#2d2640] transition-colors">
            + Nouveau
          </button>
        </div>
        <p className="text-[11px] text-[#9b9ba8] mt-0.5">
          {councils.length} conseil{councils.length !== 1 ? 's' : ''} · Réunions ciblées par rôle
        </p>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto bg-[#f6f6fa] px-3 py-3 lg:px-6 lg:py-4">

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-[#9b9ba8]">
            <div className="text-4xl animate-pulse mb-3">🏛️</div>
          </div>
        )}

        {!loading && councils.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[#9b9ba8]">
            <div className="text-4xl mb-3">🏛️</div>
            <p className="font-semibold text-sm text-[#1F1B2E]">Aucun conseil planifié</p>
            <p className="text-xs mt-1">Créez le premier conseil de communauté.</p>
            <button onClick={() => { setEditTarget(null); setShowForm(true); }}
              className="mt-4 px-5 py-2 bg-[#1F1B2E] text-white text-xs font-bold rounded-xl">
              + Créer un conseil
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-4">
          {councils.map(c => {
            const st = STATUS_STYLE[c.statut];
            const rl = getRolesLabel(c.targetRoles);
            const territory = c.parish?.nom ?? c.district?.nom ?? c.region?.nom;

            return (
              <div key={c.id} className="bg-white rounded-2xl border border-[#ececf0] overflow-hidden shadow-sm">
                <div className="px-4 pt-3.5 pb-3">
                  {/* Titre + statut */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h2 className="font-bold text-[14px] text-[#1F1B2E] leading-tight flex-1">{c.nom}</h2>
                    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${st.bg} ${st.text} ${st.border}`}>
                      {st.label}
                    </span>
                  </div>

                  {/* Rôles ciblés */}
                  <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full mb-2 ${rl.color}`}>
                    <span>{rl.icon}</span>
                    <span>{rl.label}</span>
                  </div>

                  {/* Infos */}
                  <div className="flex flex-col gap-1 text-[11px] text-[#6b6b78]">
                    <span>📅 {fmtDate(c.date)}</span>
                    {c.lieu    && <span>📍 {c.lieu}</span>}
                    {territory && <span>🗺️ {territory}</span>}
                    {c.description && (
                      <p className="text-[11px] text-[#9b9ba8] italic mt-1 leading-relaxed">{c.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => { setEditTarget(c); setShowForm(true); }}
                      className="flex-1 py-1.5 rounded-xl text-[11px] font-semibold bg-[#f0e8ff] text-[#6A1B9A] hover:bg-[#6A1B9A] hover:text-white transition-colors">
                      ✎ Modifier
                    </button>
                    <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                      className="py-1.5 px-3 rounded-xl text-[11px] font-semibold bg-[#fff5f5] text-[#C62828] hover:bg-[#C62828] hover:text-white transition-colors disabled:opacity-40">
                      {deleting === c.id ? '…' : '🗑️'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="h-4" />
      </div>

      {/* Formulaire (modal) */}
      {showForm && (
        <CouncilForm
          initial={editTarget}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

// ─── Formulaire création / édition ────────────────────────────────────────────

function CouncilForm({ initial, onClose, onSaved }: {
  initial: Council | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nom, setNom]               = useState(initial?.nom ?? '');
  const [description, setDesc]      = useState(initial?.description ?? '');
  const [date, setDate]             = useState(initial ? initial.date.slice(0, 10) : '');
  const [lieu, setLieu]             = useState(initial?.lieu ?? '');
  const [statut, setStatut]         = useState<CouncilStatus>(initial?.statut ?? 'PLANIFIE');
  const [selectedRoles, setRoles]   = useState<string[]>(initial?.targetRoles ?? []);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const togglePreset = (roles: string[]) => {
    const key = JSON.stringify([...roles].sort());
    const cur  = JSON.stringify([...selectedRoles].sort());
    setRoles(key === cur ? [] : roles);
  };

  const handleSave = async () => {
    if (!nom.trim() || !date || selectedRoles.length === 0) {
      setError('Nom, date et rôles ciblés sont obligatoires.'); return;
    }
    setSaving(true); setError('');
    try {
      const payload = { nom: nom.trim(), description: description.trim() || undefined, date, lieu: lieu.trim() || undefined, statut, targetRoles: selectedRoles };
      if (initial) await councilsApi.update(initial.id, payload);
      else         await councilsApi.create(payload);
      onSaved();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Erreur lors de l\'enregistrement.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 pb-16 sm:pb-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-[#1F1B2E] to-[#3a1d4d] text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-base">{initial ? 'Modifier le conseil' : 'Nouveau conseil'}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-sm">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {error && <div className="p-3 bg-[#fff0f0] border border-[#f5c6c6] rounded-xl text-[#C62828] text-xs">{error}</div>}

          {/* Nom */}
          <div>
            <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Nom du conseil *</label>
            <input value={nom} onChange={e => setNom(e.target.value)}
              placeholder="Conseil régional des sentinelles"
              className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] transition" />
          </div>

          {/* Date + Lieu */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Lieu</label>
              <input value={lieu} onChange={e => setLieu(e.target.value)}
                placeholder="Paroisse de Cocody"
                className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] transition" />
            </div>
          </div>

          {/* Statut */}
          <div>
            <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Statut</label>
            <div className="grid grid-cols-2 gap-2">
              {(['PLANIFIE', 'EN_COURS', 'TERMINE', 'ANNULE'] as CouncilStatus[]).map(s => {
                const st = STATUS_STYLE[s];
                return (
                  <button key={s} type="button" onClick={() => setStatut(s)}
                    className={`py-2 rounded-xl text-[11px] font-semibold border-2 transition-all ${
                      statut === s ? `${st.bg} ${st.text} ${st.border}` : 'bg-white text-[#9b9ba8] border-[#ececf0]'
                    }`}>
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rôles ciblés */}
          <div>
            <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">
              Personnes concernées *
              {selectedRoles.length > 0 && (
                <span className="ml-2 font-normal text-[#6A1B9A]">— {getRolesLabel(selectedRoles).label}</span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_PRESETS.map(preset => {
                const isActive = JSON.stringify([...preset.roles].sort()) === JSON.stringify([...selectedRoles].sort());
                return (
                  <button key={preset.key} type="button" onClick={() => togglePreset(preset.roles)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                      isActive
                        ? 'border-[#6A1B9A] bg-[#EDE7F6]'
                        : 'border-[#ececf0] bg-white hover:border-[#c8c8d4]'
                    }`}>
                    <span className="text-base flex-shrink-0">{preset.icon}</span>
                    <span className={`text-[11px] font-semibold leading-tight ${isActive ? 'text-[#4a1370]' : 'text-[#6b6b78]'}`}>
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Description <span className="font-normal text-[#9b9ba8]">(optionnel)</span></label>
            <textarea value={description} onChange={e => setDesc(e.target.value)} rows={2}
              placeholder="Ordre du jour, contexte…"
              className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] transition resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#f0f0f0] flex gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#f7f7fa] text-[#6b6b78] hover:bg-[#ebebf0] transition">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving || !nom.trim() || !date || selectedRoles.length === 0}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#1F1B2E] to-[#3a1d4d] text-white disabled:opacity-40 transition">
            {saving ? 'Enregistrement…' : (initial ? 'Enregistrer' : 'Créer le conseil')}
          </button>
        </div>
      </div>
    </div>
  );
}
