import Link from 'next/link';
import { GardiensBlazon } from '@/components/layout/GardiensBlazon';
import { SectionTitle } from '@/components/ui';
import { CampCard } from '@/components/camps/CampCard';
import { SmartBottomNav } from '@/components/layout/SmartBottomNav';
import { HomeBanner } from '@/components/auth/HomeBanner';
import { PublicTopNav } from '@/components/layout/PublicTopNav';
import { territoriesApi, campsApi, codexApi } from '@/lib/api';
import type { Camp, Submission } from '@/types';

const STATUS_ORDER: Record<string, number> = { EN_COURS: 0, OUVERT: 1 };

async function getData() {
  try {
    const [statsRes, campsRes, codexRes] = await Promise.all([
      territoriesApi.stats(),
      campsApi.list(),
      codexApi.wall(1),
    ]);
    const allCamps = (campsRes.data as Camp[])
      .filter(c => ['EN_COURS', 'OUVERT'].includes(c.statut))
      .sort((a, b) => (STATUS_ORDER[a.statut] ?? 9) - (STATUS_ORDER[b.statut] ?? 9));
    return {
      stats: statsRes.data as { totalGardiens: number; campsOuverts: number; defisValides: number; doyennes: number },
      camps: allCamps,
      recentPosts: (codexRes.data as Submission[]).slice(0, 2),
    };
  } catch {
    return {
      stats: { totalGardiens: 0, campsOuverts: 0, defisValides: 0, doyennes: 0 },
      camps: [] as Camp[],
      recentPosts: [] as Submission[],
    };
  }
}

