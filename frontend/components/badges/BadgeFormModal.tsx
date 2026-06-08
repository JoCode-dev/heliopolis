'use client';
import { useEffect, useState } from 'react';
import { badgesApi } from '@/lib/api';
import { deferEffect } from '@/lib/effects';
import type { Badge } from '@/types';

type ConditionType =
  | 'challenges_validated'
  | 'communautaire_validated'
  | 'spirituel_validated'
  | 'points_total'
  | 'categorie_validated'
  | 'categorie_spread';

const CONDITION_LABELS: Record<ConditionType, string> = {
  challenges_validated:    'Valider N défis (tous types)',
  communautaire_validated: 'Valider N défis communautaires',
  spirituel_validated:     'Valider N défis spirituels',
  points_total:            'Atteindre N points au total',
  categorie_validated:     'Valider N défis d\'une catégorie précise',
  categorie_spread:        'Valider des défis dans N catégories différentes',
};

const CATEGORIES = ['PERSONNEL', 'COMMUNAUTAIRE', 'SPIRITUEL', 'LONG'];

const NIVEAUX = ['BRONZE', 'ARGENT', 'OR', 'LEGENDE'];

interface Props {
  badge?: Badge;
  onClose: () => void;
  onSaved: () => void;
  canDelete?: boolean;
}

type BadgeConditionMeta = {
  type?: ConditionType;
  count?: number;
  points?: number;
  categorie?: string;
  minCategories?: number;
};

type BadgeWithMeta = Badge & {
  conditionMeta?: BadgeConditionMeta;
};

function getBadgeMeta(badge?: Badge) {
  return (badge as BadgeWithMeta | undefined)?.conditionMeta;
}

function getApiErrorMessage(err: unknown, fallback: string) {
  const response = (err as { response?: { data?: { message?: unknown } } })?.response;
  return typeof response?.data?.message === 'string' ? response.data.message : fallback;
}

function buildMeta(type: ConditionType, count: number, points: number, categorie: string, minCat: number) {
  switch (type) {
    case 'challenges_validated':    return { type, count };
    case 'communautaire_validated': return { type, count };
    case 'spirituel_validated':     return { type, count };
    case 'points_total':            return { type, points };
    case 'categorie_validated':     return { type, categorie, count };
    case 'categorie_spread':        return { type, minCategories: minCat };
  }
}

function buildConditionText(type: ConditionType, count: number, points: number, categorie: string, minCat: number): string {
  switch (type) {
    case 'challenges_validated':    return `Valider ${count} défi${count > 1 ? 's' : ''} Codex`;
    case 'communautaire_validated': return `Valider ${count} défi${count > 1 ? 's' : ''} de catégorie Communautaire`;
    case 'spirituel_validated':     return `Valider ${count} défi${count > 1 ? 's' : ''} de catégorie Spirituelle`;
    case 'points_total':            return `Atteindre ${points} points au total`;
    case 'categorie_validated':     return `Valider ${count} défi${count > 1 ? 's' : ''} de catégorie ${categorie.charAt(0) + categorie.slice(1).toLowerCase()}`;
    case 'categorie_spread':        return `Valider des défis dans ${minCat} catégorie${minCat > 1 ? 's' : ''} différente${minCat > 1 ? 's' : ''}`;
  }
}

function guessTypeFromMeta(meta: unknown): ConditionType {
  if (!meta || typeof meta !== 'object') return 'challenges_validated';
  const m = meta as Record<string, unknown>;
  if (typeof m.type === 'string' && m.type in CONDITION_LABELS) return m.type as ConditionType;
  return 'challenges_validated';
}

