'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { campsApi } from '@/lib/api';
import { Input, Toggle, Button } from '@/components/ui';

const TYPES: { value: string; label: string; icon: string; desc: string }[] = [
  { value: 'REGIONAL', label: 'Régional',  icon: '🗺️', desc: 'Camp organisé au niveau de la région' },
  { value: 'NATIONAL', label: 'National',  icon: '🌍', desc: 'Camp organisé à l\'échelle nationale' },
];

interface CreateCampForm {
  nom: string;
  theme: string;
  type: string;
  description: string;
  dateDebut: string;
  dateFin: string;
  lieu: string;
  selectionOuverte: boolean;
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message;
  }
  return 'Erreur lors de la création';
}

export default function NouveauCampPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CreateCampForm>({
    nom: '', theme: '', type: 'REGIONAL', description: '',
    dateDebut: '', dateFin: '', lieu: '', selectionOuverte: true,
  });
  const selectedType = TYPES.find(t => t.value === form.type);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof CreateCampForm>(k: K, v: CreateCampForm[K]) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    setSaving(true); setError('');
    try {
      await campsApi.create(form);
      router.push('/dashboard/admin');
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-gradient-to-br from-[#C62828] to-[#8e1a1a] text-white px-4 pt-4 pb-4 flex-shrink-0">
        <button onClick={() => router.back()} className="text-sm opacity-80 mb-2">‹ Retour</button>
        <h1 className="text-xl font-bold">Nouveau camp</h1>
        <p className="text-xs opacity-85 mt-0.5">Étape {step} / 2</p>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8">
        <div className="lg:max-w-2xl lg:mx-auto">
        <div className="flex gap-1.5 mb-5">
          {[1, 2].map(n => (
            <div key={n} className={`flex-1 h-1.5 rounded-full ${n <= step ? 'bg-[#C62828]' : 'bg-[#e6e6ea]'}`} />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
        )}

        {step === 1 ? (
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Nom du camp *</label>
              <Input placeholder="Camp Régional d'Abay-Ka 2026" value={form.nom} onChange={e => set('nom', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Thème</label>
              <Input placeholder="Les Cinq Règnes" value={form.theme} onChange={e => set('theme', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => set('type', t.value)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-center ${
                      form.type === t.value
                        ? 'border-[#6A1B9A] bg-[#EDE7F6] text-[#4a1370]'
                        : 'border-[#ececf0] bg-white text-[#6b6b78] hover:border-[#c8c8d4]'
                    }`}>
                    <span className="text-2xl">{t.icon}</span>
                    <span className="text-xs font-bold">{t.label}</span>
                    <span className="text-[10px] leading-tight opacity-70">{t.desc}</span>
                  </button>
                ))}
              </div>
              {selectedType && (
                <p className="text-[11px] text-[#6A1B9A] mt-1.5 font-medium">
                  {selectedType.icon} Camp {selectedType.label.toLowerCase()} sélectionné
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Description</label>
              <textarea
                className="w-full px-3.5 py-3 border border-[#e6e6ea] rounded-xl text-sm focus:outline-none focus:border-[#6A1B9A] resize-none"
                rows={3} placeholder="Description du camp…"
                value={form.description} onChange={e => set('description', e.target.value)}
              />
            </div>
            <Button variant="rouge" onClick={() => setStep(2)} disabled={!form.nom || !form.type}>
              Suivant →
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Date début *</label>
                <Input type="date" value={form.dateDebut} onChange={e => set('dateDebut', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Date fin *</label>
                <Input type="date" value={form.dateFin} onChange={e => set('dateFin', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Lieu *</label>
              <Input placeholder="Bingerville" value={form.lieu} onChange={e => set('lieu', e.target.value)} />
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-[#ececf0] flex justify-between items-center">
              <div>
                <div className="font-semibold text-sm text-[#1F1B2E]">Ouvrir la sélection</div>
                <div className="text-xs text-[#6b6b78]">Les Guides pourront sélectionner</div>
              </div>
              <Toggle on={form.selectionOuverte} onToggle={() => set('selectionOuverte', !form.selectionOuverte)} />
            </div>

            <div className="flex gap-2 mt-2">
              <Button variant="ghost" onClick={() => setStep(1)} full={false} className="flex-1">‹ Retour</Button>
              <Button variant="rouge" onClick={handleCreate} disabled={saving || !form.dateDebut || !form.dateFin || !form.lieu} full={false} className="flex-1">
                {saving ? '…' : 'Créer le camp ✓'}
              </Button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
