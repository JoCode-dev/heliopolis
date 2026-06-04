'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { codexApi } from '@/lib/api';
import { CodexWall } from '@/components/codex/CodexWall';
import type { Submission } from '@/types';

export default function GardienCodexPage() {
  const [posts, setPosts]   = useState<Submission[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    codexApi.wall(1)
      .then(r => {
        const d = r.data as { items: Submission[]; total: number };
        setPosts(d.items);
        setTotal(d.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-gradient-to-br from-[#1F1B2E] to-[#2c1f4a] text-white px-4 pt-4 pb-4 flex-shrink-0">
        <h1 className="text-xl font-bold">Mur du Codex</h1>
        <p className="text-xs opacity-85 mt-0.5">Les actions des Gardiens de la Création</p>
        {!loading && total > 0 && (
          <p className="text-[11px] text-white/50 mt-1">
            {total} mission{total > 1 ? 's' : ''} accomplie{total > 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f5eed8]">
        <div className="px-3 pt-3 pb-1">
          <div className="flex gap-2 items-start bg-[#EDE7F6] border border-[#6A1B9A]/30 rounded-xl p-3 text-xs text-[#1F1B2E]">
            <span className="text-base flex-shrink-0">📜</span>
            <span>
              Soumets tes preuves depuis tes{' '}
              <Link href="/dashboard/gardien/missions" className="font-semibold text-[#6A1B9A] underline">
                Missions
              </Link>{' '}
              pour apparaître sur le Codex.
            </span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-[#6b6b78] text-sm">Chargement…</div>
        ) : (
          <CodexWall initialPosts={posts} initialTotal={total} />
        )}
      </div>
    </div>
  );
}
