'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { territoriesApi, usersApi } from '@/lib/api';
import type { District, Parish, User } from '@/types';

// Rôles proposés selon l'acteur — hiérarchie stricte
const ROLE_MATRIX: Record<string, { value: string; label: string; icon: string }[]> = {
  GUIDE:      [{ value: 'GARDIEN',    label: 'Gardien',           icon: '🤝' }],
  SENTINELLE: [
    { value: 'GUIDE',      label: 'Guide',             icon: '📖' },
    { value: 'GARDIEN',    label: 'Gardien',            icon: '🤝' },
  ],
  REGION: [
    { value: 'SENTINELLE', label: 'Sentinelle',         icon: '🛡️' },
    { value: 'GUIDE',      label: 'Guide',              icon: '📖' },
    { value: 'GARDIEN',    label: 'Gardien',            icon: '🤝' },
  ],
  ADMIN: [
    { value: 'SENTINELLE', label: 'Sentinelle',         icon: '🛡️' },
    { value: 'GUIDE',      label: 'Guide',              icon: '📖' },
    { value: 'GARDIEN',    label: 'Gardien',            icon: '🤝' },
    { value: 'REGION',     label: 'Conseil régional',   icon: '🗺️' },
  ],
};

const ROLE_COLOR: Record<string, string> = {
  GARDIEN:    'from-[#C62828] to-[#8e1a1a]',
  GUIDE:      'from-[#6A1B9A] to-[#4a1370]',
  SENTINELLE: 'from-[#D9A441] to-[#9c7218]',
  REGION:     'from-[#1F1B2E] to-[#3a1d4d]',
};

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (user: User) => void;
  onUpdated?: (user: User) => void;
  /** Pré-remplit le formulaire en mode édition */
  editUser?: User;
  /** Verrouille le rôle initial (affiché mais pas modifiable si un seul choix) */
  defaultRole?: string;
  /** Restreint explicitement les rôles (ignoré si la matrice en contient moins) */
  allowedRoles?: string[];
}

