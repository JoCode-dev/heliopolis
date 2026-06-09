import Link from 'next/link';
import { GardiensBlazon } from '@/components/layout/GardiensBlazon';
import { HomeBanner } from '@/components/auth/HomeBanner';
import { HeroSection } from '@/components/landing/HeroSection';
import { PublicTopNav } from '@/components/layout/PublicTopNav';
import { SmartBottomNav } from '@/components/layout/SmartBottomNav';
import { territoriesApi, codexApi } from '@/lib/api';
import type { Submission } from '@/types';

/* ── Règnes de l'imaginaire ────────────────────────────────────────────────── */
const REGNES = [
  {
    key: 'EAU',
    nom: 'Eau',
    icon: '🌊',
    couleur: '#0D47A1',
    bg: 'from-[#0D47A1] to-[#1565C0]',
    glow: 'rgba(13,71,161,.35)',
    desc: 'Les mystères des profondeurs. La mémoire fluide qui traverse les générations.',
  },
  {
    key: 'TERRE',
    nom: 'Terre',
    icon: '🌿',
    couleur: '#2E7D32',
    bg: 'from-[#1B5E20] to-[#2E7D32]',
    glow: 'rgba(46,125,50,.35)',
    desc: 'L\'ancrage des racines. La sagesse des ancêtres gravée dans la pierre.',
  },
  {
    key: 'AIR',
    nom: 'Air',
    icon: '💨',
    couleur: '#37474F',
    bg: 'from-[#263238] to-[#455A64]',
    glow: 'rgba(69,90,100,.35)',
    desc: 'La parole transmise. Le souffle qui porte la voix d\'Héliopolis au-delà des frontières.',
  },
  {
    key: 'FEU',
    nom: 'Feu',
    icon: '🔥',
    couleur: '#C62828',
    bg: 'from-[#7A2820] to-[#C62828]',
    glow: 'rgba(198,40,40,.35)',
    desc: 'La force du gardien. Le courage inextinguible qui forge les âmes de la lignée.',
  },
  {
    key: 'ESPRIT',
    nom: 'Esprit',
    icon: '✨',
    couleur: '#6A1B9A',
    bg: 'from-[#4A148C] to-[#6A1B9A]',
    glow: 'rgba(106,27,154,.35)',
    desc: 'La connexion à l\'invisible. L\'essence divine qui unit les gardiens d\'Héliopolis.',
  },
] as const;

async function getData() {
  try {
    const [statsRes, parishesRes, codexRes] = await Promise.all([
      territoriesApi.stats(),
      territoriesApi.parishes(),
      codexApi.wall(1),
    ]);
    const codexData = codexRes.data as { items: Submission[]; total: number };
    return {
      stats: statsRes.data as { totalGardiens: number; campsOuverts: number; defisValides: number; districts: number },
      parishes: (parishesRes.data as Parish[]).slice(0, 8),
      recentPosts: (codexData.items ?? []).slice(0, 6),
    };
  } catch {
    return {
      stats: { totalGardiens: 0, campsOuverts: 0, defisValides: 0, districts: 0 },
      parishes: [] as Parish[],
      recentPosts: [] as Submission[],
    };
  }
}

interface Parish {
  id: string;
  nom: string;
  district?: { nom: string } | null;
  guide?: { prenoms: string | null; nom: string | null; avatarUrl?: string | null } | null;
}

