'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { badgesApi, challengesApi } from '@/lib/api';
import { Card, SectionTitle, Progress } from '@/components/ui';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { usePastoralYear } from '@/store/pastoralYear';
import type { UserBadge, Submission } from '@/types';

const BADGE_LEVEL_EMOJI: Record<string, string> = {
  BRONZE: '🪨', ARGENT: '🥈', OR: '🏅', LEGENDE: '⚜️',
};

export default function GardienProfilPage() {
  const { user } = useAuthStore();
  const annee = usePastoralYear(s => s.annee);
  const [myBadges, setMyBadges] = useState<UserBadge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [totalChallenges, setTotalChallenges] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      badgesApi.mine(),
      challengesApi.mySubmissions(),
      challengesApi.list(),
    ])
      .then(([badgesRes, submissionsRes, challengesRes]) => {
        setMyBadges((badgesRes.data as { badges: UserBadge[]; newlyAwarded: unknown[] }).badges ?? badgesRes.data);
        setSubmissions(submissionsRes.data);
        setTotalChallenges(challengesRes.data.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const validated = submissions.filter(s => s.statut === 'VALIDE').length;
  const total = Math.max(totalChallenges, validated, 1);
  const currentAdhesion = user?.adhesions?.find(a => a.annee === annee);
  const adhesionStatut = currentAdhesion?.statut;
  const recentBadges = myBadges.slice(0, 3);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] text-white px-4 pt-4 pb-4 flex-shrink-0">
        <h1 className="text-xl font-bold">Mon Profil</h1>
        <p className="text-xs opacity-85 mt-0.5">Gardien de la Création</p>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 bg-[#fafafa]">
        <div className="lg:max-w-2xl lg:mx-auto">
        {/* Card identité */}
        <Card className="mb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {user ? `${user.nom?.[0] ?? ''}${user.prenoms?.[0] ?? ''}`.toUpperCase() : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base text-[#1F1B2E]">{user?.prenoms} {user?.nom}</div>
              <div className="text-xs text-[#6b6b78] mt-0.5">🛡️ Gardien</div>
              {user?.parish?.nom && (
                <div className="text-xs text-[#6b6b78] mt-0.5">⛪ {user.parish.nom}</div>
              )}
            </div>
          </div>

          <div className="mt-3.5 pt-3.5 border-t border-[#ececf0] flex justify-between items-center">
            <div>
              <div className="text-[11px] text-[#6b6b78]">Matricule</div>
              <div className="font-bold tracking-widest text-sm text-[#1F1B2E]">{user?.matricule ?? '—'}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-[#6b6b78]">Adhésion {annee}</div>
              {adhesionStatut === 'A_JOUR'
                ? <span className="inline-flex items-center gap-1 bg-[#e8f5e9] text-[#2E7D32] text-[10px] font-bold px-2 py-0.5 rounded-full">✓ À jour</span>
                : adhesionStatut === 'EN_ATTENTE'
                  ? <span className="inline-flex items-center gap-1 bg-[#fff3cd] text-[#9c7218] text-[10px] font-bold px-2 py-0.5 rounded-full">⏳ En attente</span>
                  : <span className="inline-flex items-center gap-1 bg-[#ffeaea] text-[#E55A35] text-[10px] font-bold px-2 py-0.5 rounded-full">✗ Non à jour</span>
              }
            </div>
          </div>
        </Card>

        {/* Progression */}
        <SectionTitle>Progression</SectionTitle>
        <Card className="mb-4">
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="text-2xl font-black text-[#D9A441]">{validated} / {total}</div>
              <div className="text-xs text-[#6b6b78]">quêtes validés</div>
            </div>
            <div className="text-xs text-[#6b6b78]">
              {Math.round((validated / total) * 100)}%
            </div>
          </div>
          <Progress value={validated} max={total} />
        </Card>

        {/* Artefacts récents */}
        {!loading && recentBadges.length > 0 && (
          <>
            <SectionTitle>Artefacts récents</SectionTitle>
            <div className="flex gap-2.5 mb-3">
              {recentBadges.map(ub => (
                <div key={ub.badge.id} className="flex-1 bg-white border border-[#ececf0] rounded-2xl p-3 text-center">
                  <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-xl text-white shadow-md bg-gradient-to-br from-[#D9A441] to-[#b58530]">
                    {BADGE_LEVEL_EMOJI[ub.badge.niveau] ?? '🏅'}
                  </div>
                  <div className="text-[10px] font-semibold text-[#1F1B2E] leading-tight">{ub.badge.nom}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <Link
          href="/dashboard/gardien/artefacts"
          className="block w-full text-center bg-[#D9A441] text-white font-bold text-sm py-3.5 rounded-xl mb-4"
        >
          🏅 Voir tous mes artefacts
        </Link>

        {/* Déconnexion */}
        <LogoutButton className="block w-full text-center bg-white border border-[#e6e6ea] text-[#6b6b78] font-semibold text-sm py-3.5 rounded-xl">
          Se déconnecter
        </LogoutButton>
        </div>
      </div>
    </div>
  );
}
