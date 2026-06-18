'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { usersApi, challengesApi, campsApi, messagingApi } from '@/lib/api';
import { getTerritoryLabel, ROLE_LABEL } from '@/lib/roles';
import { useUnreadCounts } from '@/store/unreadCounts';
import { Progress } from '@/components/ui';
import { CampCard } from '@/components/camps/CampCard';
import { AnnoncesSection } from '@/components/annonces/AnnoncesSection';
import type { User, Camp, Submission, Conversation } from '@/types';

const CONV_GRADIENT: Record<string, string> = {
  COMMUNAUTE: 'from-[#FFB36B] to-[#7A2820]', REGION: 'from-[#FFB36B] to-[#7A2820]',
  DOYENNE: 'from-[#6A1B9A] to-[#3d1163]', PAROISSE: 'from-[#F58A4B] to-[#7A2820]',
  PRIVE: 'from-[#1F1B2E] to-[#3a1d4d]', GROUPE: 'from-[#2E7D32] to-[#1a5021]',
};
const CONV_ICON: Record<string, string> = {
  COMMUNAUTE: '🌍', REGION: '🗺️', DOYENNE: '🛡️', PAROISSE: '⛪', PRIVE: '🤝', GROUPE: '👥',
};
const CAT_EMOJI: Record<string, string> = {
  PERSONNEL: '🌿', COMMUNAUTAIRE: '🤝', SPIRITUEL: '🔥', LONG: '🏔️',
};

