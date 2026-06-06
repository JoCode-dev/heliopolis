'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { challengesApi, badgesApi, campsApi, messagingApi } from '@/lib/api';
import { Avatar, Card, SectionTitle, Progress, Pill, Stat } from '@/components/ui';
import { getRangGardien, getNextRang, getRangProgress } from '@/lib/ranks';
import { CampCard } from '@/components/camps/CampCard';
import type { Badge, Challenge, ChallengeCategory, Submission, UserBadge, Camp, Conversation } from '@/types';

const BADGE_EMOJI: Record<string, string> = {
  BRONZE: '🪨', ARGENT: '🥈', OR: '🏅', LEGENDE: '⚜️',
};
const CATEGORY_LABELS: Record<ChallengeCategory, string> = {
  PERSONNEL: 'Personnel',
  COMMUNAUTAIRE: 'Communautaire',
  SPIRITUEL: 'Spirituel',
  LONG: 'Défi long',
};
const CATEGORY_VARIANT: Record<ChallengeCategory, 'rouge' | 'vert' | 'violet' | 'or'> = {
  PERSONNEL: 'rouge',
  COMMUNAUTAIRE: 'vert',
  SPIRITUEL: 'violet',
  LONG: 'or',
};
const CONV_ICON: Record<string, string> = {
  COMMUNAUTE: '🌍', REGION: '🗺️', DOYENNE: '🛡️', PAROISSE: '⛪', PRIVE: '🤝', GROUPE: '👥',
};
const CONV_GRADIENT: Record<string, string> = {
  COMMUNAUTE: 'from-[#F58A4B] to-[#C62828]',
  REGION:     'from-[#F58A4B] to-[#C62828]',
  DOYENNE:    'from-[#6A1B9A] to-[#3d1163]',
  PAROISSE:   'from-[#C62828] to-[#7a1717]',
  PRIVE:      'from-[#1F1B2E] to-[#3a1d4d]',
  GROUPE:     'from-[#2E7D32] to-[#1a5021]',
};