export default async function AccueilPage() {
  const { stats, camps, recentPosts } = await getData();
  const enCours = camps.filter(c => c.statut === 'EN_COURS');

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <PublicTopNav />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-col h-full">

          {/* ── Hero ── */}
          <div
            className="relative text-white overflow-hidden flex-shrink-0 h-[220px] lg:h-[300px]"
            style={{ background: 'linear-gradient(180deg,#FFB36B 0%,#F58A4B 38%,#E55A35 70%,#7A2820 100%)' }}
          >
            {/* Lumière solaire */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 72% 18%, rgba(255,240,180,.55) 0%, transparent 40%)' }} />

            {/* Soleil */}
            <div className="absolute top-8 right-[14%] w-14 h-14 lg:w-20 lg:h-20 rounded-full"
              style={{ background: 'radial-gradient(circle, #FFF3D6, #FFE0A8)', boxShadow: '0 0 50px rgba(255,224,168,.8)' }} />

            {/* Montagnes */}
            <svg className="absolute bottom-0 left-0 right-0 w-full h-24 lg:h-36" viewBox="0 0 1440 96" preserveAspectRatio="none">
              <polygon points="0,96 200,35 380,65 560,18 740,52 920,28 1100,48 1280,22 1440,40 1440,96" fill="#7A2820" opacity=".7"/>
              <polygon points="0,96 160,60 340,75 520,44 700,68 900,50 1080,65 1260,48 1440,58 1440,96" fill="#3a0e0a" opacity=".9"/>
            </svg>

            {/* Mobile : blason + badge en-cours */}
            <div className="lg:hidden relative z-10 px-4 pt-4 flex items-center gap-2">
              <GardiensBlazon size={32} />
              <div>
                <div className="text-[8px] tracking-[3px] opacity-70 uppercase">Route en Joie 2026</div>
                <div className="text-[11px] font-bold opacity-95">Codex des Gardiens</div>
              </div>
              {enCours.length > 0 && (
                <span className="ml-auto flex items-center gap-1 bg-[#D9A441] text-white text-[9px] font-bold px-2 py-1 rounded-full shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {enCours.length} en cours
                </span>
              )}
            </div>

            {/* Mobile tagline — en bas à gauche */}
            <div className="lg:hidden relative z-10 absolute bottom-7 left-4 right-4 mt-10">
              <h2 className="text-[22px] font-black leading-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,.4)' }}>
                À la quête de la<br />Nouvelle Lignée.
              </h2>
              <p className="text-[11px] italic opacity-80 mt-1">Le camp est fini. La Route continue.</p>
            </div>

            {/* Desktop tagline — centrée + grande */}
            <div className="hidden lg:flex flex-col items-center justify-center h-full pb-10 relative z-10 px-8 text-center">
              {enCours.length > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-[#D9A441] text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow mb-4">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  {enCours.length} camp{enCours.length > 1 ? 's' : ''} en cours
                </span>
              )}
              <h2 className="text-4xl xl:text-5xl font-black leading-tight max-w-2xl"
                style={{ textShadow: '0 3px 16px rgba(0,0,0,.4)' }}>
                À la quête de la<br />Nouvelle Lignée.
              </h2>
              <p className="text-sm italic opacity-75 mt-3">Le camp est fini. La Route continue.</p>
              <div className="flex gap-3 mt-6">
                <Link href="/camps"
                  className="bg-white text-[#1F1B2E] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-white/90 transition-colors shadow-md">
                  ⛺ Voir les camps
                </Link>
                <Link href="/rejoindre"
                  className="bg-[#C62828]/80 backdrop-blur-sm text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#C62828] transition-colors shadow-md">
                  ✨ Rejoindre
                </Link>
              </div>
            </div>
          </div>

          {/* ── Corps ── */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f6f6fa]">
            <div className="max-w-5xl mx-auto px-4 py-4 lg:py-8 lg:px-8">

              {/* Banner role-aware */}
              <HomeBanner />

              {/* Desktop : 2 colonnes */}
              <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-8">

                {/* Colonne principale */}
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <StatCard icon="⛺" value={stats.campsOuverts} label="Camps actifs"  color="#C62828" bg="from-[#C62828]/10 to-[#C62828]/5" />
                    <StatCard icon="🤝" value={stats.totalGardiens} label="Gardiens"      color="#6A1B9A" bg="from-[#6A1B9A]/10 to-[#6A1B9A]/5" />
                    <StatCard icon="🎯" value={stats.defisValides}  label="Défis validés" color="#D9A441" bg="from-[#D9A441]/15 to-[#D9A441]/5" />
                    <StatCard icon="🛡️" value={stats.doyennes}      label="Doyennés"      color="#2E7D32" bg="from-[#2E7D32]/10 to-[#2E7D32]/5" />
                  </div>

                  {/* Camps */}
                  {camps.length > 0 && (
                    <section>
                      <SectionTitle action={
                        <Link href="/camps" className="text-xs text-[#C62828] font-semibold">Voir tous →</Link>
                      }>
                        {enCours.length > 0 ? 'Camp en cours' : 'Prochain camp'}
                      </SectionTitle>
                      {camps.length === 1 ? (
                        <CampCard camp={camps[0]} />
                      ) : (
                        <div className="lg:grid lg:grid-cols-2 lg:gap-3">
                          {camps.slice(0, 2).map(c => <CampCard key={c.id} camp={c} />)}
                        </div>
                      )}
                      {camps.length > 2 && (
                        <Link href="/camps"
                          className="block w-full text-center text-xs font-semibold text-[#6A1B9A] py-2 hover:underline">
                          + {camps.length - 2} autre{camps.length > 3 ? 's' : ''} camp{camps.length > 3 ? 's' : ''} →
                        </Link>
                      )}
                    </section>
                  )}

                  {/* Codex récent — visible seulement mobile, sur desktop dans colonne droite */}
                  {recentPosts.length > 0 && (
                    <section className="lg:hidden">
                      <SectionTitle action={
                        <Link href="/codex" className="text-xs text-[#6A1B9A] font-semibold">Tout voir →</Link>
                      }>
                        🪶 Mur du Codex
                      </SectionTitle>
                      <div className="space-y-2.5">
                        {recentPosts.map(post => <CodexPreviewCard key={post.id} post={post} />)}
                      </div>
                    </section>
                  )}
                </div>

                {/* Colonne droite — desktop seulement */}
                <div className="space-y-4">
                  {/* Codex desktop */}
                  {recentPosts.length > 0 && (
                    <section className="hidden lg:block">
                      <SectionTitle action={
                        <Link href="/codex" className="text-xs text-[#6A1B9A] font-semibold">Tout voir →</Link>
                      }>
                        🪶 Mur du Codex
                      </SectionTitle>
                      <div className="space-y-2.5">
                        {recentPosts.map(post => <CodexPreviewCard key={post.id} post={post} />)}
                      </div>
                    </section>
                  )}

                  {/* L'Imaginaire */}
                  <section>
                    <SectionTitle>L&apos;imaginaire</SectionTitle>
                    <div className="rounded-2xl overflow-hidden border border-[#f0d98a] shadow-sm">
                      <div className="h-20 relative"
                        style={{ background: 'linear-gradient(135deg,#FFB36B,#F58A4B,#E55A35,#7A2820)' }}>
                        <div className="absolute inset-0 flex items-center px-4 gap-3">
                          <GardiensBlazon size={44} />
                          <div>
                            <p className="text-white font-black text-sm leading-tight">La Nouvelle Lignée</p>
                            <p className="text-white/70 text-[10px] mt-0.5">Héliopolis · Abay-Ka · Les cinq règnes</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-[#fffdf5] px-4 py-3">
                        <p className="text-xs text-[#6b6b78] leading-relaxed">
                          Les Gardiens de la Création veillent sur les artefacts sacrés d&apos;Héliopolis.
                          Chaque défi accompli renforce la lignée et préserve la Route.
                        </p>
                        <Link href="/codex" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C62828] mt-2">
                          Découvrir le Codex →
                        </Link>
                      </div>
                    </div>
                  </section>

                  {/* Communauté */}
                  <section className="pb-4">
                    <div className="rounded-2xl px-4 py-5 text-white text-center"
                      style={{ background: 'linear-gradient(135deg,#1F1B2E 0%,#3a1d4d 100%)' }}>
                      <div className="text-[9px] tracking-[3px] opacity-50 uppercase mb-1">Communauté</div>
                      <div className="text-lg font-black">Mahatma Gandhi</div>
                      <div className="text-[11px] opacity-60 mt-1">Région d&apos;Abidjan · Route en Joie 2026</div>
                      <div className="flex justify-center gap-4 mt-4">
                        <Link href="/camps" className="flex flex-col items-center gap-1 bg-white/10 rounded-xl px-4 py-2.5 hover:bg-white/20 transition-colors">
                          <span className="text-lg">⛺</span>
                          <span className="text-[10px] font-semibold opacity-80">Camps</span>
                        </Link>
                        <Link href="/codex" className="flex flex-col items-center gap-1 bg-white/10 rounded-xl px-4 py-2.5 hover:bg-white/20 transition-colors">
                          <span className="text-lg">🪶</span>
                          <span className="text-[10px] font-semibold opacity-80">Codex</span>
                        </Link>
                        <Link href="/rejoindre" className="flex flex-col items-center gap-1 bg-[#C62828]/70 rounded-xl px-4 py-2.5 hover:bg-[#C62828] transition-colors">
                          <span className="text-lg">✨</span>
                          <span className="text-[10px] font-semibold">Rejoindre</span>
                        </Link>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <div className="lg:hidden flex-shrink-0">
        <SmartBottomNav />
      </div>
    </div>
  );
}

