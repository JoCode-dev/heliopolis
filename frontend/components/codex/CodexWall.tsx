'use client';
import { useState, useCallback } from 'react';
import type { Submission } from '@/types';
import { codexApi } from '@/lib/api';
import { CodexItem } from '@/components/codex/CodexItem';

type Cat = 'TOUS' | 'PERSONNEL' | 'COMMUNAUTAIRE' | 'SPIRITUEL' | 'LONG';

const FILTERS: { key: Cat; label: string; icon: string; color: string }[] = [
  { key: 'TOUS',          label: 'Tous',          icon: '📜', color: 'bg-[#1F1B2E] text-white' },
  { key: 'PERSONNEL',     label: 'Personnel',     icon: '🔥', color: 'bg-[#C62828] text-white' },
  { key: 'COMMUNAUTAIRE', label: 'Communauté',   icon: '🌿', color: 'bg-[#2E7D32] text-white' },
  { key: 'SPIRITUEL',     label: 'Spirituel',     icon: '✨', color: 'bg-[#6A1B9A] text-white' },
  { key: 'LONG',          label: 'Défi long',     icon: '🏔️', color: 'bg-[#D9A441] text-white' },
];

export function CodexWall({ initialPosts }: { initialPosts: Submission[] }) {
  const [filter, setFilter]   = useState<Cat>('TOUS');
  const [reactions, setReactions] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const p of initialPosts) m[p.id] = p._count?.reactions ?? p.reactions?.length ?? 0;
    return m;
  });
  const [reacted, setReacted] = useState<Set<string>>(new Set());

  const filtered = filter === 'TOUS'
    ? initialPosts
    : initialPosts.filter(p => p.challenge?.categorie === filter);

  const handleReact = useCallback(async (id: string) => {
    if (reacted.has(id)) return;
    setReacted(prev => new Set(prev).add(id));
    setReactions(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    try {
      await codexApi.react(id);
    } catch {
      setReacted(prev => { const s = new Set(prev); s.delete(id); return s; });
      setReactions(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 1) - 1) }));
    }
  }, [reacted]);

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
        <EmptyState hasPosts={initialPosts.length > 0} />
      ) : (
        <div className="lg:columns-2 lg:gap-4">
          {filtered.map(sub => (
            <div key={sub.id} className="lg:break-inside-avoid">
              <CodexItem
                submission={sub}
                reactCount={reactions[sub.id] ?? 0}
                hasReacted={reacted.has(sub.id)}
                onReact={handleReact}
              />
            </div>
          ))}
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