export default async function AccueilPage() {
  const { stats, parishes, recentPosts } = await getData();

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f6fa]">
      <PublicTopNav />

      <main className="flex-1 flex flex-col">

        {/* ── Hero ── */}
        <HeroSection />

        {/* ── Corps ── */}
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 lg:py-10 lg:px-8 space-y-10">

          {/* Bannière utilisateur connecté uniquement */}
          <HomeBanner />

          {/* ── Stats ── */}
          <section>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <StatCard
                icon="🛡️"
                value={stats.totalGardiens}
                label="Gardiens"
                sublabel="de la Création"
                color="#C62828"
                bg="from-[#C62828]/12 via-[#C62828]/6 to-transparent"
                border="border-[#C62828]/25"
                href="/activation"
              />
              <StatCard
                icon="🎯"
                value={stats.defisValides}
                label="Défis"
                sublabel="accomplis"
                color="#D9A441"
                bg="from-[#D9A441]/15 via-[#D9A441]/6 to-transparent"
                border="border-[#D9A441]/30"
                href="/codex"
              />
              <StatCard
                icon="🏛️"
                value={stats.districts}
                label="Districts"
                sublabel="d'Héliopolis"
                color="#6A1B9A"
                bg="from-[#6A1B9A]/12 via-[#6A1B9A]/6 to-transparent"
                border="border-[#6A1B9A]/25"
                href="/codex"
              />
              <StatCard
                icon="⛺"
                value={stats.campsOuverts}
                label="Camps"
                sublabel="actifs"
                color="#2E7D32"
                bg="from-[#2E7D32]/12 via-[#2E7D32]/6 to-transparent"
                border="border-[#2E7D32]/25"
                href="/codex"
              />
            </div>
          </section>

          {/* ── L'Imaginaire ── */}
          <section>
            <SectionLabel>L&apos;Imaginaire</SectionLabel>
            <p className="text-sm text-[#6b6b78] leading-relaxed mb-5 max-w-2xl">
              Héliopolis repose sur cinq règnes fondateurs. Chaque règne représente une force
              de la nature et une vertu du gardien. Les défis, badges et artefacts du Codex
              s&apos;inscrivent dans l&apos;un de ces règnes — forgeant ainsi l&apos;identité de chaque lignée.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {REGNES.map((r) => (
                <Link
                  key={r.key}
                  href="/codex"
                  className="group relative rounded-2xl overflow-hidden border border-white/10 hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
                  style={{ boxShadow: `0 4px 24px ${r.glow}` }}
                >
                  <div className={`bg-gradient-to-br ${r.bg} p-5`}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl drop-shadow-lg">{r.icon}</span>
                      <div>
                        <div className="text-[10px] tracking-[3px] text-white/50 uppercase font-semibold">Règne</div>
                        <div className="text-white font-black text-lg leading-tight">{r.nom}</div>
                      </div>
                    </div>
                    <p className="text-white/75 text-xs leading-relaxed">{r.desc}</p>
                    <div className="mt-4 flex items-center gap-1 text-white/55 text-[11px] font-semibold group-hover:text-white/80 transition-colors">
                      Explorer le Codex
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Carte synopsis */}
              <Link
                href="/codex"
                className="group rounded-2xl border-2 border-dashed border-[#e0d9f5] bg-[#faf8ff] hover:bg-[#f3eeff] hover:-translate-y-1 transition-all duration-300 p-5 flex flex-col items-center justify-center text-center"
              >
                <GardiensBlazon size={52} className="mb-3 opacity-80" />
                <p className="text-sm font-bold text-[#1F1B2E]">Le Codex des Gardiens</p>
                <p className="text-xs text-[#6b6b78] mt-1 leading-relaxed">
                  Découvrez les missions accomplies et les artefacts de la lignée.
                </p>
                <span className="mt-3 text-[11px] font-semibold text-[#6A1B9A] group-hover:underline">
                  Accéder au Codex →
                </span>
              </Link>
            </div>
          </section>

          {/* ── Guides & Sentinelles ── */}
          {parishes.length > 0 && (
            <section>
              <SectionLabel>Guides &amp; Sentinelles</SectionLabel>
              <p className="text-sm text-[#6b6b78] leading-relaxed mb-5 max-w-2xl">
                Les guides accompagnent chaque paroisse dans sa croissance. Les sentinelles
                veillent sur les districts. Ensemble, ils gardent vivante la flamme d&apos;Héliopolis.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {parishes.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-[#ececf0] p-4 hover:border-[#d0d0d8] hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-base font-black"
                        style={{ background: 'linear-gradient(135deg,#6A1B9A,#4A148C)' }}
                      >
                        {p.guide ? (
                          `${p.guide.prenoms?.[0] ?? ''}${p.guide.nom?.[0] ?? ''}`.toUpperCase() || '⛪'
                        ) : '⛪'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#1F1B2E] truncate">{p.nom}</div>
                        {p.district && (
                          <div className="text-[10px] text-[#9b9ba8] truncate">
                            🛡️ {p.district.nom}
                          </div>
                        )}
                      </div>
                    </div>
                    {p.guide ? (
                      <div className="text-xs text-[#6b6b78]">
                        <span className="text-[10px] font-bold text-[#6A1B9A] uppercase tracking-wide">Guide</span>
                        <div className="font-semibold text-[#1F1B2E] mt-0.5">
                          {p.guide.prenoms} {p.guide.nom}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#b0b0be] italic">Paroisse sans guide assigné</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Photothèque ── */}
          <section>
            <SectionLabel>Photothèque</SectionLabel>
            <p className="text-sm text-[#6b6b78] leading-relaxed mb-5 max-w-2xl">
              Les souvenirs des camps et rassemblements, immortalisés par la communauté.
            </p>
            {recentPosts.some(p => p.preuveUrl) ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {recentPosts.filter(p => p.preuveUrl).map((post) => (
                  <Link
                    key={post.id}
                    href="/codex"
                    className="group aspect-square rounded-2xl overflow-hidden border border-[#ececf0] hover:border-[#d0d0d8] hover:shadow-lg transition-all duration-200 relative"
                  >
                    <img
                      src={post.preuveUrl!}
                      alt="Preuve de défi"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <span className="text-white text-[11px] font-semibold truncate">
                        {post.challenge?.titre ?? 'Mission accomplie'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-[#e0e0ea] bg-white p-10 text-center">
                <div className="text-5xl mb-4">📸</div>
                <p className="font-bold text-[#1F1B2E] text-sm">La photothèque s&apos;enrichit bientôt</p>
                <p className="text-xs text-[#6b6b78] mt-2 max-w-xs mx-auto leading-relaxed">
                  Les photos des camps et des défis accomplis seront ici pour immortaliser
                  les moments forts de la lignée.
                </p>
              </div>
            )}
          </section>

          {/* ── Mur du Codex ── */}
          {recentPosts.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <SectionLabel className="mb-0">🪶 Mur du Codex</SectionLabel>
                <Link href="/codex" className="text-xs font-semibold text-[#6A1B9A] hover:underline">
                  Tout voir →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentPosts.slice(0, 6).map(post => (
                  <CodexCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}

          {/* ── Pied de page ── */}
          <footer className="border-t border-[#e6e6ea] pt-6 pb-4 text-center text-[11px] text-[#9b9ba8]">
            <GardiensBlazon size={28} className="mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-[#6b6b78]">Gardiens de la Création · Héliopolis</p>
            <p className="mt-1 opacity-70">Région d&apos;Abidjan — Communauté Mahatma Gandhi</p>
            <Link href="/activation" className="inline-block mt-3 text-xs font-bold text-[#C62828] hover:underline">
              Activer mon profil →
            </Link>
          </footer>
        </div>
      </main>

      <div className="lg:hidden flex-shrink-0">
        <SmartBottomNav />
      </div>
    </div>
  );
}

/* ── Composants locaux ─────────────────────────────────────────────────────── */

function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-[10px] tracking-[3px] uppercase font-bold text-[#9b9ba8] mb-4 ${className}`}>
      {children}
    </h2>
  );
}

function StatCard({
  icon, value, label, sublabel, color, bg, border, href,
}: {
  icon: string; value: number; label: string; sublabel: string;
  color: string; bg: string; border: string; href: string;
}) {
  return (
    <Link
      href={href}
      className={`group bg-gradient-to-br ${bg} rounded-2xl border ${border} p-4 lg:p-5 text-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer`}
    >
      <div className="text-3xl lg:text-4xl font-black mb-1" style={{ color }}>
        {value.toLocaleString('fr-FR')}
      </div>
      <div className="text-sm font-bold text-[#1F1B2E]">{label}</div>
      <div className="text-[10px] text-[#9b9ba8] mt-0.5 uppercase tracking-wide">{sublabel}</div>
      <div className="text-2xl mt-2">{icon}</div>
    </Link>
  );
}

function CodexCard({ post }: { post: Submission }) {
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
    <Link
      href="/codex"
      className="group flex items-start gap-3 bg-white rounded-2xl border border-[#ececf0] p-4 hover:border-[#d0d0d8] hover:shadow-md transition-all duration-200"
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 group-hover:scale-105 transition-transform"
        style={{ background: `linear-gradient(135deg, ${CAT_COLOR[cat]}, ${CAT_COLOR[cat]}bb)` }}
      >
        {g
          ? `${g.nom?.[0] ?? ''}${g.prenoms?.[0] ?? ''}`.toUpperCase() || CAT_ICON[cat]
          : CAT_ICON[cat]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-[#1F1B2E] truncate">
          {g ? `${g.prenoms} ${g.nom}` : 'Gardien anonyme'}
          <span className="ml-1.5 text-[11px] font-normal text-[#9b9ba8]">{CAT_ICON[cat]}</span>
        </div>
        {post.texte && (
          <p className="text-xs text-[#6b6b78] mt-1 line-clamp-2 italic">« {post.texte} »</p>
        )}
        {post.challenge?.titre && !post.texte && (
          <p className="text-xs text-[#6b6b78] mt-1 truncate">🎯 {post.challenge.titre}</p>
        )}
        {reactions > 0 && (
          <span className="text-[10px] text-[#9b9ba8] mt-1 inline-block">❤️ {reactions}</span>
        )}
      </div>
    </Link>
  );
}