export function BadgeFormModal({ badge, onClose, onSaved, canDelete = false }: Props) {
  const isEdit = !!badge;
  const conditionMeta = getBadgeMeta(badge);

  const [nom,         setNom]         = useState(badge?.nom ?? '');
  const [code,        setCode]        = useState(badge?.code ?? '');
  const [description, setDescription] = useState(badge?.description ?? '');
  const [niveau,      setNiveau]      = useState<'BRONZE' | 'ARGENT' | 'OR' | 'LEGENDE'>(badge?.niveau ?? 'BRONZE');
  const [condType,    setCondType]    = useState<ConditionType>(guessTypeFromMeta(conditionMeta));
  const [count,       setCount]       = useState(() => {
    return conditionMeta?.count ?? 1;
  });
  const [points,      setPoints]      = useState(() => {
    return conditionMeta?.points ?? 100;
  });
  const [categorie,   setCategorie]   = useState(() => {
    return conditionMeta?.categorie ?? 'COMMUNAUTAIRE';
  });
  const [minCat,      setMinCat]      = useState(() => {
    return conditionMeta?.minCategories ?? 2;
  });

  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState('');

  // Auto-génère le code depuis le nom si création
  useEffect(() => {
    if (isEdit) return;
    return deferEffect(() => setCode(nom.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').slice(0, 30)));
  }, [nom, isEdit]);

  const conditionText = buildConditionText(condType, count, points, categorie, minCat);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !code.trim()) { setError('Nom et code sont obligatoires.'); return; }
    setSaving(true); setError('');
    try {
      const body = {
        nom: nom.trim(),
        code: code.trim(),
        description: description.trim(),
        condition: conditionText,
        niveau,
        conditionMeta: buildMeta(condType, count, points, categorie, minCat),
      };
      if (isEdit) {
        await badgesApi.update(badge.id, body);
      } else {
        await badgesApi.create(body);
      }
      onSaved();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Une erreur est survenue.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!badge) return;
    if (!confirm(`Supprimer "${badge.nom}" ? Les artefacts déjà obtenus par les gardiens seront également retirés.`)) return;
    setDeleting(true);
    try {
      await badgesApi.remove(badge.id);
      onSaved();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Erreur lors de la suppression.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#1F1B2E] to-[#2d2640] text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-bold">{isEdit ? '✏️ Modifier l\'artefact' : '➕ Nouvel artefact'}</h2>
            {isEdit && <p className="text-xs opacity-60 mt-0.5">{badge.nom}</p>}
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold hover:bg-white/25 transition">✕</button>
        </div>

        <form id="badge-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Nom + Niveau */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-[#1F1B2E] mb-1">Nom *</label>
              <input
                value={nom} onChange={e => setNom(e.target.value)} required
                placeholder="Pierre d'Éveil"
                className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1F1B2E]"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-[#1F1B2E] mb-1">Niveau *</label>
              <select
                value={niveau}
                onChange={e => setNiveau(e.target.value as 'BRONZE' | 'ARGENT' | 'OR' | 'LEGENDE')}
                className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1F1B2E] bg-white"
              >
                {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* Code */}
          <div>
            <label className="block text-xs font-semibold text-[#1F1B2E] mb-1">Code *</label>
            <input
              value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 30))} required
              placeholder="PIERRE_EVEIL"
              className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[#1F1B2E]"
            />
            <p className="text-[10px] text-[#9b9ba8] mt-1">Identifiant unique — lettres majuscules, chiffres, underscores</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#1F1B2E] mb-1">Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              rows={2} placeholder="Premier défi validé — le chemin du Gardien commence."
              className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#1F1B2E]"
            />
          </div>

          {/* Condition */}
          <div className="bg-[#f7f5ff] border border-[#6A1B9A]/20 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-[#6A1B9A] uppercase tracking-wide">Condition de déverrouillage</p>

            <div>
              <label className="block text-xs font-semibold text-[#1F1B2E] mb-1">Type</label>
              <select
                value={condType} onChange={e => setCondType(e.target.value as ConditionType)}
                className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#6A1B9A]"
              >
                {(Object.entries(CONDITION_LABELS) as [ConditionType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Champs dynamiques selon le type */}
            {(condType === 'challenges_validated' || condType === 'communautaire_validated' || condType === 'spirituel_validated') && (
              <div>
                <label className="block text-xs font-semibold text-[#1F1B2E] mb-1">Nombre de défis</label>
                <input type="number" min={1} value={count} onChange={e => setCount(Number(e.target.value))}
                  className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A]" />
              </div>
            )}

            {condType === 'points_total' && (
              <div>
                <label className="block text-xs font-semibold text-[#1F1B2E] mb-1">Points requis</label>
                <input type="number" min={1} value={points} onChange={e => setPoints(Number(e.target.value))}
                  className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A]" />
              </div>
            )}

            {condType === 'categorie_validated' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1F1B2E] mb-1">Catégorie</label>
                  <select value={categorie} onChange={e => setCategorie(e.target.value)}
                    className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#6A1B9A]">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1F1B2E] mb-1">Nombre</label>
                  <input type="number" min={1} value={count} onChange={e => setCount(Number(e.target.value))}
                    className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A]" />
                </div>
              </div>
            )}

            {condType === 'categorie_spread' && (
              <div>
                <label className="block text-xs font-semibold text-[#1F1B2E] mb-1">Nombre de catégories différentes</label>
                <input type="number" min={2} max={4} value={minCat} onChange={e => setMinCat(Number(e.target.value))}
                  className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A]" />
              </div>
            )}

            {/* Aperçu texte condition */}
            <div className="bg-white border border-[#6A1B9A]/15 rounded-lg px-3 py-2">
              <p className="text-[10px] text-[#6A1B9A] font-semibold mb-0.5">Texte affiché aux gardiens</p>
              <p className="text-xs text-[#1F1B2E]">{conditionText}</p>
            </div>
          </div>

          {error && (
            <p className="text-xs text-[#C62828] bg-[#ffeaea] border border-[#C62828]/20 rounded-xl px-3 py-2">{error}</p>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#ececf0] flex items-center gap-3 flex-shrink-0 bg-white">
          {canDelete && isEdit && (
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="text-[#C62828] text-xs font-semibold px-3 py-2 rounded-xl border border-[#C62828]/30 hover:bg-[#ffeaea] transition-colors disabled:opacity-60">
              {deleting ? '…' : '🗑 Supprimer'}
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose}
            className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-[#e0e0e8] text-[#6b6b78] hover:border-[#1F1B2E] transition-colors">
            Annuler
          </button>
          <button type="submit" form="badge-form" disabled={saving}
            className="bg-[#1F1B2E] text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#2d2640] transition-colors disabled:opacity-60">
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer l\'artefact'}
          </button>
        </div>
      </div>
    </div>
  );
}