function formatTime(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function convDisplayName(conv: Conversation, myId?: string): string {
  if (conv.nom) return conv.nom;
  if (conv.type === 'PRIVE' && conv.members && myId) {
    const other = conv.members.find(m => m.userId !== myId);
    if (other?.user) return `${other.user.prenoms} ${other.user.nom}`;
  }
  return 'Conversation';
}

export default function DashboardGardienPage() {
  const { user } = useAuthStore();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [camp, setCamp] = useState<Camp | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [subRes, badgeRes, allBadgeRes, challengeRes, campsRes, convRes] = await Promise.all([
          challengesApi.mySubmissions(),
          badgesApi.mine(),
          badgesApi.list(),
          challengesApi.list(),
          campsApi.list({ statut: 'OUVERT' }),
          messagingApi.conversations(),
        ]);
        setSubmissions(subRes.data);
        setBadges(badgeRes.data);
        setAllBadges(allBadgeRes.data);
        setChallenges(challengeRes.data);
        if (campsRes.data.length > 0) setCamp(campsRes.data[0]);
        setConversations(convRes.data);
      } catch { /* ignore */ }
    })();
  }, []);

  const validated = submissions.filter(s => s.statut === 'VALIDE').length;
  const total = Math.max(challenges.length, validated, 1);
  const pct = Math.round((validated / total) * 100);
  const totalPoints = submissions
    .filter(s => s.statut === 'VALIDE')
    .reduce((acc, s) => acc + (s.challenge?.points ?? 0), 0);
  const latestBadge = badges[0];
  const ownedBadgeIds = new Set(badges.map(b => b.badge.id));
  const nextBadge = allBadges.find(b => !ownedBadgeIds.has(b.id));
  const pendingSubmissions = submissions.filter(s => s.statut === 'EN_ATTENTE');
  const rejectedSubmissions = submissions.filter(s => s.statut === 'REJETE' || s.statut === 'CORRECTION_DEMANDEE');
  const activeConversations = conversations.filter(c =>
    ((c as unknown as { _count?: { messages: number } })._count?.messages ?? 0) > 0 ||
    (c.messages?.length ?? 0) > 0
  );

  const initials   = user ? `${user.nom[0]}${user.prenoms[0]}`.toUpperCase() : '?';
  const adhesionOk = user?.adhesions?.[0]?.statut === 'A_JOUR';
  const rang        = getRangGardien(totalPoints);
  const nextRang    = getNextRang(totalPoints);
  const rangPct     = getRangProgress(totalPoints);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#C62828] to-[#8e1a1a] text-white px-4 pt-4 pb-5 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <Avatar initials={initials} size={46} className="border-2 border-white/40 bg-white/20" />
          <div className="flex-1">
            <h1 className="text-base font-bold leading-tight">{user?.prenoms} {user?.nom}</h1>
            <p className="text-xs opacity-80 mt-0.5">🛡️ Gardien · {user?.parish?.nom ?? 'Paroisse'}</p>
            {/* Rang */}
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm leading-none">{rang.icon}</span>
              <span className="text-[11px] font-bold opacity-90">{rang.label}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-black">⭐ {totalPoints}</div>
            <div className="text-[10px] opacity-60">points</div>
          </div>
        </div>

        {/* Barre de progression vers le rang suivant */}
        {nextRang && (
          <div className="mb-3">
            <div className="flex justify-between text-[10px] opacity-60 mb-1">
              <span>{rang.label}</span>
              <span>{nextRang.icon} {nextRang.label} · {nextRang.minPoints} pts</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/70 rounded-full transition-all" style={{ width: `${rangPct}%` }} />
            </div>
          </div>
        )}


        {/* Carte matricule + stats rapides */}
        <div className="bg-black/25 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] opacity-70 uppercase tracking-wide">Matricule</div>
            <div className="font-black tracking-widest text-sm mt-0.5">{user?.matricule ?? '—'}</div>
            <div className="text-[10px] opacity-70 mt-1">Adhésion 2026</div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {adhesionOk
              ? <span className="inline-flex items-center gap-1 bg-[#2E7D32] text-white text-[10px] font-bold px-2.5 py-1 rounded-full">✓ À jour</span>
              : <span className="inline-flex items-center gap-1 bg-[#9c7218] text-white text-[10px] font-bold px-2.5 py-1 rounded-full">⏳ En attente</span>
            }
            <div className="flex items-center gap-1.5 text-[11px] opacity-80">
              <span>🏅 {badges.length} artefact{badges.length !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>⭐ {totalPoints} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f7f7fa]">

        {/* Stats rapides */}
        <div className="px-4 pt-4 grid grid-cols-4 gap-2">
          <div className="bg-white rounded-xl p-2.5 border border-[#ececf0] text-center shadow-sm">
            <div className="text-xl font-black text-[#C62828]">{validated}</div>
            <div className="text-[9px] text-[#6b6b78] uppercase tracking-wide leading-tight mt-0.5">Validés</div>
          </div>
          <div className="bg-white rounded-xl p-2.5 border border-[#ececf0] text-center shadow-sm">
            <div className="text-xl font-black text-[#D9A441]">{totalPoints}</div>
            <div className="text-[9px] text-[#6b6b78] uppercase tracking-wide leading-tight mt-0.5">Points</div>
          </div>
          <div className="bg-white rounded-xl p-2.5 border border-[#ececf0] text-center shadow-sm">
            <div className="text-xl font-black text-[#6A1B9A]">{badges.length}</div>
            <div className="text-[9px] text-[#6b6b78] uppercase tracking-wide leading-tight mt-0.5">Artefacts</div>
          </div>
          <div className="bg-white rounded-xl p-2.5 border border-[#ececf0] text-center shadow-sm">
            <div className="text-xl font-black text-[#2E7D32]">{pendingSubmissions.length}</div>
            <div className="text-[9px] text-[#6b6b78] uppercase tracking-wide leading-tight mt-0.5">En cours</div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="px-4 pt-3 grid grid-cols-3 gap-2">
          <Link href="/dashboard/gardien/missions" className="bg-white rounded-xl p-3 border border-[#ececf0] shadow-sm flex flex-col items-center gap-1.5 active:scale-95 transition">
            <span className="text-2xl">🎯</span>
            <span className="text-[10px] font-semibold text-[#1F1B2E] text-center leading-tight">Mes missions</span>
          </Link>
          <Link href="/dashboard/gardien/artefacts" className="bg-white rounded-xl p-3 border border-[#ececf0] shadow-sm flex flex-col items-center gap-1.5 active:scale-95 transition">
            <span className="text-2xl">🏅</span>
            <span className="text-[10px] font-semibold text-[#1F1B2E] text-center leading-tight">Artefacts</span>
          </Link>
          <Link href="/dashboard/gardien/codex" className="bg-white rounded-xl p-3 border border-[#ececf0] shadow-sm flex flex-col items-center gap-1.5 active:scale-95 transition">
            <span className="text-2xl">🪶</span>
            <span className="text-[10px] font-semibold text-[#1F1B2E] text-center leading-tight">Codex</span>
          </Link>
        </div>

        <div className="px-4 lg:px-8 pb-6">
          <div className="lg:grid lg:grid-cols-2 lg:gap-6">

            {/* Colonne gauche */}
            <div>
              {/* Progression */}
              <SectionTitle action={
                <Link href="/dashboard/gardien/artefacts" className="text-xs text-[#C62828] font-semibold">Artefacts →</Link>
              }>
                Ma progression
              </SectionTitle>
              <Card className="mb-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-3xl font-black text-[#D9A441] leading-none">{validated}
                      <span className="text-base font-semibold text-[#6b6b78]">/{total}</span>
                    </div>
                    <div className="text-xs text-[#6b6b78] mt-1">défis complétés · <span className="font-semibold text-[#1F1B2E]">{pct}%</span></div>
                  </div>
                  {latestBadge ? (
                    <div className="text-right">
                      <div className="text-2xl">{BADGE_EMOJI[latestBadge.badge.niveau]}</div>
                      <div className="text-[10px] text-[#6b6b78] mt-0.5">{latestBadge.badge.nom}</div>
                    </div>
                  ) : (
                    <div className="text-right">
                      <div className="text-2xl">🌱</div>
                      <div className="text-[10px] text-[#6b6b78] mt-0.5">Débutant</div>
                    </div>
                  )}
                </div>
                <Progress value={validated} max={total} />
                <div className="flex justify-between items-center mt-2">
                  {nextBadge ? (
                    <p className="text-[11px] text-[#6b6b78]">
                      Prochain artefact : <span className="font-semibold text-[#1F1B2E]">{nextBadge.nom}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#2E7D32] font-semibold">Tous les artefacts débloqués !</p>
                  )}
                  <span className="text-[11px] font-bold text-[#D9A441]">{totalPoints} pts</span>
                </div>
              </Card>

              {/* Alertes : missions à corriger */}
              {rejectedSubmissions.length > 0 && (
                <>
                  <SectionTitle>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#C62828] animate-pulse inline-block" />
                      À corriger
                    </span>
                  </SectionTitle>
                  {rejectedSubmissions.slice(0, 2).map(sub => (
                    <Card key={sub.id} className="mb-2.5 border-l-4 border-l-[#C62828] bg-[#fff5f5]">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm text-[#1F1B2E] flex-1 pr-2">{sub.challenge.titre}</h4>
                        <Pill variant="rouge">{sub.statut === 'REJETE' ? 'Rejeté' : 'Correction'}</Pill>
                      </div>
                      <p className="text-xs text-[#C62828] mt-1">Une action est requise de ta part</p>
                    </Card>
                  ))}
                </>
              )}

              {/* Missions en cours */}
              <SectionTitle action={
                <Link href="/dashboard/gardien/missions" className="text-xs text-[#C62828] font-semibold">Tout voir →</Link>
              }>
                Missions en cours
              </SectionTitle>

              {pendingSubmissions.length > 0 ? (
                <>
                  {pendingSubmissions.slice(0, 3).map(sub => (
                    <Card key={sub.id} className="mb-2.5 border-l-4 border-l-[#D9A441]">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-sm text-[#1F1B2E] flex-1">{sub.challenge.titre}</h4>
                        <span className="text-xs font-black text-[#D9A441] flex-shrink-0">+{sub.challenge.points} pts</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Pill variant={CATEGORY_VARIANT[sub.challenge.categorie as ChallengeCategory]}>
                          {CATEGORY_LABELS[sub.challenge.categorie as ChallengeCategory]}
                        </Pill>
                        <span className="text-[10px] text-[#6b6b78]">⏳ En attente de validation</span>
                      </div>
                    </Card>
                  ))}
                  {pendingSubmissions.length > 3 && (
                    <p className="text-xs text-[#6b6b78] text-center mt-1 mb-2">
                      + {pendingSubmissions.length - 3} autre{pendingSubmissions.length - 3 > 1 ? 's' : ''} en cours
                    </p>
                  )}
                </>
              ) : (
                <Card className="text-center py-6 text-sm text-[#6b6b78] mb-3">
                  <div className="text-3xl mb-2">🎯</div>
                  <p className="font-semibold text-[#1F1B2E]">Aucune mission en attente</p>
                  <p className="text-xs mt-1 text-[#6b6b78]">Explore les défis pour avancer sur ta Route !</p>
                </Card>
              )}

              <Link href="/dashboard/gardien/missions" className="block w-full text-center bg-[#C62828] text-white font-bold text-sm py-3.5 rounded-xl mb-4 active:scale-95 transition">
                Voir toutes mes missions →
              </Link>
            </div>

            {/* Colonne droite */}
            <div>
              {/* Messages récents */}
              <SectionTitle action={
                <Link href="/dashboard/gardien/messages" className="text-xs text-[#C62828] font-semibold">Tout voir →</Link>
              }>
                Messages récents
              </SectionTitle>

              {activeConversations.length > 0 ? (
                activeConversations.slice(0, 4).map(conv => {
                  const lastMsg = conv.messages?.[0];
                  const displayName = convDisplayName(conv, user?.id);
                  const otherMember = conv.type === 'PRIVE' && user?.id
                    ? conv.members?.find(m => m.userId !== user.id)
                    : null;
                  const otherUser = otherMember?.user;
                  const gradient = CONV_GRADIENT[conv.type] ?? 'from-[#6A1B9A] to-[#3d1163]';
                  const preview = lastMsg?.contenu ?? '';
                  return (
                    <Link key={conv.id} href={`/dashboard/gardien/messages/${conv.id}`}>
                      <Card className="mb-2.5 flex items-center gap-3 hover:border-[#C62828]/30 transition">
                        {otherUser ? (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1F1B2E] to-[#3a1d4d] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {otherUser.nom[0]}{otherUser.prenoms[0]}
                          </div>
                        ) : (
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-lg flex-shrink-0`}>
                            {CONV_ICON[conv.type] ?? '💬'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-1">
                            <span className="font-semibold text-xs text-[#1F1B2E] truncate">{displayName}</span>
                            <span className="text-[10px] text-[#6b6b78] flex-shrink-0">{formatTime(conv.lastMessageAt)}</span>
                          </div>
                          <p className="text-[11px] text-[#6b6b78] truncate mt-0.5">{preview}</p>
                        </div>
                      </Card>
                    </Link>
                  );
                })
              ) : (
                <Card className="text-center py-6 mb-3">
                  <div className="text-3xl mb-2">💬</div>
                  <p className="font-semibold text-sm text-[#1F1B2E]">Aucune conversation</p>
                  <p className="text-xs text-[#6b6b78] mt-1">Tes échanges avec la communauté apparaîtront ici</p>
                </Card>
              )}

              <Link href="/dashboard/gardien/messages" className="block w-full text-center border border-[#C62828] text-[#C62828] font-bold text-sm py-3 rounded-xl mb-4 active:scale-95 transition">
                Ouvrir la messagerie →
              </Link>

              {/* Prochain camp */}
              {camp && (
                <>
                  <SectionTitle action={
                    <Link href="/dashboard/gardien/camps" className="text-xs text-[#C62828] font-semibold">Tous les camps →</Link>
                  }>
                    Mon prochain camp
                  </SectionTitle>
                  <CampCard camp={camp} href={`/dashboard/gardien/camps/${camp.id}`} />
                </>
              )}

              {!camp && (
                <>
                  <SectionTitle>Mon prochain camp</SectionTitle>
                  <Card className="text-center py-6">
                    <div className="text-3xl mb-2">⛺</div>
                    <p className="font-semibold text-sm text-[#1F1B2E]">Aucun camp ouvert</p>
                    <p className="text-xs text-[#6b6b78] mt-1">Les prochains camps apparaîtront ici</p>
                    <Link href="/dashboard/gardien/camps" className="inline-block mt-3 text-xs text-[#C62828] font-semibold">
                      Voir tous les camps →
                    </Link>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
