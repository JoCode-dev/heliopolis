'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { usersApi, challengesApi, campsApi, messagingApi } from '@/lib/api';
import { getTerritoryLabel, ROLE_LABEL } from '@/lib/roles';
import { Progress } from '@/components/ui';
import { CampCard } from '@/components/camps/CampCard';
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

  // Guide : gardiens de la paroisse / Sentinelle : guides du district
  const [directReports, setDirectReports] = useState<User[]>([]);
  // Sentinelle uniquement : tous les gardiens du district
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

    // Sentinelle : charge aussi tous les gardiens du district
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

  // Stats adhésion sur les rapports directs
  const aJour    = directReports.filter(r => r.adhesions?.[0]?.statut === 'A_JOUR').length;
  const nonAJour = directReports.length - aJour;
  const adhesionPct = directReports.length > 0
    ? Math.round((aJour / directReports.length) * 100) : 0;

  // Stats gardiens (Sentinelle)
  const gardiensAJour = allGardiens.filter(g => g.adhesions?.[0]?.statut === 'A_JOUR').length;
  const gardiensNonAJour = allGardiens.length - gardiensAJour;
  const gardiensAdhPct = allGardiens.length > 0
    ? Math.round((gardiensAJour / allGardiens.length) * 100) : 0;

  const roleName  = user ? ROLE_LABEL[user.role] : 'Guide';
  const territory = getTerritoryLabel(user);
  const activeConvs = conversations.filter(c =>
    ((c as unknown as { _count?: { messages: number } })._count?.messages ?? 0) > 0 ||
    (c.messages?.length ?? 0) > 0
  );
  const quickStats = isSentinelle ? [
    { v: directReports.length, label: 'Guides',    color: '#6A1B9A' },
    { v: allGardiens.length,   label: 'Gardiens',  color: '#E55A35' },
    { v: camps.length,         label: 'Camps',     color: '#D9A441' },
    { v: pending.length,       label: 'À valider', color: pending.length > 0 ? '#E55A35' : '#6b6b78' },
  ] : [
    { v: directReports.length, label: 'Gardiens',  color: '#6A1B9A' },
    { v: aJour,                label: 'À jour',    color: '#2E7D32' },
    { v: camps.length,         label: 'Camps',     color: '#D9A441' },
    { v: pending.length,       label: 'À valider', color: pending.length > 0 ? '#E55A35' : '#6b6b78' },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] text-white px-4 pt-4 pb-5 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden relative">
            {user?.avatarUrl
              ? <Image src={user.avatarUrl} fill className="object-cover" alt="" sizes="44px" />
              : user ? `${user.nom[0]}${user.prenoms[0]}`.toUpperCase() : 'G'}
          </div>
          <div className="flex-1">
            <h1 className="text-base font-bold">{user?.prenoms} {user?.nom}</h1>
            <p className="text-xs opacity-80 mt-0.5">
              {isSentinelle ? '🛡️' : '📖'} {roleName} · {territory}
            </p>
          </div>
          {pending.length > 0 && (
            <Link href="/dashboard/guide/missions"
              className="flex items-center gap-1.5 bg-[#E55A35] text-white text-[11px] font-bold px-2.5 py-1.5 rounded-full">
              🎯 {pending.length} à valider
            </Link>
          )}
        </div>

        {/* Barre adhésion directReports */}
        {directReports.length > 0 && (
          <div className="bg-black/20 rounded-2xl px-4 py-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs opacity-80">
                {isSentinelle ? 'Adhésions Guides' : 'Adhésions Gardiens'} 2026
              </span>
              <span className="text-xs font-bold">
                {aJour} / {directReports.length} · {adhesionPct}%
              </span>
            </div>
            <Progress value={aJour} max={Math.max(directReports.length, 1)} />
            {nonAJour > 0 && (
              <p className="text-[10px] opacity-70 mt-1.5">
                ⚠️ {nonAJour} {isSentinelle ? 'guide' : 'gardien'}{nonAJour > 1 ? 's' : ''} non à jour
              </p>
            )}

            {/* Sentinelle : deuxième barre pour les gardiens */}
            {isSentinelle && allGardiens.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs opacity-80">Adhésions Gardiens 2026</span>
                  <span className="text-xs font-bold">
                    {gardiensAJour} / {allGardiens.length} · {gardiensAdhPct}%
                  </span>
                </div>
                <Progress value={gardiensAJour} max={Math.max(allGardiens.length, 1)} />
                {gardiensNonAJour > 0 && (
                  <p className="text-[10px] opacity-70 mt-1.5">
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

        {/* Stats rapides */}
        <div className={`px-4 pt-4 grid gap-2 ${isSentinelle ? 'grid-cols-4' : 'grid-cols-4'}`}>
          {quickStats.map(s => (
            <div key={s.label} className="bg-white rounded-xl p-2.5 border border-[#ececf0] text-center shadow-sm">
              <div className="text-xl font-black" style={{ color: s.color }}>{s.v}</div>
              <div className="text-[9px] text-[#6b6b78] uppercase tracking-wide leading-tight mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions rapides */}
        <div className="px-4 pt-3 grid grid-cols-3 gap-2">
          <Link href="/dashboard/guide/missions"
            className="bg-white rounded-xl p-3 border border-[#ececf0] shadow-sm flex flex-col items-center gap-1.5 active:scale-95 transition relative">
            {pending.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#E55A35] text-white text-[9px] font-black flex items-center justify-center">
                {pending.length}
              </span>
            )}
            <span className="text-2xl">🎯</span>
            <span className="text-[10px] font-semibold text-[#1F1B2E]">Valider</span>
          </Link>
          <Link href="/dashboard/guide/membres"
            className="bg-white rounded-xl p-3 border border-[#ececf0] shadow-sm flex flex-col items-center gap-1.5 active:scale-95 transition">
            <span className="text-2xl">{isSentinelle ? '🛡️' : '👥'}</span>
            <span className="text-[10px] font-semibold text-[#1F1B2E]">{isSentinelle ? 'Guides' : 'Membres'}</span>
          </Link>
          <Link href="/dashboard/guide/adhesions"
            className="bg-white rounded-xl p-3 border border-[#ececf0] shadow-sm flex flex-col items-center gap-1.5 active:scale-95 transition relative">
            {nonAJour > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#D9A441] text-white text-[9px] font-black flex items-center justify-center">
                {nonAJour}
              </span>
            )}
            <span className="text-2xl">📋</span>
            <span className="text-[10px] font-semibold text-[#1F1B2E]">Adhésions</span>
          </Link>
        </div>

        <div className="px-4 lg:px-8 pb-6">
          <div className="lg:grid lg:grid-cols-2 lg:gap-6">

            {/* ── Gauche : validations + camps ── */}
            <div>
              <div className="flex items-center justify-between mt-4 mb-2.5">
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
                <div className="bg-white rounded-2xl p-6 text-center border border-[#ececf0]">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-sm font-semibold text-[#1F1B2E]">Tout est validé !</p>
                  <p className="text-xs text-[#9b9ba8] mt-1">Aucune preuve en attente.</p>
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

              {/* Sentinelle : liste des guides avec leur état */}
              {isSentinelle && directReports.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2.5">
                    <h2 className="text-sm font-bold text-[#1F1B2E]">Mes Guides</h2>
                    <Link href="/dashboard/guide/membres" className="text-xs text-[#6A1B9A] font-semibold">
                      Tout voir →
                    </Link>
                  </div>
                  {directReports.slice(0, 4).map(guide => {
                    const adh = guide.adhesions?.[0];
                    return (
                      <div key={guide.id} className="bg-white rounded-xl border border-[#ececf0] px-3 py-2.5 mb-1.5 flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#3d1163] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {guide.nom[0]}{guide.prenoms[0]}
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
                          {adh?.statut === 'A_JOUR' ? '✓' : adh?.statut === 'EN_ATTENTE' ? '⏳' : '✕'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Camp */}
              {camps.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <h2 className="text-sm font-bold text-[#1F1B2E]">Camps ouverts</h2>
                    {camps.length > 1 && (
                      <Link href="/dashboard/guide/camps" className="text-xs text-[#6A1B9A] font-semibold">Tout voir →</Link>
                    )}
                  </div>
                  {camps.slice(0, 1).map(camp => (
                    <div key={camp.id} className="mb-3">
                      <CampCard camp={camp} href={`/dashboard/guide/camps/${camp.id}`} />
                      <Link href={`/dashboard/guide/selection/${camp.id}`}
                        className="block w-full text-center bg-[#6A1B9A] text-white font-bold text-sm py-2.5 rounded-b-2xl -mt-1 hover:bg-[#5a1280] transition">
                        Sélectionner les participants →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Droite : adhésions à régulariser + messages ── */}
            <div>
              {/* Membres à relancer */}
              {nonAJour > 0 && (
                <div className="mt-4 mb-2.5">
                  <div className="flex items-center justify-between mb-2.5">
                    <h2 className="text-sm font-bold text-[#1F1B2E]">
                      ⚠️ {isSentinelle ? 'Guides' : 'Gardiens'} à régulariser
                    </h2>
                    <Link href="/dashboard/guide/adhesions" className="text-xs text-[#D9A441] font-semibold">
                      Gérer →
                    </Link>
                  </div>
                  {directReports
                    .filter(r => r.adhesions?.[0]?.statut !== 'A_JOUR')
                    .slice(0, 4)
                    .map(r => (
                      <div key={r.id} className="bg-white rounded-xl border border-[#ececf0] px-3 py-2.5 mb-1.5 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#E55A35] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {r.nom[0]}{r.prenoms[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#1F1B2E] truncate">{r.prenoms} {r.nom}</p>
                          <p className="text-[10px] text-[#9b9ba8]">
                            {r.matricule ?? '—'}
                            {isSentinelle && r.parish?.nom ? ` · ${r.parish.nom}` : ''}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.adhesions?.[0]?.statut === 'EN_ATTENTE'
                            ? 'bg-[#fff8e6] text-[#9c7218]'
                            : 'bg-[#fff8f3] text-[#E55A35]'
                        }`}>
                          {r.adhesions?.[0]?.statut === 'EN_ATTENTE' ? 'En attente' : 'Non à jour'}
                        </span>
                      </div>
                    ))
                  }
                </div>
              )}

              {/* Messages */}
              <div className={nonAJour > 0 ? 'mt-2' : 'mt-4'}>
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-sm font-bold text-[#1F1B2E]">Messages récents</h2>
                  <Link href="/dashboard/guide/messages" className="text-xs text-[#6A1B9A] font-semibold">
                    Tout voir →
                  </Link>
                </div>

                {activeConvs.length > 0 ? activeConvs.slice(0, 4).map(conv => {
                  const lastMsg = conv.messages?.[0];
                  const gradient = CONV_GRADIENT[conv.type] ?? 'from-[#6A1B9A] to-[#3d1163]';
                  return (
                    <Link key={conv.id} href={`/dashboard/guide/messages/${conv.id}`}>
                      <div className="bg-white rounded-xl border border-[#ececf0] px-3 py-2.5 mb-1.5 flex items-center gap-2.5 hover:border-[#6A1B9A]/30 transition">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-base flex-shrink-0`}>
                          {CONV_ICON[conv.type] ?? '💬'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-1">
                            <span className="text-xs font-semibold text-[#1F1B2E] truncate">{conv.nom ?? 'Conversation'}</span>
                            <span className="text-[10px] text-[#9b9ba8] flex-shrink-0">{timeLabel(conv.lastMessageAt)}</span>
                          </div>
                          <p className="text-[11px] text-[#9b9ba8] truncate mt-0.5">{lastMsg?.contenu ?? ''}</p>
                        </div>
                      </div>
                    </Link>
                  );
                }) : (
                  <div className="bg-white rounded-xl border border-[#ececf0] p-5 text-center">
                    <p className="text-sm text-[#9b9ba8]">💬 Aucune conversation active</p>
                  </div>
                )}

                <Link href="/dashboard/guide/messages"
                  className="block w-full text-center border border-[#6A1B9A] text-[#6A1B9A] font-bold text-sm py-3 rounded-xl mt-2 active:scale-95 transition">
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