/* ── Composants locaux ── */

function StatCard({ icon, value, label, color, bg }: {
  icon: string; value: number; label: string; color: string; bg: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${bg} rounded-2xl p-3.5 border border-[#ececf0]`}>
      <div className="flex items-start justify-between mb-1">
        <div className="text-2xl font-black leading-none" style={{ color }}>{value}</div>
        <span className="text-lg leading-none">{icon}</span>
      </div>
      <div className="text-[10px] text-[#6b6b78] uppercase tracking-wide font-semibold">{label}</div>
    </div>
  );
}

function CodexPreviewCard({ post }: { post: Submission }) {
  const g = post.gardien;
  const cat = post.challenge?.categorie ?? 'COMMUNAUTAIRE';
  const CAT_COLOR: Record<string, string> = {
    PERSONNEL: '#C62828', COMMUNAUTAIRE: '#2E7D32', SPIRITUEL: '#6A1B9A', LONG: '#D9A441',
  };
  const CAT_ICON: Record<string, string> = {
    PERSONNEL: '🔥', COMMUNAUTAIRE: '🌿', SPIRITUEL: '✨', LONG: '🏔️',
  };
  const reactions = post._count?.reactions ?? post.reactions?.length ?? 0;

  return (
    <Link href="/codex"
      className="flex items-center gap-3 bg-white rounded-2xl border border-[#ececf0] p-3.5 hover:border-[#d0d0d8] transition-colors">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${CAT_COLOR[cat]}, ${CAT_COLOR[cat]}99)` }}>
        {g ? `${g.nom?.[0] ?? ''}${g.prenoms?.[0] ?? ''}`.toUpperCase() : '🪶'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-xs text-[#1F1B2E] truncate">
          {g?.prenoms} {g?.nom}
          <span className="ml-1.5 text-[10px] font-normal text-[#6b6b78]">{CAT_ICON[cat]}</span>
        </div>
        {post.texte && (
          <p className="text-[11px] text-[#6b6b78] truncate mt-0.5 italic">« {post.texte} »</p>
        )}
      </div>
      {reactions > 0 && (
        <span className="text-[11px] text-[#6b6b78] flex-shrink-0">❤️ {reactions}</span>
      )}
    </Link>
  );
}
