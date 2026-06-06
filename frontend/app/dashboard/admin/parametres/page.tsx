'use client';
import { useEffect, useState } from 'react';
import { usePastoralYear } from '@/store/pastoralYear';

export default function AdminParametresPage() {
  const { annee, load, update } = usePastoralYear();
  const [input, setInput]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');
  const [confirm, setConfirm]   = useState(false);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setInput(String(annee)); }, [annee]);

  const handleSave = async () => {
    const val = parseInt(input, 10);
    if (isNaN(val) || val < 2000 || val > 2100) {
      setError('Année invalide. Entrez une année entre 2000 et 2100.');
      return;
    }
    if (!confirm) { setConfirm(true); return; }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await update(val);
      setSuccess(`Année pastorale mise à jour : ${val}`);
      setConfirm(false);
    } catch {
      setError('Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => { setConfirm(false); setInput(String(annee)); };

  return (
    <div className="flex flex-col h-full bg-[#f7f7fa]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#C62828] to-[#8e1a1a] text-white px-4 pt-4 pb-4 flex-shrink-0">
        <h1 className="text-lg font-bold leading-tight">Paramètres</h1>
        <p className="text-white/70 text-xs mt-0.5">Configuration du système</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Card année pastorale */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#ececf0] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f0f0f4]">
            <h2 className="text-sm font-bold text-[#1a1a2e]">📅 Année pastorale</h2>
          </div>

          <div className="px-4 py-4 space-y-4">
            {/* Valeur actuelle */}
            <div className="flex items-center justify-between bg-[#f7f7fa] rounded-xl px-4 py-3">
              <span className="text-xs text-[#9b9ba8] font-medium">Année active</span>
              <span className="text-lg font-bold text-[#C62828]">{annee}</span>
            </div>

            {/* Explication */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
              <p className="font-semibold mb-1">Impact du changement</p>
              <p>
                L&apos;année pastorale détermine quelle adhésion est considérée comme valide pour les gardiens.
                Changer cette valeur affecte immédiatement les droits d&apos;adhésion affichés sur tout le tableau de bord,
                les sélections de camp, et les statuts des participants.
              </p>
            </div>

            {/* Champ de saisie */}
            {!confirm ? (
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-[#555566] mb-1.5 block">
                    Nouvelle année
                  </label>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={input}
                    onChange={e => { setInput(e.target.value); setError(''); setSuccess(''); }}
                    className="w-full border border-[#ddd] rounded-xl px-3 py-2.5 text-sm font-bold text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#C62828]/30 focus:border-[#C62828]"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving || input === String(annee)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-[#C62828] to-[#8e1a1a] text-white text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  Modifier
                </button>
              </div>
            ) : (
              <div className="border border-[#C62828]/30 bg-[#fff5f5] rounded-xl px-4 py-4 space-y-3">
                <p className="text-sm font-semibold text-[#C62828]">
                  Confirmer le passage à l&apos;année <strong>{input}</strong> ?
                </p>
                <p className="text-xs text-[#9b9ba8]">
                  Cette action est immédiate et visible par tous les utilisateurs.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-br from-[#C62828] to-[#8e1a1a] text-white text-sm font-bold disabled:opacity-40"
                  >
                    {saving ? 'Enregistrement…' : 'Confirmer'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-2 rounded-xl bg-[#f0f0f4] text-[#555566] text-sm font-semibold"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Feedback */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-green-700">
                ✅ {success}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-red-700">
                ⚠️ {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
