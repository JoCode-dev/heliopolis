'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { codexApi } from '@/lib/api';
import { CodexWall } from '@/components/codex/CodexWall';
import { PhotothequeTab } from '@/components/phototheque/PhotothequeTab';
import type { Submission } from '@/types';

type Tab = 'phototheque' | 'codex';

export default function GardienCodexPage() {
  const [tab, setTab] = useState<Tab>('phototheque');
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
      <div className="bg-white border-b border-[#ececf0] px-4 pt-4 pb-0 flex-shrink-0">
        <h1 className="text-xl font-bold text-[#1F1B2E] mb-3">🪶 Mur du Codex</h1>
        <div className="flex">
          {([
            { value: 'phototheque', label: '📷 Photothèque' },
            { value: 'codex',       label: '🪶 Publications' },
          ] as { value: Tab; label: string }[]).map(t => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider relative ${
                tab === t.value ? 'text-[#1F1B2E]' : 'text-[#6b6b78]'
              }`}>
              {t.label}
              {tab === t.value && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#E55A35] rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === 'phototheque' && <PhotothequeTab canUpload={false} />}

      <div className={`flex-1 overflow-y-auto overflow-x-hidden bg-[#f5eed8] ${tab !== 'codex' ? 'hidden' : ''}`}>
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
