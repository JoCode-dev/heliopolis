import { codexApi } from '@/lib/api';
import type { Submission } from '@/types';
import { CodexAuthBanner } from '@/components/codex/CodexAuthBanner';
import { CodexHeaderBadge } from '@/components/codex/CodexHeaderBadge';
import { CodexWall } from '@/components/codex/CodexWall';

async function getWall(): Promise<Submission[]> {
  try {
    const { data } = await codexApi.wall(1);
    return data as Submission[];
  } catch {
    return [];
  }
}

export default async function CodexPage() {
  const posts = await getWall();

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-[#1F1B2E] to-[#2c1f4a] text-white px-4 pt-4 pb-5 flex-shrink-0">
        <div className="flex justify-between items-start mb-1">
          <div>
            <h1 className="text-xl font-black tracking-tight">🪶 Mur du Codex</h1>
            <p className="text-[11px] opacity-60 mt-0.5 uppercase tracking-widest">
              Les actions des Gardiens de la Création
            </p>
          </div>
          <CodexHeaderBadge />
        </div>
        {posts.length > 0 && (
          <p className="text-[11px] text-white/50 mt-2">
            {posts.length} publication{posts.length > 1 ? 's' : ''} validée{posts.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── Corps scrollable ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f5eed8]">
        <div className="px-3 pt-3">
          <CodexAuthBanner />
        </div>
        <CodexWall initialPosts={posts} />
      </div>
    </div>
  );
}