function timeLabel(d?: string | null) {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (diff === 0) return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diff === 1) return 'Hier';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function DashboardGuidePage() {
  const { user } = useAuthStore();
  const isSentinelle = user?.role === 'SENTINELLE';
  const campRequests   = useUnreadCounts(s => s.campRequests);
  const byCampRequests = useUnreadCounts(s => s.byCampRequests);

  const [directReports, setDirectReports] = useState<User[]>([]);
  const [allGardiens, setAllGardiens]     = useState<User[]>([]);
  const [camps, setCamps]                 = useState<Camp[]>([]);
  const [pending, setPending]             = useState<Submission[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    if (!user) return;

    const directParams: Record<string, string> = {
      role: isSentinelle ? 'GUIDE' : 'GARDIEN',
    };
    if (isSentinelle && user.district?.id) directParams.districtId = user.district.id;
    if (!isSentinelle && user.parish?.id)  directParams.parishId   = user.parish.id;

    const promises: Promise<unknown>[] = [
      usersApi.list(directParams),
      campsApi.list({ statut: 'OUVERT' }),
      challengesApi.pending(),
      messagingApi.conversations(),
    ];

    if (isSentinelle && user.district?.id) {
      promises.push(usersApi.list({ role: 'GARDIEN', districtId: user.district.id }));
    }

    Promise.all(promises).then(([u, c, p, conv, gRes]) => {
      setDirectReports((u as { data: User[] }).data);
      setCamps((c as { data: Camp[] }).data);
      setPending((p as { data: Submission[] }).data);
      setConversations((conv as { data: Conversation[] }).data);
      if (gRes) setAllGardiens((gRes as { data: User[] }).data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user, isSentinelle]);

  const aJour    = directReports.filter(r => r.adhesions?.[0]?.statut === 'A_JOUR').length;
  const nonAJour = directReports.length - aJour;
  const adhesionPct = directReports.length > 0
    ? Math.round((aJour / directReports.length) * 100) : 0;

  const gardiensAJour    = allGardiens.filter(g => g.adhesions?.[0]?.statut === 'A_JOUR').length;
  const gardiensNonAJour = allGardiens.length - gardiensAJour;
  const gardiensAdhPct   = allGardiens.length > 0
    ? Math.round((gardiensAJour / allGardiens.length) * 100) : 0;

  const pendingValidation = directReports.filter(r => r.statutProfil === 'EN_ATTENTE_VALIDATION').length;
  const actifs            = directReports.filter(r => r.statutProfil === 'ACTIF').length;

  const roleName  = user ? ROLE_LABEL[user.role] : 'Guide';
  const territory = getTerritoryLabel(user);

  const activeConvs = conversations.filter(c =>
    ((c as unknown as { _count?: { messages: number } })._count?.messages ?? 0) > 0 ||
    (c.messages?.length ?? 0) > 0
  );

  const kpis = isSentinelle ? [
    {
      label: 'Guides',
      value: directReports.length,
      sub: `${actifs} actifs dans le district`,
      icon: '📖',
      color: '#6A1B9A',
      bg: '#f5eeff',
      href: '/dashboard/guide/membres',
    },
    {
      label: 'Gardiens',
      value: allGardiens.length,
      sub: `${gardiensAJour} à jour · ${gardiensAdhPct}%`,
      icon: '🤝',
      color: '#E55A35',
      bg: '#fef3ef',
      href: '/dashboard/guide/membres',
    },
    {
      label: 'Camps',
      value: camps.length,
      sub: 'ouverts ou en cours',
      icon: '⛺',
      color: '#D9A441',
      bg: '#fdf8ec',
      href: '/dashboard/guide/camps',
    },
    {
      label: 'À valider',
      value: pending.length,
      sub: pending.length > 0 ? 'soumissions en attente' : 'tout est à jour',
      icon: '🎯',
      color: pending.length > 0 ? '#E55A35' : '#2E7D32',
      bg: pending.length > 0 ? '#fff4f2' : '#edf7ee',
      href: '/dashboard/guide/missions',
    },
  ] : [
    {
      label: 'Gardiens',
      value: directReports.length,
      sub: `${actifs} actifs`,
      icon: '🤝',
      color: '#E55A35',
      bg: '#fef3ef',
      href: '/dashboard/guide/membres',
    },
    {
      label: 'Adhésions',
      value: `${adhesionPct}%`,
      sub: `${aJour} à jour · ${nonAJour > 0 ? `${nonAJour} à régulariser` : 'tous à jour'}`,
      icon: '📋',
      color: aJour === directReports.length && directReports.length > 0 ? '#2E7D32' : '#D9A441',
      bg: aJour === directReports.length && directReports.length > 0 ? '#edf7ee' : '#fdf8ec',
      href: '/dashboard/guide/adhesions',
    },
    {
      label: 'Camps',
      value: camps.length,
      sub: 'ouverts ou en cours',
      icon: '⛺',
      color: '#D9A441',
      bg: '#fdf8ec',
      href: '/dashboard/guide/camps',
    },
    {
      label: 'À valider',
      value: pending.length + pendingValidation,
      sub: [
        pending.length > 0 ? `${pending.length} mission${pending.length > 1 ? 's' : ''}` : '',
        pendingValidation > 0 ? `${pendingValidation} ajout${pendingValidation > 1 ? 's' : ''}` : '',
      ].filter(Boolean).join(' · ') || 'tout est à jour',
      icon: '🎯',
      color: (pending.length + pendingValidation) > 0 ? '#E55A35' : '#2E7D32',
      bg: (pending.length + pendingValidation) > 0 ? '#fff4f2' : '#edf7ee',
      href: '/dashboard/guide/missions',
    },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] text-white px-4 pt-4 pb-5 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden relative">
            {user?.avatarUrl
              ? <Image src={user.avatarUrl} fill className="object-cover" alt="" sizes="48px" />
              : <span className="text-base font-black">{user ? `${user.nom?.[0] ?? ''}${user.prenoms?.[0] ?? ''}`.toUpperCase() : 'G'}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black truncate">{user?.prenoms} {user?.nom}</h1>
            <p className="text-[11px] opacity-75 mt-0.5 truncate">
              {isSentinelle ? '🛡️' : '📖'} {roleName} · {territory}
            </p>
          </div>
          {(pending.length + pendingValidation) > 0 && (
            <Link href="/dashboard/guide/missions"
              className="flex items-center gap-1 bg-white/20 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full border border-white/30 flex-shrink-0">
              🎯 {pending.length + pendingValidation}
            </Link>
          )}
        </div>

        {/* Barre(s) adhésion */}
        {directReports.length > 0 && (
          <div className="bg-black/20 rounded-2xl px-4 py-3 space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] opacity-80">
                  {isSentinelle ? 'Adhésions Guides' : 'Adhésions Gardiens'} 2026
                </span>
                <span className="text-[11px] font-bold">
                  {aJour} / {directReports.length} · {adhesionPct}%
                </span>
              </div>
              <Progress value={aJour} max={Math.max(directReports.length, 1)} />
              {nonAJour > 0 && (
                <p className="text-[10px] opacity-70 mt-1">
                  ⚠️ {nonAJour} {isSentinelle ? 'guide' : 'gardien'}{nonAJour > 1 ? 's' : ''} non à jour
                </p>
              )}
            </div>

            {isSentinelle && allGardiens.length > 0 && (
              <div className="pt-3 border-t border-white/20">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] opacity-80">Adhésions Gardiens 2026</span>
                  <span className="text-[11px] font-bold">
                    {gardiensAJour} / {allGardiens.length} · {gardiensAdhPct}%
                  </span>
                </div>
                <Progress value={gardiensAJour} max={Math.max(allGardiens.length, 1)} />
                {gardiensNonAJour > 0 && (
                  <p className="text-[10px] opacity-70 mt-1">
                    ⚠️ {gardiensNonAJour} gardien{gardiensNonAJour > 1 ? 's' : ''} non à jour
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Contenu ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f7f7fa]">

        <AnnoncesSection />

        {/* Alerte demandes camp */}
        {!loading && campRequests > 0 && (
          <Link href="/dashboard/guide/camps"
            className="mx-4 mt-4 flex items-center gap-3 bg-[#fffbef] border border-[#D9A441] rounded-2xl px-4 py-3 shadow-[0_0_12px_rgba(217,164,65,0.2)] active:scale-[.98] transition-transform">
            <div className="w-10 h-10 rounded-full bg-[#D9A441] flex items-center justify-center text-xl flex-shrink-0 animate-pulse">⏳</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-[#7a5800]">
                {campRequests} gardien{campRequests > 1 ? 's' : ''} en attente
              </p>
              <p className="text-[11px] text-[#9c7218] mt-0.5 truncate">
                {campRequests > 1 ? 'Ils souhaitent' : 'Il souhaite'} participer à un camp · Appuie pour traiter
              </p>
            </div>
            <span className="text-[#D9A441] text-xl font-black flex-shrink-0">›</span>
          </Link>
        )}

        {/* ── KPIs ── */}
        <div className="px-4 pt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map(kpi => (
            <Link key={kpi.label} href={kpi.href}
              className="bg-white border border-[#ececf0] rounded-2xl p-3.5 flex flex-col hover:border-[#E55A35]/30 hover:shadow-sm transition-all active:scale-[.97]">
              <div className="flex items-start justify-between mb-2.5">
                <span className="text-[9px] font-bold text-[#6b6b78] uppercase tracking-wider leading-tight">{kpi.label}</span>
                <span className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ml-1"
                  style={{ background: kpi.bg }}>{kpi.icon}</span>
              </div>
              <div className="text-2xl font-black leading-none" style={{ color: kpi.color }}>
                {loading ? <span className="text-[#ececf0]">—</span> : kpi.value}
              </div>
              <div className="text-[10px] text-[#6b6b78] mt-1.5 leading-tight">{kpi.sub}</div>
            </Link>
          ))}
        </div>

        {/* ── Corps principal ── */}
        <div className="px-4 lg:px-8 pb-8 mt-4">
          <div className="lg:grid lg:grid-cols-2 lg:gap-6">

            {/* ── Gauche ── */}
            <div>

              {/* À valider : missions */}
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-sm font-bold text-[#1F1B2E]">À valider</h2>
                {pending.length > 0 && (
                  <Link href="/dashboard/guide/missions" className="text-xs text-[#E55A35] font-semibold">
                    Tout voir ({pending.length}) →
                  </Link>
                )}
              </div>

              {loading && (
                <div className="bg-white rounded-2xl p-6 text-center text-[#9b9ba8] text-sm animate-pulse border border-[#ececf0]">Chargement…</div>
              )}

              {!loading && pending.length === 0 && (
                <div className="bg-white rounded-2xl p-5 text-center border border-[#ececf0] mb-4">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-sm font-semibold text-[#1F1B2E]">Tout est validé !</p>
                  <p className="text-xs text-[#9b9ba8] mt-0.5">Aucune preuve en attente.</p>
                </div>
              )}

              {pending.slice(0, 3).map(sub => {
                const g = sub.gardien;
                const parish = (sub as unknown as { gardien?: { parish?: { nom: string } } }).gardien?.parish;
                return (
                  <div key={sub.id} className="bg-white rounded-2xl border border-[#ececf0] mb-2.5 overflow-hidden shadow-sm">
                    <div className="px-3.5 pt-3.5 pb-2.5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#E55A35] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {g ? `${g.nom?.[0]}${g.prenoms?.[0]}`.toUpperCase() : '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#1F1B2E] truncate">{g?.prenoms} {g?.nom}</p>
                          <p className="text-[10px] text-[#9b9ba8]">
                            {g?.matricule ?? '—'}
                            {isSentinelle && parish && ` · ${parish.nom}`}
                          </p>
                        </div>
                        <span className="text-lg">{CAT_EMOJI[sub.challenge.categorie] ?? '🎯'}</span>
                      </div>
                      <p className="text-xs font-semibold text-[#1F1B2E] mb-1">{sub.challenge.titre}</p>
                      {sub.texte && <p className="text-[11px] text-[#6b6b78] line-clamp-2 italic">« {sub.texte} »</p>}
                    </div>
                    <div className="flex border-t border-[#f0f0f0]">
                      <Link href="/dashboard/guide/missions"
                        className="flex-1 py-2.5 text-center text-xs font-bold text-[#6A1B9A] hover:bg-[#f5f0ff] transition">
                        Voir détails
                      </Link>
                      <div className="w-px bg-[#f0f0f0]" />
                      <Link href="/dashboard/guide/missions"
                        className="flex-1 py-2.5 text-center text-xs font-bold text-[#E55A35] hover:bg-[#fff8f3] transition">
                        Valider →
                      </Link>
                    </div>
                  </div>
                );
              })}

              {pending.length > 3 && (
                <Link href="/dashboard/guide/missions"
                  className="block w-full text-center bg-[#6A1B9A] text-white font-bold text-sm py-3 rounded-xl mb-4 active:scale-95 transition">
                  + {pending.length - 3} autres soumissions →
                </Link>
              )}

              {/* Guides (Sentinelle) */}
              {isSentinelle && directReports.length > 0 && (
                <div className="mt-2 mb-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <h2 className="text-sm font-bold text-[#1F1B2E]">Mes Guides</h2>
                    <Link href="/dashboard/guide/membres" className="text-xs text-[#6A1B9A] font-semibold">
                      Tout voir →
                    </Link>
                  </div>
                  <div className="bg-white rounded-2xl border border-[#ececf0] overflow-hidden divide-y divide-[#f5f5f8]">
                    {directReports.slice(0, 5).map(guide => {
                      const adh = guide.adhesions?.[0];
                      return (
                        <div key={guide.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#3d1163] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {guide.nom?.[0] ?? ''}{guide.prenoms?.[0] ?? ''}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#1F1B2E] truncate">{guide.prenoms} {guide.nom}</p>
                            <p className="text-[10px] text-[#9b9ba8] truncate">{guide.parish?.nom ?? '—'}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                            adh?.statut === 'A_JOUR'     ? 'bg-[#e8f5e9] text-[#2E7D32]' :
                            adh?.statut === 'EN_ATTENTE' ? 'bg-[#fff8e6] text-[#9c7218]' :
                                                           'bg-[#fff8f3] text-[#E55A35]'
                          }`}>
                            {adh?.statut === 'A_JOUR' ? '✓ À jour' : adh?.statut === 'EN_ATTENTE' ? '⏳ En attente' : '✕ Non à jour'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Camps */}
              {camps.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h2 className="text-sm font-bold text-[#1F1B2E]">Camps ouverts</h2>
                    {camps.length > 1 && (
                      <Link href="/dashboard/guide/camps" className="text-xs text-[#6A1B9A] font-semibold">Tout voir →</Link>
                    )}
                  </div>
                  {camps.slice(0, 1).map(camp => {
                    const req = byCampRequests[camp.id] ?? 0;
                    return (
                      <div key={camp.id} className="mb-3">
                        <CampCard camp={camp} href={`/dashboard/guide/camps/${camp.id}`} pendingCount={req} />
                        <Link href={`/dashboard/guide/selection/${camp.id}`}
                          className={`block w-full text-center font-bold text-sm py-2.5 rounded-b-2xl -mt-1 transition ${
                            req > 0 ? 'bg-[#D9A441] text-white hover:bg-[#c49030]' : 'bg-[#6A1B9A] text-white hover:bg-[#5a1280]'
                          }`}>
                          {req > 0 ? `⏳ Traiter ${req} demande${req > 1 ? 's' : ''} →` : 'Sélectionner les participants →'}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Droite ── */}
            <div>

              {/* Adhésions à régulariser */}
              {nonAJour > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <h2 className="text-sm font-bold text-[#1F1B2E]">
                      ⚠️ {isSentinelle ? 'Guides' : 'Gardiens'} à régulariser
                    </h2>
                    <Link href="/dashboard/guide/adhesions" className="text-xs text-[#D9A441] font-semibold">Gérer →</Link>
                  </div>
                  <div className="bg-white rounded-2xl border border-[#ececf0] overflow-hidden divide-y divide-[#f5f5f8]">
                    {directReports
                      .filter(r => r.adhesions?.[0]?.statut !== 'A_JOUR')
                      .slice(0, 5)
                      .map(r => (
                        <div key={r.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#E55A35] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {r.nom?.[0] ?? ''}{r.prenoms?.[0] ?? ''}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#1F1B2E] truncate">{r.prenoms} {r.nom}</p>
                            <p className="text-[10px] text-[#9b9ba8]">
                              {r.matricule ?? '—'}
                              {isSentinelle && r.parish?.nom ? ` · ${r.parish.nom}` : ''}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                            r.adhesions?.[0]?.statut === 'EN_ATTENTE'
                              ? 'bg-[#fff8e6] text-[#9c7218]'
                              : 'bg-[#fff8f3] text-[#E55A35]'
                          }`}>
                            {r.adhesions?.[0]?.statut === 'EN_ATTENTE' ? 'En attente' : 'Non à jour'}
                          </span>
                        </div>
                      ))
                    }
                    {nonAJour > 5 && (
                      <Link href="/dashboard/guide/adhesions"
                        className="flex items-center justify-center py-2.5 text-xs font-semibold text-[#D9A441] hover:bg-[#fdf8ec] transition">
                        + {nonAJour - 5} autre{nonAJour - 5 > 1 ? 's' : ''} →
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-sm font-bold text-[#1F1B2E]">Messages récents</h2>
                  <Link href="/dashboard/guide/messages" className="text-xs text-[#6A1B9A] font-semibold">
                    Tout voir →
                  </Link>
                </div>

                {activeConvs.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-[#ececf0] overflow-hidden divide-y divide-[#f5f5f8]">
                    {activeConvs.slice(0, 4).map(conv => {
                      const lastMsg = conv.messages?.[0];
                      return (
                        <Link key={conv.id} href={`/dashboard/guide/messages/${conv.id}`}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-[#fafafa] transition">
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${CONV_GRADIENT[conv.type] ?? 'from-[#6A1B9A] to-[#3d1163]'} flex items-center justify-center text-base flex-shrink-0`}>
                            {CONV_ICON[conv.type] ?? '💬'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center gap-1">
                              <span className="text-xs font-semibold text-[#1F1B2E] truncate">{conv.nom ?? 'Conversation'}</span>
                              <span className="text-[10px] text-[#9b9ba8] flex-shrink-0">{timeLabel(conv.lastMessageAt)}</span>
                            </div>
                            <p className="text-[11px] text-[#9b9ba8] truncate mt-0.5">{lastMsg?.contenu ?? ''}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-[#ececf0] p-5 text-center">
                    <p className="text-sm text-[#9b9ba8]">💬 Aucune conversation active</p>
                  </div>
                )}

                <Link href="/dashboard/guide/messages"
                  className="block w-full text-center border border-[#6A1B9A] text-[#6A1B9A] font-bold text-sm py-3 rounded-xl mt-2.5 active:scale-95 transition hover:bg-[#f5eeff]">
                  Ouvrir la messagerie →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
