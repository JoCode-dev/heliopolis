'use client';
import { useState } from 'react';
import { challengesApi } from '@/lib/api';
import type { Challenge } from '@/types';

const CATEGORIES = [
  { value: 'PERSONNEL',     label: 'Personnel' },
  { value: 'COMMUNAUTAIRE', label: 'Communautaire' },
  { value: 'SPIRITUEL',     label: 'Spirituel' },
  { value: 'LONG',          label: 'Long terme' },
];

const NIVEAUX = [
  { value: 'DECOUVERTE', label: 'Découverte' },
  { value: 'ENGAGEMENT', label: 'Engagement' },
  { value: 'MAITRISE',   label: 'Maîtrise' },
];


interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (challenge: Challenge) => void;
}

export function CreateChallengeModal({ isOpen, onClose, onCreated }: CreateChallengeModalProps) {
  const [titre, setTitre]               = useState('');
  const [description, setDescription]   = useState('');
  const [categorie, setCategorie]       = useState('PERSONNEL');
  const [niveau, setNiveau]             = useState('DECOUVERTE');
  const [points, setPoints]             = useState('');
  const [preuveDemandee, setPreuve]     = useState('');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const reset = () => {
    setTitre(''); setDescription(''); setCategorie('PERSONNEL');
    setNiveau('DECOUVERTE'); setPoints(''); setPreuve('');
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!titre.trim() || !description.trim()) {
      setError('Le titre et la description sont obligatoires.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload: Record<string, string | number | undefined> = {
        titre:          titre.trim(),
        description:    description.trim(),
        categorie,
        niveau,
        preuveDemandee: preuveDemandee.trim() || undefined,
        points:         points ? Number(points) : undefined,
      };
      const { data } = await challengesApi.create(payload);
      onCreated(data as Challenge);
      handleClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? 'Erreur lors de la création.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 pb-16 sm:pb-4 bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[85vh] sm:max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="bg-gradient-to-r from-[#1F1B2E] to-[#3a1d4d] text-white p-5 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="font-bold text-sm">Nouveau quête</div>
            <div className="text-xs opacity-60 mt-0.5">Créer un quête pour les gardiens</div>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors text-sm">✕</button>
        </div>

        {/* Corps */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          {/* Titre */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Titre *</label>
            <input
              value={titre}
              onChange={e => setTitre(e.target.value)}
              placeholder="Ex : Lire un livre de spiritualité"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#C62828]/10"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Description *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Décrivez le quête en détail…"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#C62828]/10 resize-none"
            />
          </div>

          {/* Catégorie + Niveau */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Catégorie *</label>
              <select
                value={categorie}
                onChange={e => setCategorie(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C62828]"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Niveau</label>
              <select
                value={niveau}
                onChange={e => setNiveau(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C62828]"
              >
                {NIVEAUX.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
          </div>

          {/* Points */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Points</label>
            <input
              type="number"
              min="0"
              value={points}
              onChange={e => setPoints(e.target.value)}
              placeholder="0"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C62828]"
            />
          </div>

          {/* Preuve demandée */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Preuve demandée</label>
            <input
              value={preuveDemandee}
              onChange={e => setPreuve(e.target.value)}
              placeholder="Ex : Photo, témoignage écrit, attestation…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C62828]"
            />
          </div>
        </div>

        {/* Pied */}
        <div className="p-5 border-t border-gray-100 flex-shrink-0 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white border border-[#e0e0ea] text-[#6b6b78] hover:bg-[#f5f5fb] hover:border-[#c8c8d8] hover:shadow-sm transition-all duration-150"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !titre.trim() || !description.trim()}
            className="flex-1 bg-[#C62828] text-white py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-[#C62828]/20 enabled:hover:bg-[#b51d1d] enabled:hover:shadow-md enabled:hover:shadow-[#C62828]/30 enabled:hover:-translate-y-px transition-all duration-150 disabled:opacity-60"
          >
            {loading ? 'Création…' : 'Créer le quête'}
          </button>
        </div>
      </div>
    </div>
  );
}
