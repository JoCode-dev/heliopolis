'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { territoriesApi, usersApi } from '@/lib/api';
import { deferEffect } from '@/lib/effects';
import type { District, Parish, RegionRole, User } from '@/types';

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

const REGION_ROLE_OPTIONS: { value: RegionRole; label: string; description: string }[] = [
  { value: 'RESPONSABLE',        label: 'Premier responsable', description: 'Accès complet — tableau de bord quasi-admin' },
  { value: 'ADJOINT',            label: 'Adjoint régional',    description: 'Accès étendu — quelques fonctions en moins' },
  { value: 'CHARGE_COMMUNICATION', label: 'Chargé communication', description: 'Photos de camps et annonces' },
];

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
  const [regionRole, setRegionRole] = useState<RegionRole>('RESPONSABLE');

  const [districts, setDistricts] = useState<District[]>([]);
  const [parishes, setParishes]   = useState<Parish[]>([]);
  const [districtId, setDistrictId] = useState('');
  const [parishId, setParishId]     = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPwd, setConfirmPwd]       = useState('');
  const [showPwd, setShowPwd]             = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [pendingSuccess, setPendingSuccess] = useState(false);

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

  useEffect(() => deferEffect(() => {
    if (!isOpen) return;
    if (editUser) {
      setNom(editUser.nom ?? '');
      setPrenoms(editUser.prenoms ?? '');
      setMatricule(editUser.matricule ?? '');
      setEmail(editUser.email ?? '');
      setTelephone(editUser.telephone ?? '');
      setRole(editUser.role ?? defaultRole ?? availableRoles[0]?.value ?? 'GARDIEN');
      setRegionRole(editUser.regionRole ?? 'RESPONSABLE');
      setDistrictId(editUser.district?.id ?? '');
      setParishId(editUser.parish?.id ?? '');
      // Formater la date en YYYY-MM-DD pour l'input type="date"
      setDateNaissance(
        editUser.dateNaissance
          ? new Date(editUser.dateNaissance).toISOString().split('T')[0]
          : ''
      );
    } else {
      setNom(''); setPrenoms(''); setMatricule('');
      setEmail(''); setTelephone(''); setDateNaissance('');
      setPassword(''); setConfirmPwd('');
      setRole(defaultRole ?? availableRoles[0]?.value ?? 'GARDIEN');
      setRegionRole('RESPONSABLE');
      setDistrictId(''); setParishId('');
    }
    setError('');
    setPendingSuccess(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isOpen, editUser]);

  // Charge les districts pour admin/région
  useEffect(() => {
    if (!isOpen || !isAdminOrRegion) return;
    territoriesApi.districts().then(({ data }) => setDistricts(data)).catch(() => {});
  }, [isOpen, isAdminOrRegion]);

  // Charge les paroisses selon le district effectif
  useEffect(() => {
    const id = districtId || autoDistrictId;
    if (!id || !needsParish) return deferEffect(() => setParishes([]));
    return deferEffect(() => {
      territoriesApi.parishes(id).then(({ data }) => setParishes(data)).catch(() => {});
    });
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
    if (!isEditMode && password && password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    if (!isEditMode && password && password !== confirmPwd) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isEditMode && editUser) {
        const payload: Record<string, string | undefined> = {
          matricule:    matricule.trim(),
          nom:          nom.trim(),
          prenoms:      prenoms.trim(),
          email:        email.trim()        || undefined,
          telephone:    telephone.trim()    || undefined,
          dateNaissance: dateNaissance      || undefined,
          districtId:   districtId         || undefined,
          parishId:     parishId           || undefined,
          ...(editUser.role === 'REGION' && { regionRole }),
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
          password:   password.trim() || undefined,
          ...(role === 'REGION' && { regionRole }),
        };
        const { data } = await usersApi.create(payload);
        onCreated(data as User);
        if (!isAdminOrRegion) {
          setPendingSuccess(true);
          return;
        }
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

  if (pendingSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="bg-gradient-to-r from-[#D9A441] to-[#b87c1c] text-white p-5 text-center">
            <div className="text-4xl mb-2">⏳</div>
            <p className="font-black text-lg">Ajout envoyé</p>
          </div>
          <div className="p-6 flex flex-col gap-4 text-center">
            <p className="text-sm text-[#1F1B2E]">
              L'ajout de ce membre a été transmis pour validation.<br />
              Un administrateur ou le régional devra l'approuver avant qu'il soit actif.
            </p>
            <button type="button" onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[#1F1B2E] text-white font-bold text-sm">
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

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

          {/* ── Sous-rôle régional (visible uniquement quand role=REGION) ── */}
          {role === 'REGION' && (
            <div>
              <label className="block text-xs font-semibold text-[#6b6b78] uppercase tracking-wide mb-2">
                Fonction au sein de la région
              </label>
              <div className="flex flex-col gap-2">
                {REGION_ROLE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRegionRole(opt.value)}
                    className={`flex items-start gap-3 py-2.5 px-3 rounded-xl text-sm border-2 transition-all text-left ${
                      regionRole === opt.value
                        ? 'bg-[#1F1B2E] text-white border-[#1F1B2E] shadow-sm'
                        : 'bg-white text-[#1F1B2E] border-[#e0e0e8] hover:border-[#1F1B2E]'
                    }`}
                  >
                    <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      regionRole === opt.value ? 'border-white' : 'border-[#c0c0cc]'
                    }`}>
                      {regionRole === opt.value && <span className="w-2 h-2 rounded-full bg-white" />}
                    </span>
                    <div>
                      <div className="font-semibold leading-tight">{opt.label}</div>
                      <div className={`text-xs mt-0.5 ${regionRole === opt.value ? 'text-white/70' : 'text-[#9b9ba8]'}`}>{opt.description}</div>
                    </div>
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
                <p className="text-[11px] text-[#9b9ba8] mt-1">Sélectionnez d&apos;abord un district.</p>
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
            <div>
              <label className="block text-xs text-[#9b9ba8] mb-1">Date de naissance</label>
              <input type="date" value={dateNaissance} onChange={e => setDateNaissance(e.target.value)}
                className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6A1B9A] transition" />
            </div>
          </div>

          {/* ── Mot de passe (création uniquement) ── */}
          {!isEditMode && (
            <div>
              <label className="block text-xs font-semibold text-[#6b6b78] uppercase tracking-wide mb-2">
                Mot de passe
              </label>
              <div className="space-y-3">
                <div className="relative">
                  <label className="block text-xs text-[#9b9ba8] mb-1">
                    Mot de passe <span className="opacity-60">(optionnel)</span>
                  </label>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 6 caractères"
                    className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:border-[#6A1B9A] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-[calc(1.5rem+10px)] -translate-y-1/2 text-[#9b9ba8] hover:text-[#6A1B9A] text-base leading-none"
                  >
                    {showPwd ? '🙈' : '👁'}
                  </button>
                </div>
                {password && (
                  <div>
                    <label className="block text-xs text-[#9b9ba8] mb-1">Confirmer le mot de passe</label>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={confirmPwd}
                      onChange={e => setConfirmPwd(e.target.value)}
                      placeholder="Répéter le mot de passe"
                      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none transition ${
                        confirmPwd && confirmPwd !== password
                          ? 'border-[#f5c6c6] focus:border-[#C62828]'
                          : 'border-[#e0e0e8] focus:border-[#6A1B9A]'
                      }`}
                    />
                    {confirmPwd && confirmPwd !== password && (
                      <p className="text-[11px] text-[#C62828] mt-1">Les mots de passe ne correspondent pas.</p>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-[#9b9ba8]">
                  {password
                    ? '✓ Le membre pourra se connecter immédiatement avec ce mot de passe.'
                    : 'Sans mot de passe, le compte sera en attente jusqu\'à ce que le membre en choisisse un.'}
                </p>
              </div>
            </div>
          )}
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
