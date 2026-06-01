'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { usersApi, challengesApi, campsApi, messagingApi } from '@/lib/api';
import { getTerritoryLabel, ROLE_LABEL } from '@/lib/roles';
import { Card, SectionTitle } from '@/components/ui';
import { CampCard } from '@/components/camps/CampCard';
import type { User, Camp, Submission, Conversation } from '@/types';

const CONV_ICON: Record<string, string> = {
  COMMUNAUTE: '🌍', REGION: '🗺️', DOYENNE: '🛡️', PAROISSE: '⛪', PRIVE: '🤝', GROUPE: '👥',
};

export default function DashboardGuidePage() {
  const { user } = useAuthStore();
  const [routiers, setRoutiers] = useState<User[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [pending, setPending] = useState<Submission[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const params: Record<string, string> = { role: 'GARDIEN' };
    if (user.role === 'GUIDE') {
      if (!user.parish?.id) return;
      params.parishId = user.parish.id;
    }
    if (user.role === 'SENTINELLE') {
      if (!user.district?.id) return;
      params.districtId = user.district.id;
    }
    Promise.all([
      usersApi.list(params),
      campsApi.list({ statut: 'OUVERT' }),
      challengesApi.pending(),
      messagingApi.conversations(),
    ]).then(([u, c, p, conv]) => {
      setRoutiers(u.data);
      setCamps(c.data);
      setPending(p.data);
      setConversations(conv.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const aJour   = routiers.filter(r => r.adhesions?.[0]?.statut === 'A_JOUR').length;
  const nonAJour = routiers.length - aJour;
  const roleName  = user ? ROLE_LABEL[user.role] : 'Guide';
  const territory = getTerritoryLabel(user);
  const canExport = user?.role === 'SENTINELLE' || user?.role === 'ADMIN' || user?.role === 'REGION';
  const adhesionPct = routiers.length > 0 ? Math.round((aJour / routiers.length) * 100) : 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Bandeau de bienvenue — desktop uniquement (mobile: le layout topbar suffit) ── */}
      <div className="hidden lg:flex items-center gap-3.5 px-8 py-4 bg-gradient-to-r from-[#6A1B9A] to-[#4a1370] text-white flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-black text-base overflow-hidden flex-shrink-0">
          {user?.avatarUrl
            ? <img src={user.avatarUrl} className="w-full h-full object-cover" alt="" />
            : user ? `${user.nom[0]}${user.prenoms[0]}`.toUpperCase() : 'G'}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black leading-tight">{user?.prenoms} {user?.nom}</h1>
          <p className="text-xs opacity-80 mt-0.5">{roleName} · {territory}</p>
        </div>
        {/* Taux d'adhésion global */}
        {routiers.length > 0 && (
          <div className="text-right hidden xl:block">
            <div className="text-2xl font-black">{adhesionPct}%</div>
            <div className="text-[10px] opacity-70 uppercase tracking-wider">Taux adhésion</div>
          </div>
        )}
      </div>

      {/* ── Contenu scrollable ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* Grille de stats */}
        <div className="px-4 pt-4 lg:px-8 lg:pt-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <StatCard
              value={routiers.length}
              label="Gardiens"
              icon="🤝"
              color="#6A1B9A"
              bg="from-[#6A1B9A]/10 to-[#6A1B9A]/5"
            />
            <StatCard
              value={aJour}
              label="À jour 2026"
              icon="✅"
              color="#2E7D32"
              bg="from-[#2E7D32]/10 to-[#2E7D32]/5"
              sub={routiers.length > 0 ? `${adhesionPct}% du total` : undefined}
            />
            <StatCard
              value={camps.length}
              label="Camps ouverts"
              icon="⛺"
              color="#D9A441"
              bg="from-[#D9A441]/15 to-[#D9A441]/5"
            />
            <StatCard
              value={pending.length}
              label="Défis à valider"
              icon="🎯"
              color={pending.length > 0 ? '#C62828' : '#6b6b78'}
              bg={pending.length > 0 ? 'from-[#C62828]/10 to-[#C62828]/5' : 'from-[#f3f3f5] to-[#f3f3f5]'}
            />
          </div>
        </div>

        {/* Barre de progression adhésions */}
        {routiers.length > 0 && (
          <div className="px-4 pt-3 lg:px-8">
            <div className="bg-white rounded-2xl border border-[#ececf0] p-3.5">
              <div className="flex justify-between items-center mb-2 text-xs font-semibold text-[#1F1B2E]">
                <span>Adhésions 2026</span>
                <span className="text-[#6b6b78] font-normal">{aJour} / {routiers.length} à jour</span>
              </div>
              <div className="h-2 bg-[#f0f0f4] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2E7D32] to-[#4CAF50] transition-all"
                  style={{ width: `${adhesionPct}%` }}
                />
              </div>
              {nonAJour > 0 && (
                <p className="text-[11px] text-[#C62828] mt-1.5 font-medium">
                  {nonAJour} gardien{nonAJour > 1 ? 's' : ''} non à jour — pensez à relancer
                </p>
              )}
            </div>
          </div>
        )}

        {/* Layout 2 colonnes sur desktop */}
        <div className="px-4 pb-6 lg:px-8 lg:pb-8 lg:grid lg:grid-cols-[1fr_380px] lg:gap-6 lg:items-start">

          {/* Colonne gauche : actions */}
          <div>
            <SectionTitle>Actions du jour</SectionTitle>

            {nonAJour > 0 && (
              <ActionCard
                icon="⚠️"
                iconBg="bg-[#fff3d6]"
                title={`${nonAJour} routier${nonAJour > 1 ? 's' : ''} à relancer`}
                sub="Adhésion 2026 non à jour"
                action={
                  <Link
                    href="/dashboard/guide/membres"
                    className="text-xs bg-[#D9A441] text-white px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap"
                  >
                    Voir
                  </Link>
                }
              />
            )}

            {pending.length > 0 && (
              <ActionCard
                icon="🎯"
                iconBg="bg-[#f0e3ff]"
                title={`${pending.length} preuve${pending.length > 1 ? 's' : ''} en attente`}
                sub="À valider avant la fin de semaine"
                action={
                  <Link
                    href="/dashboard/guide/codex"
                    className="text-xs bg-[#C62828] text-white px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap"
                  >
                    Valider
                  </Link>
                }
              />
            )}

            {nonAJour === 0 && pending.length === 0 && !loading && (
              <ActionCard
                icon="✅"
                iconBg="bg-[#e1f4e3]"
                title="Tout est à jour"
                sub="Aucune action requise aujourd'hui"
              />
            )}

            {/* Export — contextualisé ici pour la Sentinelle */}
            {canExport && (
              <div className="mt-4">
                <SectionTitle>Outils</SectionTitle>
                <Link
                  href="/dashboard/guide/adhesions"
                  className="flex items-center gap-3 bg-white rounded-2xl border border-[#ececf0] p-3.5 mb-2.5 hover:border-[#C62828]/40 transition-colors group"
                >
                  <span className="w-9 h-9 rounded-xl bg-[#ffe6e6] flex items-center justify-center text-lg flex-shrink-0">📋</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[#1F1B2E]">Gérer les adhésions</div>
                    <div className="text-xs text-[#6b6b78]">Statuts et paiements</div>
                  </div>
                  <span className="text-[#C62828] text-sm group-hover:translate-x-0.5 transition-transform">→</span>
                </Link>
                <Link
                  href="/dashboard/guide/membres"
                  className="flex items-center gap-3 bg-white rounded-2xl border border-[#ececf0] p-3.5 mb-2.5 hover:border-[#6A1B9A]/40 transition-colors group"
                >
                  <span className="w-9 h-9 rounded-xl bg-[#f0e3ff] flex items-center justify-center text-lg flex-shrink-0">👥</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[#1F1B2E]">Liste des membres</div>
                    <div className="text-xs text-[#6b6b78]">Gardiens de mon territoire</div>
                  </div>
                  <span className="text-[#6A1B9A] text-sm group-hover:translate-x-0.5 transition-transform">→</span>
                </Link>
              </div>
            )}
          </div>

          {/* Colonne droite : camps + messages */}
          <div>
            {camps.length > 0 && (
              <>
                <SectionTitle>
                  Camps ouverts
                  {camps.length > 1 && (
                    <Link href="/dashboard/guide/camps" className="text-xs text-[#6A1B9A] font-semibold">
                      Tout voir →
                    </Link>
                  )}
                </SectionTitle>
                {camps.slice(0, 2).map(camp => (
                  <div key={camp.id} className="mb-3">
                    <CampCard camp={camp} href={`/dashboard/guide/camps/${camp.id}`} />
                    <Link
                      href={`/dashboard/guide/selection/${camp.id}`}
                      className="block w-full text-center bg-[#6A1B9A] text-white font-bold text-sm py-2.5 rounded-b-2xl -mt-1 hover:bg-[#5a1280] transition-colors"
                    >
                      Sélectionner pour ce camp →
                    </Link>
                  </div>
                ))}
              </>
            )}

            {conversations.length > 0 && (
              <>
                <SectionTitle action={
                  <Link href="/dashboard/guide/messages" className="text-xs text-[#6A1B9A] font-semibold">
                    Tout voir →
                  </Link>
                }>
                  Messages récents
                </SectionTitle>
                <Card className="p-0 overflow-hidden">
                  {conversations.slice(0, 4).map((conv, i) => {
                    const lastMsg = conv.messages?.[0];
                    const timeStr = conv.lastMessageAt
                      ? new Date(conv.lastMessageAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                      : '';
                    return (
                      <Link
                        key={conv.id}
                        href={`/dashboard/guide/messages/${conv.id}`}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-[#f7f7fb] transition-colors ${i > 0 ? 'border-t border-[#f0f0f4]' : ''}`}
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#3d1163] flex items-center justify-center text-sm text-white flex-shrink-0">
                          {CONV_ICON[conv.type] ?? '💬'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-1">
                            <span className="font-semibold text-xs text-[#1F1B2E] truncate">{conv.nom ?? 'Conversation'}</span>
                            {timeStr && <span className="text-[10px] text-[#6b6b78] flex-shrink-0">{timeStr}</span>}
                          </div>
                          <p className="text-[11px] text-[#6b6b78] truncate mt-0.5">
                            {lastMsg?.contenu ?? 'Aucun message'}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Composants locaux ─────────────────────────────────────────────────────── */

function StatCard({
  value, label, icon, color, bg, sub,
}: {
  value: number; label: string; icon: string; color: string; bg: string; sub?: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${bg} rounded-2xl p-3.5 border border-[#ececf0]`}>
      <div className="flex items-start justify-between gap-1 mb-1">
        <div className="text-2xl font-black leading-none" style={{ color }}>{value}</div>
        <span className="text-xl leading-none">{icon}</span>
      </div>
      <div className="text-[10px] text-[#6b6b78] uppercase tracking-wide font-semibold">{label}</div>
      {sub && <div className="text-[10px] mt-0.5 font-medium" style={{ color }}>{sub}</div>}
    </div>
  );
}

function ActionCard({
  icon, iconBg, title, sub, action,
}: {
  icon: string; iconBg: string; title: string; sub: string; action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl border border-[#ececf0] p-3.5 mb-2.5">
      <span className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center text-xl flex-shrink-0`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-[#1F1B2E] truncate">{title}</div>
        <div className="text-xs text-[#6b6b78]">{sub}</div>
      </div>
      {action}
    </div>
  );
}
