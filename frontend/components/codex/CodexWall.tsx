'use client';
import { useState, useCallback } from 'react';
import type { Submission } from '@/types';
import { codexApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { CodexItem } from '@/components/codex/CodexItem';

type Cat = 'TOUS' | 'PERSONNEL' | 'COMMUNAUTAIRE' | 'SPIRITUEL' | 'LONG';

const FILTERS: { key: Cat; label: string; icon: string; color: string }[] = [
  { key: 'TOUS',          label: 'Tous',          icon: '📜', color: 'bg-[#1F1B2E] text-white' },
  { key: 'PERSONNEL',     label: 'Personnel',     icon: '🔥', color: 'bg-[#C62828] text-white' },
  { key: 'COMMUNAUTAIRE', label: 'Communauté',   icon: '🌿', color: 'bg-[#2E7D32] text-white' },
  { key: 'SPIRITUEL',     label: 'Spirituel',     icon: '✨', color: 'bg-[#6A1B9A] text-white' },
  { key: 'LONG',          label: 'Défi long',     icon: '🏔️', color: 'bg-[#D9A441] text-white' },
];

interface CodexWallProps {
  initialPosts: Submission[];
  initialTotal: number;
}

export function CodexWall({ initialPosts, initialTotal }: CodexWallProps) {
  const { user } = useAuthStore();
  const canReact = !!user;

  const [filter, setFilter]         = useState<Cat>('TOUS');
  const [posts, setPosts]           = useState<Submission[]>(initialPosts);
  const [total, setTotal]           = useState(initialTotal);
  const [page, setPage]             = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [reactions, setReactions] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const p of initialPosts) m[p.id] = p._count?.reactions ?? p.reactions?.length ?? 0;
    return m;
  });
  const [reacted, setReacted] = useState<Set<string>>(new Set());

  const hasMore = posts.length < total;

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { data } = await codexApi.wall(page + 1);
      const newItems = (data as { items: Submission[]; total: number }).items;
      setPosts(prev => [...prev, ...newItems]);
      setTotal((data as { items: Submission[]; total: number }).total);
      setPage(p => p + 1);
      setReactions(prev => {
        const m = { ...prev };
        for (const p of newItems) m[p.id] = p._count?.reactions ?? p.reactions?.length ?? 0;
        return m;
      });
    } catch { /* ignore */ } finally {
      setLoadingMore(false);
    }
  };

  const handleReact = useCallback(async (id: string) => {
    setReacted(prev => new Set(prev).add(id));
    setReactions(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    try {
      await codexApi.react(id);
    } catch {
      setReacted(prev => { const s = new Set(prev); s.delete(id); return s; });
      setReactions(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 1) - 1) }));
    }
  }, []);

  const handleUnreact = useCallback(async (id: string) => {
    setReacted(prev => { const s = new Set(prev); s.delete(id); return s; });
    setReactions(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 1) - 1) }));
    try {
      await codexApi.unreact(id);
    } catch {
      setReacted(prev => new Set(prev).add(id));
      setReactions(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    }
  }, []);

  const filtered = filter === 'TOUS'
    ? posts
    : posts.filter(p => p.challenge?.categorie === filter);

  return (
    <div className="max-w-5xl mx-auto px-3 pb-6">
      {/* Filtres */}
      <div className="flex gap-2 overflow-x-auto pb-3 pt-1" style={{ scrollbarWidth: 'none' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
              filter === f.key
                ? f.color + ' shadow-sm scale-[1.03]'
                : 'bg-white/70 text-[#1F1B2E] border border-[#e0d8c0]'
            }`}
          >
            <span>{f.icon}</span>{f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <EmptyState hasPosts={posts.length > 0} />
      ) : (
        <div className="lg:columns-2 lg:gap-4">
          {filtered.map((sub, i) => (
            <div key={sub.id} className="lg:break-inside-avoid">
              <CodexItem
                submission={sub}
                reactCount={reactions[sub.id] ?? 0}
                hasReacted={reacted.has(sub.id)}
                priority={i === 0}
                canReact={canReact}
                onReact={handleReact}
                onUnreact={handleUnreact}
              />
            </div>
          ))}
        </div>
      )}

      {/* Charger plus */}
      {hasMore && (
        <div className="flex flex-col items-center gap-2 mt-4">
          <p className="text-[11px] text-[#8b7b5c]">
            {posts.length} / {total} missions affichées
          </p>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-2.5 rounded-full bg-[#1F1B2E] text-white text-sm font-bold hover:bg-[#2c2840] disabled:opacity-50 transition-all"
          >
            {loadingMore ? 'Chargement…' : 'Charger plus'}
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasPosts }: { hasPosts: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-20 h-20 rounded-full bg-white/60 border border-[#e0d8c0] flex items-center justify-center text-4xl mb-4 shadow-sm">
        🪶
      </div>
      <p className="font-bold text-[#1F1B2E] text-sm">
        {hasPosts ? 'Aucune action dans cette catégorie' : 'Aucune publication pour le moment'}
      </p>
      <p className="text-xs text-[#8b7b5c] mt-1.5 leading-relaxed max-w-xs">
        {hasPosts
          ? 'Essaie un autre filtre pour découvrir les actions des Gardiens.'
          : 'Les premières actions des Gardiens de la Création apparaîtront ici.'}
      </p>
    </div>
  );
}
