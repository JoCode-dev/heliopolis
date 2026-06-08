'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { councilsPublicApi, territoriesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { CouncilPublic, CouncilParticipant, CouncilStatus, District, Parish, UserRole } from '@/types';

const STATUS_STYLE: Record<CouncilStatus, { label: string; bg: string; text: string }> = {
  PLANIFIE: { label: '📅 Planifié', bg: 'bg-[#EDE7F6]', text: 'text-[#6A1B9A]' },
  EN_COURS: { label: '🔴 En cours', bg: 'bg-[#fff8e1]', text: 'text-[#D9A441]' },
  TERMINE:  { label: '✓ Terminé', bg: 'bg-[#e8f5e9]', text: 'text-[#2E7D32]' },
  ANNULE:   { label: '✕ Annulé', bg: 'bg-[#f5f5f5]', text: 'text-[#9b9ba8]' },
};

const FONCTION_OPTIONS = [
  'Gardien',
  'Guide',
  'Guide responsable',
  'Guide adjoint',
  'Coordinateur de communauté',
  'Sentinelle',
  'Région',
];

const ROLE_FONCTION: Record<UserRole, string> = {
  GARDIEN: 'Gardien',
  GUIDE: 'Guide',
  SENTINELLE: 'Sentinelle',
  REGION: 'Région',
  ADMIN: 'Admin',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          className={`text-2xl transition-transform hover:scale-110 ${n <= value ? 'text-[#D9A441]' : 'text-[#e0e0e8]'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ConseilInscriptionPage() {
  const { token } = useParams<{ token: string }>();
  const { user, accessToken } = useAuthStore();

  const [council, setCouncil]       = useState<CouncilPublic | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [submitted, setSubmitted]   = useState(false);
  const [participant, setParticipant] = useState<CouncilParticipant | null>(null);

  const [nom, setNom]               = useState('');
  const [prenoms, setPrenoms]       = useState('');
  const [contact, setContact]       = useState('');
  const [districtId, setDistrictId] = useState('');
  const [parishId, setParishId]     = useState('');
  const [fonction, setFonction]       = useState('');
  const [note, setNote]             = useState(0);
  const [avis, setAvis]             = useState('');
  const [saving, setSaving]         = useState(false);

  const [districts, setDistricts]   = useState<District[]>([]);
  const [parishes, setParishes]     = useState<Parish[]>([]);

  const isLoggedIn = !!user;
  const locked = isLoggedIn;

  const prefillFromUser = useCallback(() => {
    if (!user) return;
    setNom(user.nom);
    setPrenoms(user.prenoms);
    setContact(user.telephone ?? user.email ?? '');
    setDistrictId(user.district?.id ?? '');
    setParishId(user.parish?.id ?? '');
    setFonction(ROLE_FONCTION[user.role] ?? '');
  }, [user]);

  useEffect(() => {
    if (!token) return;
    councilsPublicApi.getByToken(token)
      .then((data) => setCouncil(data as CouncilPublic))
      .catch((e: { message?: string }) => setError(e.message ?? 'Conseil introuvable'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    territoriesApi.districts()
      .then(r => setDistricts(r.data as District[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!districtId) { setParishes([]); return; }
    territoriesApi.parishes(districtId)
      .then(r => setParishes(r.data as Parish[]))
      .catch(() => {});
  }, [districtId]);

  useEffect(() => {
    prefillFromUser();
  }, [prefillFromUser]);

  const handleSubmit = async () => {
    if (!nom.trim() || !prenoms.trim()) {
      setError('Nom et prénoms sont obligatoires.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        nom: nom.trim(),
        prenoms: prenoms.trim(),
        contact: contact.trim() || undefined,
        districtId: districtId || undefined,
        parishId: parishId || undefined,
        fonction: fonction || undefined,
        note: note > 0 ? note : undefined,
        avis: avis.trim() || undefined,
      };
      const result = await councilsPublicApi.register(
        token,
        payload,
        accessToken,
      ) as CouncilParticipant;
      setParticipant(result);
      setSubmitted(true);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message;
      setError(msg ?? 'Erreur lors de l\'inscription.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFeedback = async () => {
    setSaving(true);
    setError('');
    try {
      const result = await councilsPublicApi.updateFeedback(
        token,
        {
          contact: contact.trim() || undefined,
          note: note > 0 ? note : undefined,
          avis: avis.trim() || undefined,
        },
        accessToken,
      ) as CouncilParticipant;
      setParticipant(result);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message;
      setError(msg ?? 'Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f6f6fa]">
        <div className="text-center text-[#9b9ba8]">
          <div className="text-4xl animate-pulse mb-3">🏛️</div>
          <p className="text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  if (error && !council) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f6f6fa] px-6">
        <div className="text-center">
          <div className="text-4xl mb-3">😕</div>
          <p className="font-semibold text-[#1F1B2E]">{error}</p>
        </div>
      </div>
    );
  }

  if (!council) return null;

  const st = STATUS_STYLE[council.statut];
  const territory = council.parish?.nom ?? council.district?.nom ?? council.region?.nom;

  return (
    <div className="flex-1 overflow-y-auto bg-[#f6f6fa]">
      <div className="max-w-md mx-auto px-4 py-6">

        {/* En-tête conseil */}
        <div className="bg-white rounded-2xl border border-[#ececf0] p-5 mb-4 shadow-sm">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h1 className="font-black text-[#1F1B2E] text-lg leading-tight">{council.nom}</h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${st.bg} ${st.text}`}>
              {st.label}
            </span>
          </div>
          <div className="flex flex-col gap-1 text-[12px] text-[#6b6b78]">
            <span>📅 {fmtDate(council.date)}</span>
            {council.lieu && <span>📍 {council.lieu}</span>}
            {territory && <span>🗺️ {territory}</span>}
          </div>
          {council.description && (
            <p className="mt-3 text-[12px] text-[#9b9ba8] italic leading-relaxed">{council.description}</p>
          )}
        </div>

        {isLoggedIn && (
          <div className="bg-[#EDE7F6] border border-[#ce93d8] rounded-xl px-4 py-3 mb-4 text-[12px] text-[#4a1370]">
            Connecté en tant que <strong>{user!.prenoms} {user!.nom}</strong>
          </div>
        )}

        {/* Hors jour J */}
        {!council.registrationOpen && (
          <div className="bg-white rounded-2xl border border-[#ececf0] p-5 text-center shadow-sm">
            <div className="text-3xl mb-3">📅</div>
            <p className="font-semibold text-[#1F1B2E] text-sm">Inscriptions pas encore ouvertes</p>
            <p className="text-[12px] text-[#9b9ba8] mt-2 leading-relaxed">
              Les inscriptions seront disponibles le jour du conseil, soit le{' '}
              <strong>{fmtDate(council.date)}</strong>.
            </p>
          </div>
        )}

        {/* Formulaire jour J */}
        {council.registrationOpen && !submitted && (
          <div className="bg-white rounded-2xl border border-[#ececf0] p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-[#1F1B2E] text-sm">Formulaire d&apos;inscription</h2>

            {error && (
              <div className="p-3 bg-[#fff0f0] border border-[#f5c6c6] rounded-xl text-[#C62828] text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Nom *</label>
                <input
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  readOnly={locked}
                  className={`w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] ${locked ? 'bg-[#f6f6fa] text-[#6b6b78]' : ''}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Prénoms *</label>
                <input
                  value={prenoms}
                  onChange={e => setPrenoms(e.target.value)}
                  readOnly={locked}
                  className={`w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] ${locked ? 'bg-[#f6f6fa] text-[#6b6b78]' : ''}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Contact</label>
              <input
                value={contact}
                onChange={e => setContact(e.target.value)}
                readOnly={locked && !!(user?.telephone ?? user?.email)}
                placeholder="Téléphone ou email"
                className={`w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] ${locked && !!(user?.telephone ?? user?.email) ? 'bg-[#f6f6fa] text-[#6b6b78]' : ''}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">District</label>
                <select
                  value={districtId}
                  onChange={e => { setDistrictId(e.target.value); setParishId(''); }}
                  disabled={locked && !!user?.district}
                  className={`w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] ${locked && user?.district ? 'bg-[#f6f6fa] text-[#6b6b78]' : ''}`}
                >
                  <option value="">— Choisir —</option>
                  {districts.map(d => (
                    <option key={d.id} value={d.id}>{d.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Paroisse</label>
                <select
                  value={parishId}
                  onChange={e => setParishId(e.target.value)}
                  disabled={(locked && !!user?.parish) || !districtId}
                  className={`w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] ${locked && user?.parish ? 'bg-[#f6f6fa] text-[#6b6b78]' : ''}`}
                >
                  <option value="">— Choisir —</option>
                  {parishes.map(p => (
                    <option key={p.id} value={p.id}>{p.nom}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Fonction</label>
              <select
                value={fonction}
                onChange={e => setFonction(e.target.value)}
                disabled={locked}
                className={`w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] ${locked ? 'bg-[#f6f6fa] text-[#6b6b78]' : ''}`}
              >
                <option value="">— Choisir —</option>
                {FONCTION_OPTIONS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">
                Note du conseil <span className="font-normal text-[#9b9ba8]">(optionnel)</span>
              </label>
              <StarRating value={note} onChange={setNote} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">
                Avis <span className="font-normal text-[#9b9ba8]">(optionnel)</span>
              </label>
              <textarea
                value={avis}
                onChange={e => setAvis(e.target.value)}
                rows={3}
                placeholder="Votre retour sur le conseil…"
                className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving || !nom.trim() || !prenoms.trim()}
              className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-[#1F1B2E] to-[#3a1d4d] text-white disabled:opacity-40 transition"
            >
              {saving ? 'Inscription…' : 'Confirmer mon inscription'}
            </button>
          </div>
        )}

        {/* Succès + modification avis */}
        {council.registrationOpen && submitted && (
          <div className="bg-white rounded-2xl border border-[#ececf0] p-5 shadow-sm space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-2">✅</div>
              <p className="font-bold text-[#2E7D32] text-sm">Inscription confirmée !</p>
              <p className="text-[12px] text-[#9b9ba8] mt-1">
                Merci {participant?.prenoms ?? prenoms}, votre présence est enregistrée.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-[#fff0f0] border border-[#f5c6c6] rounded-xl text-[#C62828] text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Modifier votre note</label>
              <StarRating value={note} onChange={setNote} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">Modifier votre avis</label>
              <textarea
                value={avis}
                onChange={e => setAvis(e.target.value)}
                rows={3}
                className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] resize-none"
              />
            </div>

            <button
              onClick={handleUpdateFeedback}
              disabled={saving}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#EDE7F6] text-[#6A1B9A] hover:bg-[#6A1B9A] hover:text-white transition disabled:opacity-40"
            >
              {saving ? 'Enregistrement…' : 'Mettre à jour mon avis'}
            </button>
          </div>
        )}

        <div className="h-6" />
      </div>
    </div>
  );
}
