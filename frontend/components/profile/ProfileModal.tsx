'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { usersApi, authApi } from '@/lib/api';
import { deferEffect } from '@/lib/effects';
import { usePastoralYear } from '@/store/pastoralYear';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:4000';

function AvatarDisplay({
  avatarUrl,
  initials,
  size = 'lg',
}: {
  avatarUrl?: string;
  initials: string;
  size?: 'sm' | 'lg';
}) {
  const dim = size === 'lg' ? 'w-16 h-16 text-lg' : 'w-9 h-9 text-xs';
  if (avatarUrl) {
    const src = avatarUrl.startsWith('http') ? avatarUrl : `${API_BASE}${avatarUrl}`;
    const px = size === 'lg' ? 64 : 36;
    return (
      <Image
        src={src}
        width={px}
        height={px}
        alt="Avatar"
        className={`${dim} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${dim} rounded-full bg-white/25 flex items-center justify-center font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

export { AvatarDisplay };

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, setUser } = useAuthStore();
  const anneeP = usePastoralYear(s => s.annee);
  const [tab, setTab] = useState<'info' | 'password'>('info');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const preuveInputRef = useRef<HTMLInputElement>(null);

  // Champs éditables
  const [nom, setNom] = useState('');
  const [prenoms, setPrenoms] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');

  // Avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState('');

  // Adhésion
  const [adhLoading, setAdhLoading] = useState(false);
  const [adhError, setAdhError]     = useState('');
  const [adhSuccess, setAdhSuccess] = useState('');
  const [preuveFile, setPreuveFile] = useState<File | null>(null);

  // Changement de mot de passe
  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmMdp, setConfirmMdp] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => deferEffect(() => {
    if (isOpen && user) {
      setNom(user.nom);
      setPrenoms(user.prenoms);
      setEmail(user.email ?? '');
      setTelephone(user.telephone ?? '');
      setError('');
      setSuccess('');
      setAvatarFile(null);
      setAvatarPreview(null);
      setAvatarError('');
      setAvatarSuccess('');
      setAdhError('');
      setAdhSuccess('');
      setPreuveFile(null);
      setTab('info');
    }
  }), [isOpen, user]);

  useEffect(() => deferEffect(() => {
    setError('');
    setSuccess('');
  }), [tab]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Format non supporté. Utilisez JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('La photo ne doit pas dépasser 5 Mo.');
      return;
    }
    setAvatarError('');
    setAvatarSuccess('');
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !user) return;
    setAvatarLoading(true);
    setAvatarError('');
    setAvatarSuccess('');
    try {
      const { data } = await usersApi.uploadAvatar(avatarFile);
      setUser({ ...user, avatarUrl: data.avatarUrl });
      setAvatarSuccess('Photo de profil mise à jour.');
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setAvatarError(err?.response?.data?.message ?? 'Erreur lors de l\'envoi de la photo.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleUpdateAdhesion = async (statut: 'A_JOUR' | 'NON_A_JOUR' | 'EN_ATTENTE') => {
    if (!user) return;
    const annee = anneeP;
    setAdhLoading(true);
    setAdhError('');
    setAdhSuccess('');
    try {
      const { data } = await usersApi.updateAdhesion(user.id, annee, statut, preuveFile ?? undefined);
      const adhesions = [data, ...(user.adhesions ?? []).filter(a => a.annee !== annee)];
      setUser({ ...user, adhesions });
      setAdhSuccess('Adhésion mise à jour.');
      setPreuveFile(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setAdhError(err?.response?.data?.message ?? 'Erreur lors de la mise à jour.');
    } finally {
      setAdhLoading(false);
    }
  };

  const handleSaveInfo = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await usersApi.updateMe({
        nom,
        prenoms,
        email: email.trim() || undefined,
        telephone: telephone.trim() || undefined,
      });
      setUser({ ...user, ...data });
      setSuccess('Profil mis à jour avec succès.');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? 'Erreur lors de la mise à jour.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!ancienMdp || !nouveauMdp || !confirmMdp) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    if (nouveauMdp !== confirmMdp) {
      setError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (nouveauMdp.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authApi.changePassword(ancienMdp, nouveauMdp);
      setSuccess('Mot de passe modifié avec succès.');
      setAncienMdp('');
      setNouveauMdp('');
      setConfirmMdp('');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? 'Erreur lors du changement de mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const initials = user ? `${user.nom[0]}${user.prenoms[0]}` : '?';
  const displayAvatar = avatarPreview ?? user?.avatarUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="bg-gradient-to-r from-[#1F1B2E] to-[#3a1d4d] text-white p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              {displayAvatar ? (
                <Image
                  src={displayAvatar.startsWith('http') || displayAvatar.startsWith('blob:')
                    ? displayAvatar
                    : `${API_BASE}${displayAvatar}`}
                  width={48}
                  height={48}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center text-sm font-bold">
                  {initials}
                </div>
              )}
            </div>
            <div>
              <div className="font-bold text-sm">{user?.prenoms} {user?.nom}</div>
              <div className="text-xs opacity-60">{user?.matricule ?? user?.role}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors text-sm"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setTab('info')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'info'
                ? 'text-[#C62828] border-b-2 border-[#C62828]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Mes informations
          </button>
          <button
            onClick={() => setTab('password')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'password'
                ? 'text-[#C62828] border-b-2 border-[#C62828]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Mot de passe
          </button>
        </div>

        {/* Corps scrollable */}
        <div className="overflow-y-auto flex-1">
          <div className="p-5">
            {tab === 'info' ? (
              <div className="space-y-4">

                {/* Section photo de profil */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 mb-3">Photo de profil</p>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      {(avatarPreview ?? user?.avatarUrl) ? (
                        <Image
                          src={avatarPreview
                            ? avatarPreview
                            : (user?.avatarUrl?.startsWith('http')
                              ? user.avatarUrl
                              : `${API_BASE}${user?.avatarUrl}`) as string}
                          width={64}
                          height={64}
                          unoptimized
                          alt="Aperçu"
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3a1d4d] to-[#C62828] flex items-center justify-center text-white text-xl font-bold">
                          {initials}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm font-medium text-[#C62828] hover:text-[#a82020] transition-colors"
                      >
                        Choisir une photo
                      </button>
                      <p className="text-xs text-gray-400 mt-0.5">JPEG, PNG, WebP · max 5 Mo</p>
                      {avatarFile && (
                        <p className="text-xs text-gray-600 mt-1 truncate">{avatarFile.name}</p>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarSelect}
                    />
                  </div>

                  {avatarSuccess && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs">
                      ✓ {avatarSuccess}
                    </div>
                  )}
                  {avatarError && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                      {avatarError}
                    </div>
                  )}

                  {avatarFile && (
                    <button
                      onClick={handleAvatarUpload}
                      disabled={avatarLoading}
                      className="mt-3 w-full bg-[#1F1B2E] text-white py-2 rounded-xl text-xs font-semibold hover:bg-[#2d2640] transition-colors disabled:opacity-60"
                    >
                      {avatarLoading ? 'Envoi en cours…' : 'Enregistrer la photo'}
                    </button>
                  )}
                </div>

                {/* Champs en lecture seule */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
                  {user?.matricule && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Matricule</span>
                      <span className="font-mono font-semibold text-gray-800">{user.matricule}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rôle</span>
                    <span className="font-semibold text-gray-800">{user?.role}</span>
                  </div>
                  {user?.region && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Région</span>
                      <span className="text-gray-700 truncate max-w-[55%] text-right">{user.region.nom}</span>
                    </div>
                  )}
                  {user?.district && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">District</span>
                      <span className="text-gray-700 truncate max-w-[55%] text-right">{user.district.nom}</span>
                    </div>
                  )}
                  {user?.parish && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Paroisse</span>
                      <span className="text-gray-700 truncate max-w-[55%] text-right">{user.parish.nom}</span>
                    </div>
                  )}
                </div>

                {/* Section adhésion */}
                {(() => {
                  const annee = anneeP;
                  const adhesion = user?.adhesions?.find(a => a.annee === annee) ?? user?.adhesions?.[0];
                  const canEdit = user?.role !== 'GARDIEN';
                  const LABEL: Record<string, string> = { A_JOUR: 'À jour', NON_A_JOUR: 'Non à jour', EN_ATTENTE: 'En attente' };
                  const COLOR: Record<string, string> = { A_JOUR: 'text-green-600', NON_A_JOUR: 'text-[#C62828]', EN_ATTENTE: 'text-[#D9A441]' };
                  return (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold text-gray-600">Droit d&apos;adhésion {annee}</p>
                        {adhesion ? (
                          <span className={`text-xs font-bold ${COLOR[adhesion.statut] ?? 'text-gray-500'}`}>
                            {LABEL[adhesion.statut] ?? adhesion.statut}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Non renseigné</span>
                        )}
                      </div>
                      {adhSuccess && (
                        <p className="text-[11px] text-green-600 mb-2">✓ {adhSuccess}</p>
                      )}
                      {adhError && (
                        <p className="text-[11px] text-red-600 mb-2">{adhError}</p>
                      )}
                      {canEdit && (
                        <>
                          <div className="flex gap-1.5 mt-2">
                            <button
                              onClick={() => handleUpdateAdhesion('A_JOUR')}
                              disabled={adhLoading || adhesion?.statut === 'A_JOUR'}
                              className="flex-1 py-1.5 text-[11px] font-semibold rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-60 transition-colors"
                            >
                              {adhLoading ? '…' : '✓ À jour'}
                            </button>
                            <button
                              onClick={() => handleUpdateAdhesion('EN_ATTENTE')}
                              disabled={adhLoading || adhesion?.statut === 'EN_ATTENTE'}
                              className="flex-1 py-1.5 text-[11px] font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-60 transition-colors"
                            >
                              En attente
                            </button>
                            <button
                              onClick={() => handleUpdateAdhesion('NON_A_JOUR')}
                              disabled={adhLoading || adhesion?.statut === 'NON_A_JOUR'}
                              className="flex-1 py-1.5 text-[11px] font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60 transition-colors"
                            >
                              Non à jour
                            </button>
                          </div>
                          {/* Proof file upload */}
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => preuveInputRef.current?.click()}
                              className="text-[11px] font-medium text-[#6A1B9A] hover:text-[#4a1370] transition-colors"
                            >
                              📎 Joindre preuve
                            </button>
                            {preuveFile && (
                              <span className="text-[11px] text-gray-600 truncate max-w-[140px]">{preuveFile.name}</span>
                            )}
                            {!preuveFile && adhesion?.preuveUrl && (
                              <a
                                href={`${API_BASE}${adhesion.preuveUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-[#6A1B9A] hover:underline"
                              >
                                Voir la preuve
                              </a>
                            )}
                            <input
                              ref={preuveInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              className="hidden"
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) setPreuveFile(f);
                                e.target.value = '';
                              }}
                            />
                          </div>
                        </>
                      )}
                      {!canEdit && (
                        <p className="text-[11px] text-gray-400 mt-1">Géré par votre guide ou l&apos;administration.</p>
                      )}
                    </div>
                  );
                })()}

                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                    ✓ {success}
                  </div>
                )}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Nom</label>
                  <input
                    value={nom}
                    onChange={e => setNom(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#C62828]/10 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Prénoms</label>
                  <input
                    value={prenoms}
                    onChange={e => setPrenoms(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#C62828]/10 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#C62828]/10 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Téléphone</label>
                  <input
                    type="tel"
                    value={telephone}
                    onChange={e => setTelephone(e.target.value)}
                    placeholder="+225 07 00 00 00 00"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#C62828]/10 transition-colors"
                  />
                </div>

                <button
                  onClick={handleSaveInfo}
                  disabled={loading || !nom.trim() || !prenoms.trim()}
                  className="w-full bg-[#C62828] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#a82020] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Enregistrement…' : 'Enregistrer les modifications'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                    ✓ {success}
                  </div>
                )}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Mot de passe actuel</label>
                  <input
                    type="password"
                    value={ancienMdp}
                    onChange={e => setAncienMdp(e.target.value)}
                    autoComplete="current-password"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#C62828]/10 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={nouveauMdp}
                    onChange={e => setNouveauMdp(e.target.value)}
                    autoComplete="new-password"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#C62828]/10 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Confirmer le nouveau mot de passe</label>
                  <input
                    type="password"
                    value={confirmMdp}
                    onChange={e => setConfirmMdp(e.target.value)}
                    autoComplete="new-password"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C62828] focus:ring-2 focus:ring-[#C62828]/10 transition-colors"
                  />
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={loading || !ancienMdp || !nouveauMdp || !confirmMdp}
                  className="w-full bg-[#C62828] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#a82020] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Modification…' : 'Modifier le mot de passe'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
