'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { usersApi } from '@/lib/api';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { ROLE_LABEL, getTerritoryLabel } from '@/lib/roles';
import type { User } from '@/types';

const ADH_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  A_JOUR:     { label: 'À jour',     bg: 'bg-[#e8f5e9]', text: 'text-[#2E7D32]', icon: '✅' },
  EN_ATTENTE: { label: 'En attente', bg: 'bg-[#fff8e6]', text: 'text-[#9c7218]', icon: '⏳' },
  NON_A_JOUR: { label: 'Non à jour', bg: 'bg-[#fff0f0]', text: 'text-[#C62828]', icon: '❌' },
};

export default function GuideProfilPage() {
  const { user } = useAuthStore();
  const [gardiens, setGardiens] = useState<User[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const params: Record<string, string> = { role: 'GARDIEN' };
    if (user.role === 'GUIDE'      && user.parish?.id)   params.parishId   = user.parish.id;
    if (user.role === 'SENTINELLE' && user.district?.id) params.districtId = user.district.id;
    usersApi.list(params)
      .then(r => setGardiens(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const isSentinelle = user?.role === 'SENTINELLE';
  const adhesion    = user?.adhesions?.[0];
  const adhCfg      = ADH_CONFIG[adhesion?.statut ?? 'NON_A_JOUR'];
  const roleName    = user ? ROLE_LABEL[user.role] : '—';
  const territory   = getTerritoryLabel(user);

  const aJour       = gardiens.filter(g => g.adhesions?.[0]?.statut === 'A_JOUR').length;
  const adhesionPct = gardiens.length > 0 ? Math.round((aJour / gardiens.length) * 100) : 0;

  const initials = user ? `${user.nom[0]}${user.prenoms[0]}`.toUpperCase() : '?';

  return (
    <div className="flex-1 overflow-y-auto bg-[#f7f7fa]">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-[#C62828] to-[#8e1a1a] text-white px-4 pt-8 pb-10 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-white/20 border-3 border-white/40 flex items-center justify-center text-2xl font-black overflow-hidden mb-3 relative">
          {user?.avatarUrl
            ? <Image src={user.avatarUrl} fill className="object-cover" alt="" sizes="80px" />
            : initials}
        </div>
        <h1 className="text-xl font-black text-center">{user?.prenoms} {user?.nom}</h1>
        <p className="text-xs opacity-75 mt-1">{roleName} · {territory}</p>

        {user?.matricule && (
          <div className="mt-3 bg-black/20 rounded-full px-4 py-1.5 text-sm font-mono font-bold tracking-widest">
            {user.matricule}
          </div>
        )}

        <button
          onClick={() => setProfileOpen(true)}
          className="mt-4 bg-white/15 hover:bg-white/25 transition text-white text-xs font-semibold px-4 py-2 rounded-full border border-white/20">
          ✏️ Modifier mon profil
        </button>
      </div>

      <div className="px-4 -mt-5 max-w-lg mx-auto pb-8 space-y-3">

        {/* Adhésion personnelle */}
        <div className="bg-white rounded-2xl border border-[#ececf0] shadow-sm p-4">
          <h2 className="text-xs font-bold text-[#6b6b78] uppercase tracking-wider mb-3">Mon adhésion 2026</h2>
          <div className={`flex items-center gap-3 p-3 rounded-xl ${adhCfg.bg}`}>
            <span className="text-2xl">{adhCfg.icon}</span>
            <div>
              <p className={`text-sm font-bold ${adhCfg.text}`}>{adhCfg.label}</p>
              {adhesion?.annee && (
                <p className="text-[11px] text-[#9b9ba8] mt-0.5">Année {adhesion.annee}</p>
              )}
            </div>
          </div>
        </div>

        {/* Informations personnelles */}
        <div className="bg-white rounded-2xl border border-[#ececf0] shadow-sm p-4">
          <h2 className="text-xs font-bold text-[#6b6b78] uppercase tracking-wider mb-3">Informations</h2>
          <div className="space-y-3">
            {[
              { label: 'Rôle',      value: roleName },
              { label: 'Territoire', value: territory },
              { label: 'Email',     value: user?.email ?? '—' },
              { label: 'Téléphone', value: user?.telephone ?? '—' },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center border-b border-[#f0f0f0] pb-2.5 last:border-0 last:pb-0">
                <span className="text-xs text-[#9b9ba8]">{row.label}</span>
                <span className="text-sm font-semibold text-[#1F1B2E] text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats territoire */}
        {!loading && gardiens.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#ececf0] shadow-sm p-4">
            <h2 className="text-xs font-bold text-[#6b6b78] uppercase tracking-wider mb-3">
              Mon territoire · {isSentinelle ? 'District' : 'Paroisse'}
            </h2>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center">
                <div className="text-2xl font-black text-[#6A1B9A]">{gardiens.length}</div>
                <div className="text-[10px] text-[#9b9ba8] uppercase tracking-wide">Gardiens</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-[#2E7D32]">{aJour}</div>
                <div className="text-[10px] text-[#9b9ba8] uppercase tracking-wide">À jour</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-[#D9A441]">{adhesionPct}%</div>
                <div className="text-[10px] text-[#9b9ba8] uppercase tracking-wide">Taux</div>
              </div>
            </div>
            {/* Barre progression */}
            <div className="h-2 bg-[#f0f0f4] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#2E7D32] to-[#4CAF50] transition-all"
                style={{ width: `${adhesionPct}%` }} />
            </div>
          </div>
        )}

        {/* Déconnexion */}
        <div className="bg-white rounded-2xl border border-[#ececf0] shadow-sm overflow-hidden">
          <LogoutButton
            confirm
            className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-[#fff0f0] transition text-[#C62828]"
          >
            <span className="text-xl">🚪</span>
            <div>
              <p className="text-sm font-bold">Se déconnecter</p>
              <p className="text-xs text-[#9b9ba8]">
                {user?.prenoms} {user?.nom}
              </p>
            </div>
          </LogoutButton>
        </div>

      </div>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
