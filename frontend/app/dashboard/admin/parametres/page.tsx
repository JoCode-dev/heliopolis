'use client';
import { useEffect, useState } from 'react';
import { usePastoralYear } from '@/store/pastoralYear';
import { useAuthStore } from '@/store/auth';

export default function AdminParametresPage() {
  const { annee, load, update } = usePastoralYear();
  const { user } = useAuthStore();
  const isRegion = user?.role === 'REGION';

  const [input, setInput]   = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]   = useState('');
  const [confirm, setConfirm] = useState(false);
  const [membresCount, setMembresCount] = useState<number | null>(null);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setInput(String(annee)); }, [annee]);

  const newVal = parseInt(input, 10);
  const isDecreasing = !isNaN(newVal) && newVal < annee;
  const isChanging = !isNaN(newVal) && newVal !== annee && !(isRegion && isDecreasing);

  const handleSave = async () => {
    if (isNaN(newVal) || newVal < 2000 || newVal > 2100) {
      setError('Année invalide. Entrez une année entre 2000 et 2100.');
      return;
    }
    if (!confirm) { setConfirm(true); return; }
    setSaving(true);
    setError('');
    setSuccess('');
    setMembresCount(null);
    try {
      const result = await update(newVal);
      setMembresCount(result.membresInitialises);
      setSuccess(`Année pastorale activée : ${newVal}`);
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

            {/* Avertissement */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed space-y-1">
              <p className="font-bold">⚠️ Impact du changement d&apos;année</p>
              <p>
                Passer à une nouvelle année remet <strong>tous les membres</strong> (Gardiens, Guides, Sentinelles)
                à <strong>Non à jour</strong> pour cette année.
                Les mises à jour des droits d&apos;adhésion devront ensuite être faites manuellement.
              </p>
              {isRegion && (
                <p className="mt-1 font-semibold text-amber-900">
                  En tant que Régional, vous pouvez uniquement augmenter l&apos;année.
                </p>
              )}
            </div>

            {/* Champ de saisie */}
            {!confirm ? (
              <div className="space-y-2">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-[#555566] mb-1.5 block">
                      Nouvelle année
                    </label>
                    <input
                      type="number"
                      min={isRegion ? annee + 1 : 2000}
                      max={2100}
                      value={input}
                      onChange={e => { setInput(e.target.value); setError(''); setSuccess(''); setMembresCount(null); }}
                      className={`w-full border rounded-xl px-3 py-2.5 text-sm font-bold text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#C62828]/30 focus:border-[#C62828] ${isRegion && isDecreasing ? 'border-[#C62828] bg-red-50' : 'border-[#ddd]'}`}
                    />
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving || !isChanging}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-[#C62828] to-[#8e1a1a] text-white text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
                  >
                    Modifier
                  </button>
                </div>
                {isRegion && isDecreasing && (
                  <p className="text-xs font-semibold text-[#C62828]">
                    Vous ne pouvez pas réduire l&apos;année pastorale. Contactez un administrateur.
                  </p>
                )}
              </div>
            ) : (
              <div className="border border-[#C62828]/30 bg-[#fff5f5] rounded-xl px-4 py-4 space-y-3">
                <p className="text-sm font-bold text-[#C62828]">
                  Passer à l&apos;année {input} ?
                </p>
                <p className="text-xs text-[#555566] leading-relaxed">
                  Tous les Gardiens, Guides et Sentinelles seront remis à <strong>Non à jour</strong> pour {input}.
                  Cette action ne peut pas être annulée.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-br from-[#C62828] to-[#8e1a1a] text-white text-sm font-bold disabled:opacity-40"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                        Traitement…
                      </span>
                    ) : 'Confirmer'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl bg-[#f0f0f4] text-[#555566] text-sm font-semibold disabled:opacity-40"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Feedback succès */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 space-y-1">
                <p className="text-xs font-bold text-green-700">✅ {success}</p>
                {membresCount !== null && membresCount > 0 && (
                  <p className="text-xs text-green-600">
                    {membresCount} membre{membresCount > 1 ? 's' : ''} remis à <strong>Non à jour</strong> pour {annee}.
                  </p>
                )}
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
