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
    const codexData = codexRes.data as { items: Submission[]; total: number };
    return {
      stats: statsRes.data as { totalGardiens: number; campsOuverts: number; defisValides: number; doyennes: number },
      camps: allCamps,
      recentPosts: (codexData.items ?? []).slice(0, 3),
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
            className="relative text-white overflow-hidden flex-shrink-0 h-[200px] lg:h-[280px]"
            style={{ background: 'linear-gradient(180deg,#FFB36B 0%,#F58A4B 38%,#E55A35 70%,#7A2820 100%)' }}
          >
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 72% 18%, rgba(255,240,180,.55) 0%, transparent 40%)' }} />
            <div className="absolute top-6 right-[14%] w-12 h-12 lg:w-18 lg:h-18 rounded-full"
              style={{ background: 'radial-gradient(circle, #FFF3D6, #FFE0A8)', boxShadow: '0 0 50px rgba(255,224,168,.8)' }} />
            <svg className="absolute bottom-0 left-0 right-0 w-full h-20 lg:h-32" viewBox="0 0 1440 96" preserveAspectRatio="none">
              <polygon points="0,96 200,35 380,65 560,18 740,52 920,28 1100,48 1280,22 1440,40 1440,96" fill="#7A2820" opacity=".7"/>
              <polygon points="0,96 160,60 340,75 520,44 700,68 900,50 1080,65 1260,48 1440,58 1440,96" fill="#3a0e0a" opacity=".9"/>
            </svg>

            {/* Mobile */}
            <div className="lg:hidden relative z-10 px-4 pt-4 flex items-center gap-2">
              <GardiensBlazon size={28} />
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
            <div className="lg:hidden relative z-10 absolute bottom-6 left-4 right-4">
              <h2 className="text-[20px] font-black leading-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,.4)' }}>
                À la quête de la<br />Nouvelle Lignée.
              </h2>
              <div className="flex gap-2 mt-2">
                <Link href="/camps"
                  className="bg-white/20 backdrop-blur-sm text-white font-bold text-[11px] px-3 py-1.5 rounded-lg border border-white/30">
                  ⛺ Camps
                </Link>
                <Link href="/rejoindre"
                  className="bg-[#C62828]/80 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg">
                  ✨ Rejoindre
                </Link>
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden lg:flex flex-col items-center justify-center h-full pb-8 relative z-10 px-8 text-center">
              {enCours.length > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-[#D9A441] text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow mb-3">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  {enCours.length} camp{enCours.length > 1 ? 's' : ''} en cours
                </span>
              )}
              <h2 className="text-4xl xl:text-5xl font-black leading-tight max-w-2xl"
                style={{ textShadow: '0 3px 16px rgba(0,0,0,.4)' }}>
                À la quête de la<br />Nouvelle Lignée.
              </h2>
              <p className="text-sm italic opacity-75 mt-2">Le camp est fini. La Route continue.</p>
              <div className="flex gap-3 mt-5">
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
            <div className="max-w-5xl mx-auto px-4 py-3 lg:py-6 lg:px-8">

              <HomeBanner />

              <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6">

                {/* ── Colonne principale ── */}
                <div className="space-y-4">

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2">
                    <StatCard icon="⛺" value={stats.campsOuverts} label="Camps"     color="#C62828" bg="from-[#C62828]/10 to-[#C62828]/5" />
                    <StatCard icon="🤝" value={stats.totalGardiens} label="Gardiens"  color="#6A1B9A" bg="from-[#6A1B9A]/10 to-[#6A1B9A]/5" />
                    <StatCard icon="🎯" value={stats.defisValides}  label="Défis"     color="#D9A441" bg="from-[#D9A441]/15 to-[#D9A441]/5" />
                    <StatCard icon="🛡️" value={stats.doyennes}      label="Doyennés"  color="#2E7D32" bg="from-[#2E7D32]/10 to-[#2E7D32]/5" />
                  </div>

                  {/* Camps */}
                  <section>
                    <SectionTitle action={
                      <Link href="/camps" className="text-xs text-[#C62828] font-semibold">Voir tous →</Link>
                    }>
                      {enCours.length > 0 ? 'Camp en cours' : 'Prochains camps'}
                    </SectionTitle>
                    {camps.length > 0 ? (
                      <>
                        <div className={camps.length > 1 ? 'lg:grid lg:grid-cols-2 lg:gap-3' : ''}>
                          {camps.slice(0, 2).map(c => <CampCard key={c.id} camp={c} />)}
                        </div>
                        {camps.length > 2 && (
                          <Link href="/camps"
                            className="block w-full text-center text-xs font-semibold text-[#6A1B9A] py-2 hover:underline">
                            + {camps.length - 2} autre{camps.length > 3 ? 's' : ''} camp{camps.length > 3 ? 's' : ''} →
                          </Link>
                        )}
                      </>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#d0d0d8] bg-white/60 px-4 py-8 text-center">
                        <div className="text-3xl mb-2">⛺</div>
                        <p className="text-sm font-semibold text-[#1F1B2E]">Aucun camp actif pour le moment</p>
                        <p className="text-xs text-[#6b6b78] mt-1">Les prochains camps apparaîtront ici.</p>
                        <Link href="/camps"
                          className="inline-block mt-3 text-xs font-semibold text-[#C62828] border border-[#C62828]/30 px-4 py-1.5 rounded-full hover:bg-[#C62828]/5 transition-colors">
                          Voir l&apos;agenda →
                        </Link>
                      </div>
                    )}
                  </section>

                  {/* Codex récent — mobile uniquement */}
                  {recentPosts.length > 0 && (
                    <section className="lg:hidden">
                      <SectionTitle action={
                        <Link href="/codex" className="text-xs text-[#6A1B9A] font-semibold">Tout voir →</Link>
                      }>
                        🪶 Mur du Codex
                      </SectionTitle>
                      <div className="space-y-2">
                        {recentPosts.map(post => <CodexPreviewCard key={post.id} post={post} />)}
                      </div>
                    </section>
                  )}
                </div>

                {/* ── Colonne droite — desktop ── */}
                <div className="space-y-4 mt-4 lg:mt-0">

                  {/* Codex desktop */}
                  <section className="hidden lg:block">
                    <SectionTitle action={
                      <Link href="/codex" className="text-xs text-[#6A1B9A] font-semibold">Tout voir →</Link>
                    }>
                      🪶 Mur du Codex
                    </SectionTitle>
                    {recentPosts.length > 0 ? (
                      <div className="space-y-2">
                        {recentPosts.map(post => <CodexPreviewCard key={post.id} post={post} />)}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#d0d0d8] bg-white/60 px-4 py-6 text-center">
                        <div className="text-2xl mb-1.5">🪶</div>
                        <p className="text-xs font-semibold text-[#1F1B2E]">Aucune publication</p>
                        <p className="text-[11px] text-[#6b6b78] mt-0.5">Les missions accomplies apparaîtront ici.</p>
                      </div>
                    )}
                  </section>

                  {/* L'Imaginaire */}
                  <section>
                    <SectionTitle>L&apos;imaginaire</SectionTitle>
                    <div className="rounded-2xl overflow-hidden border border-[#f0d98a] shadow-sm">
                      <div className="h-16 relative"
                        style={{ background: 'linear-gradient(135deg,#FFB36B,#F58A4B,#E55A35,#7A2820)' }}>
                        <div className="absolute inset-0 flex items-center px-4 gap-3">
                          <GardiensBlazon size={38} />
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
                  <section>
                    <div className="rounded-2xl px-4 py-4 text-white text-center"
                      style={{ background: 'linear-gradient(135deg,#1F1B2E 0%,#3a1d4d 100%)' }}>
                      <div className="text-[9px] tracking-[3px] opacity-50 uppercase mb-1">Communauté</div>
                      <div className="text-base font-black">Mahatma Gandhi</div>
                      <div className="text-[11px] opacity-60 mt-0.5">Région d&apos;Abidjan · Route en Joie 2026</div>
                      <div className="flex justify-center gap-3 mt-3">
                        <Link href="/camps" className="flex flex-col items-center gap-1 bg-white/10 rounded-xl px-3 py-2 hover:bg-white/20 transition-colors">
                          <span className="text-base">⛺</span>
                          <span className="text-[10px] font-semibold opacity-80">Camps</span>
                        </Link>
                        <Link href="/codex" className="flex flex-col items-center gap-1 bg-white/10 rounded-xl px-3 py-2 hover:bg-white/20 transition-colors">
                          <span className="text-base">🪶</span>
                          <span className="text-[10px] font-semibold opacity-80">Codex</span>
                        </Link>
                        <Link href="/rejoindre" className="flex flex-col items-center gap-1 bg-[#C62828]/70 rounded-xl px-3 py-2 hover:bg-[#C62828] transition-colors">
                          <span className="text-base">✨</span>
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
    <div className={`bg-gradient-to-br ${bg} rounded-xl p-2.5 border border-[#ececf0] text-center`}>
      <div className="text-xl font-black leading-none mb-0.5" style={{ color }}>{value}</div>
      <div className="text-[9px] text-[#6b6b78] uppercase tracking-wide font-semibold leading-tight">{label}</div>
      <div className="text-base mt-0.5">{icon}</div>
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
      className="flex items-center gap-3 bg-white rounded-2xl border border-[#ececf0] p-3 hover:border-[#d0d0d8] transition-colors">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
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
        {post.challenge?.titre && !post.texte && (
          <p className="text-[11px] text-[#6b6b78] truncate mt-0.5">🎯 {post.challenge.titre}</p>
        )}
      </div>
      {reactions > 0 && (
        <span className="text-[11px] text-[#6b6b78] flex-shrink-0">❤️ {reactions}</span>
      )}
    </Link>
  );
}