export function CreateUserModal({ isOpen, onClose, onCreated, onUpdated, editUser, defaultRole, allowedRoles }: CreateUserModalProps) {
  const isEditMode = !!editUser;
  const { user: actor } = useAuthStore();
  const actorRole = actor?.role ?? 'GUIDE';

  // Rôles disponibles pour cet acteur
  const availableRoles = (ROLE_MATRIX[actorRole] ?? ROLE_MATRIX['GUIDE'])
    .filter(r => !allowedRoles || allowedRoles.includes(r.value));

  const [nom, setNom]             = useState('');
  const [prenoms, setPrenoms]     = useState('');
  const [matricule, setMatricule] = useState('');
  const [email, setEmail]         = useState('');
  const [telephone, setTelephone] = useState('');
  const [role, setRole]           = useState(defaultRole ?? availableRoles[0]?.value ?? 'GARDIEN');

  const [districts, setDistricts] = useState<District[]>([]);
  const [parishes, setParishes]   = useState<Parish[]>([]);
  const [districtId, setDistrictId] = useState('');
  const [parishId, setParishId]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const isAdminOrRegion = ['ADMIN', 'REGION'].includes(actorRole);
  const isSentinelle    = actorRole === 'SENTINELLE';
  const isGuide         = actorRole === 'GUIDE';

  // Un seul choix possible → rôle verrouillé (pas de sélecteur)
  const showRoleSelector = availableRoles.length > 1;

  // District : admin/région choisissent librement ; sentinelle auto-rempli
  const showDistrictSelector = isAdminOrRegion && ['SENTINELLE', 'GUIDE', 'GARDIEN'].includes(role);

  // Paroisse : nécessaire pour GUIDE et GARDIEN
  const needsParish  = ['GUIDE', 'GARDIEN'].includes(role);
  const showParish   = needsParish && (isAdminOrRegion || isSentinelle);

  // Guide → district et paroisse injectés automatiquement depuis son profil
  const autoDistrictId = isSentinelle ? (actor?.district?.id ?? '') : '';
  const autoParishId   = isGuide     ? (actor?.parish?.id ?? '')    : '';

  useEffect(() => {
    if (!isOpen) return;
    if (editUser) {
      setNom(editUser.nom ?? '');
      setPrenoms(editUser.prenoms ?? '');
      setMatricule(editUser.matricule ?? '');
      setEmail(editUser.email ?? '');
      setTelephone(editUser.telephone ?? '');
      setRole(editUser.role ?? defaultRole ?? availableRoles[0]?.value ?? 'GARDIEN');
    } else {
      setNom(''); setPrenoms(''); setMatricule('');
      setEmail(''); setTelephone('');
      setRole(defaultRole ?? availableRoles[0]?.value ?? 'GARDIEN');
      setDistrictId(''); setParishId('');
    }
    setError('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editUser]);

  // Charge les districts pour admin/région
  useEffect(() => {
    if (!isOpen || !isAdminOrRegion) return;
    territoriesApi.districts().then(({ data }) => setDistricts(data)).catch(() => {});
  }, [isOpen, isAdminOrRegion]);

  // Charge les paroisses selon le district effectif
  useEffect(() => {
    const id = districtId || autoDistrictId;
    if (!id || !needsParish) { setParishes([]); return; }
    territoriesApi.parishes(id).then(({ data }) => setParishes(data)).catch(() => {});
  }, [districtId, autoDistrictId, needsParish]);

  const handleRoleChange = (r: string) => {
    setRole(r);
    setDistrictId('');
    setParishId('');
  };

  const handleSubmit = async () => {
    if (!nom.trim() || !prenoms.trim()) {
      setError('Le nom et les prénoms sont obligatoires.');
      return;
    }
    if (isEditMode && !matricule.trim()) {
      setError('Le matricule est obligatoire pour modifier un utilisateur.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isEditMode && editUser) {
        const payload: Record<string, string | undefined> = {
          matricule: matricule.trim(),
          nom:       nom.trim(),
          prenoms:   prenoms.trim(),
          email:     email.trim()     || undefined,
          telephone: telephone.trim() || undefined,
        };
        const { data } = await usersApi.update(editUser.id, payload);
        onUpdated?.(data as User);
      } else {
        const effectiveDistrict = districtId || autoDistrictId || undefined;
        const effectiveParish   = parishId   || autoParishId   || undefined;
        const payload: Record<string, string | undefined> = {
          nom:        nom.trim(),
          prenoms:    prenoms.trim(),
          role,
          matricule:  matricule.trim() || undefined,
          email:      email.trim()     || undefined,
          telephone:  telephone.trim() || undefined,
          districtId: effectiveDistrict,
          parishId:   effectiveParish,
        };
        const { data } = await usersApi.create(payload);
        onCreated(data as User);
      }
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' ') : (msg ?? (isEditMode ? 'Erreur lors de la mise à jour.' : 'Erreur lors de la création.')));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedOption = availableRoles.find(r => r.value === role) ?? availableRoles[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* En-tête coloré selon le rôle */}
        <div className={`bg-gradient-to-r ${ROLE_COLOR[role] ?? 'from-[#1F1B2E] to-[#3a1d4d]'} text-white p-5 flex items-center justify-between flex-shrink-0`}>
          <div>
            <div className="font-bold text-base">
              {isEditMode ? `Modifier — ${editUser?.prenoms} ${editUser?.nom}` : 'Nouveau membre'}
            </div>
            <div className="text-xs opacity-80 mt-0.5">
              {selectedOption?.icon} {selectedOption?.label ?? role}
              {isSentinelle && actor?.district?.nom ? ` · ${actor.district.nom}` : ''}
              {isGuide && actor?.parish?.nom ? ` · ${actor.parish.nom}` : ''}
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition text-sm">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {error && (
            <div className="p-3 bg-[#fff0f0] border border-[#f5c6c6] rounded-xl text-[#C62828] text-sm">{error}</div>
          )}

          {/* ── Sélecteur de rôle ── */}
          {showRoleSelector && (
            <div>
              <label className="block text-xs font-semibold text-[#6b6b78] uppercase tracking-wide mb-2">
                Rôle du nouveau membre
              </label>
              <div className={`grid gap-2 ${availableRoles.length === 2 ? 'grid-cols-2' : availableRoles.length >= 3 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {availableRoles.map(o => (
                  <button key={o.value} onClick={() => handleRoleChange(o.value)}
                    className={`flex items-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                      role === o.value
                        ? `bg-gradient-to-r ${ROLE_COLOR[o.value] ?? ''} text-white border-transparent shadow-sm`
                        : 'bg-white text-[#6b6b78] border-[#e0e0e8] hover:border-[#1F1B2E] hover:text-[#1F1B2E]'
                    }`}>
                    <span className="text-base leading-none">{o.icon}</span>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── District (admin/région) ── */}
          {showDistrictSelector && (
            <div>
              <label className="block text-xs font-semibold text-[#6b6b78] uppercase tracking-wide mb-1.5">
                District {role === 'SENTINELLE' ? '(territoire de la Sentinelle)' : ''}
              </label>
              <select value={districtId} onChange={e => { setDistrictId(e.target.value); setParishId(''); }}
                className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] focus:ring-2 focus:ring-[#6A1B9A]/10">
                <option value="">— Sélectionner un district —</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
              </select>
            </div>
          )}

          {/* ── District auto-rempli (sentinelle) ── */}
          {isSentinelle && needsParish && actor?.district?.nom && (
            <div className="flex items-center gap-2 bg-[#f0e8ff] rounded-xl px-3 py-2 border border-[#c8a8f0]">
              <span className="text-base">🛡️</span>
              <div>
                <p className="text-xs font-semibold text-[#6A1B9A]">District</p>
                <p className="text-sm text-[#1F1B2E]">{actor.district.nom}</p>
              </div>
            </div>
          )}

          {/* ── Guide : paroisse auto-remplie ── */}
          {isGuide && actor?.parish?.nom && (
            <div className="flex items-center gap-2 bg-[#fff0f0] rounded-xl px-3 py-2 border border-[#ef9a9a]">
              <span className="text-base">⛪</span>
              <div>
                <p className="text-xs font-semibold text-[#C62828]">Paroisse</p>
                <p className="text-sm text-[#1F1B2E]">{actor.parish.nom}</p>
              </div>
            </div>
          )}

          {/* ── Paroisse (admin/région ou sentinelle) ── */}
          {showParish && (
            <div>
              <label className="block text-xs font-semibold text-[#6b6b78] uppercase tracking-wide mb-1.5">Paroisse</label>
              <select value={parishId} onChange={e => setParishId(e.target.value)}
                disabled={parishes.length === 0}
                className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] focus:ring-2 focus:ring-[#6A1B9A]/10 disabled:opacity-60">
                <option value="">— Sélectionner une paroisse —</option>
                {parishes.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
              {parishes.length === 0 && (isSentinelle ? autoDistrictId : districtId) && (
                <p className="text-[11px] text-[#9b9ba8] mt-1">Chargement des paroisses…</p>
              )}
              {parishes.length === 0 && isAdminOrRegion && !districtId && (
                <p className="text-[11px] text-[#9b9ba8] mt-1">Sélectionnez d'abord un district.</p>
              )}
            </div>
          )}

          {/* ── Informations personnelles ── */}
          <div>
            <label className="block text-xs font-semibold text-[#6b6b78] uppercase tracking-wide mb-2">
              Informations personnelles
            </label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-[#9b9ba8] mb-1">Prénoms *</label>
                <input value={prenoms} onChange={e => setPrenoms(e.target.value)}
                  placeholder="Kouamé"
                  className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] transition" />
              </div>
              <div>
                <label className="block text-xs text-[#9b9ba8] mb-1">Nom *</label>
                <input value={nom} onChange={e => setNom(e.target.value)}
                  placeholder="KOFFI"
                  className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] transition" />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs text-[#9b9ba8] mb-1">
                Matricule {isEditMode ? <span className="text-[#C62828]">*</span> : <span className="opacity-60">(optionnel)</span>}
              </label>
              <input value={matricule} onChange={e => setMatricule(e.target.value)}
                placeholder="0525247O"
                className={`w-full border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none transition ${
                  isEditMode && !matricule.trim()
                    ? 'border-[#f5c6c6] bg-[#fff8f8] focus:border-[#C62828]'
                    : 'border-[#e0e0e8] focus:border-[#6A1B9A]'
                }`} />
              {isEditMode && !matricule.trim() && (
                <p className="text-[11px] text-[#C62828] mt-1">Le matricule est requis pour enregistrer les modifications.</p>
              )}
            </div>
            <div className="mb-3">
              <label className="block text-xs text-[#9b9ba8] mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="membre@email.com"
                className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] transition" />
            </div>
            <div>
              <label className="block text-xs text-[#9b9ba8] mb-1">Téléphone</label>
              <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)}
                placeholder="+225 07 00 00 00 00"
                className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] transition" />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-[#f0f0f0] flex-shrink-0 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#f7f7fa] text-[#6b6b78] hover:bg-[#ebebf0] transition">
            Annuler
          </button>
          <button onClick={handleSubmit}
            disabled={loading || !nom.trim() || !prenoms.trim() || (isEditMode && !matricule.trim())}
            className={`flex-1 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition bg-gradient-to-r ${ROLE_COLOR[role] ?? 'from-[#C62828] to-[#8e1a1a]'}`}>
            {loading
              ? (isEditMode ? 'Enregistrement…' : 'Création…')
              : (isEditMode ? 'Enregistrer les modifications' : `Créer ${selectedOption?.label ?? ''}`)
            }
          </button>
        </div>
      </div>
    </div>
  );
}
