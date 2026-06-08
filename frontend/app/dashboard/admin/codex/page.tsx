'use client';
import { useEffect, useState, useCallback } from 'react';
import { codexApi } from '@/lib/api';
import { Card, Pill } from '@/components/ui';
import { CodexItem } from '@/components/codex/CodexItem';
import { useCodexReactions } from '@/hooks/useCodexReactions';
import { useAuthStore } from '@/store/auth';
import type { Submission } from '@/types';

type Tab = 'attente' | 'publies';

export default function AdminCodexPage() {
  const { user } = useAuthStore();
  const currentUserId = user?.id;
  const [tab, setTab] = useState<Tab>('publies');
  const [pending, setPending] = useState<Submission[]>([]);
  const [wall, setWall] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    reactions,
    reacted,
    reactionPending,
    syncSubmissions,
    handleReact,
    handleUnreact,
  } = useCodexReactions(currentUserId);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.allSettled([codexApi.pending(), codexApi.wall(1)])
      .then(([p, w]) => {
        if (p.status === 'fulfilled') setPending(p.value.data ?? []);
        if (w.status === 'fulfilled') {
          const d = w.value.data as { items: Submission[]; total: number };
          const items: Submission[] = d.items ?? w.value.data ?? [];
          setWall(items);
          syncSubmissions(items, { replace: true });
        }
      })
      .finally(() => setLoading(false));
  }, [syncSubmissions]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) reload();
    };

    void Promise.resolve().then(run);
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const handleApprove = async (id: string) => {
    await codexApi.approve(id).catch(() => {});
    reload();
  };

  const handleReject = async (id: string) => {
    await codexApi.reject(id, 'Contenu inapproprié').catch(() => {});
    reload();
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-[#ececf0] px-4 pt-4 pb-0 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E] flex-1">🪶 Mur du Codex</h1>
          {pending.length > 0 && (
            <span className="bg-[#C62828] text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pending.length} à modérer
            </span>
          )}
        </div>
        <div className="flex">
          {([
            { value: 'publies', label: '✓ Publiés' },
            { value: 'attente', label: `⏳ À modérer (${pending.length})` },
          ] as { value: Tab; label: string }[]).map(t => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider relative ${tab === t.value ? 'text-[#1F1B2E]' : 'text-[#6b6b78]'}`}>
              {t.label}
              {tab === t.value && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#C62828] rounded-t-full" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f5eed8] p-4 lg:p-8">
        {loading && (
          <div className="text-center py-10 text-sm text-[#6b6b78]">
            <div className="text-3xl mb-2 animate-pulse">🪶</div>
            Chargement…
          </div>
        )}

        {tab === 'attente' && !loading && (
          pending.length === 0 ? (
            <div className="text-center py-10 text-sm text-[#6b6b78]">
              <div className="text-3xl mb-2">✅</div>
              <p>Aucune soumission en attente.</p>
            </div>
          ) : (
            <div className="lg:grid lg:grid-cols-2 lg:gap-4">
            {pending.map(sub => (
              <Card key={sub.id} className="mb-3">
                <div className="flex items-start gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#C62828] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {sub.gardien?.nom?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[#1F1B2E]">{sub.gardien?.prenoms} {sub.gardien?.nom}</div>
                    <div className="text-xs text-[#6b6b78]">{sub.challenge?.titre}</div>
                  </div>
                  <Pill variant="or">En attente</Pill>
                </div>
                {sub.texte && (
                  <p className="text-xs text-[#6b6b78] italic mb-3 leading-relaxed">« {sub.texte} »</p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(sub.id)}
                    className="flex-1 bg-[#2E7D32] text-white text-sm font-bold py-2 rounded-xl cursor-pointer hover:bg-[#246127] active:scale-95 transition-all">
                    ✓ Valider
                  </button>
                  <button onClick={() => handleReject(sub.id)}
                    className="flex-1 bg-[#C62828] text-white text-sm font-bold py-2 rounded-xl cursor-pointer hover:bg-[#a82020] active:scale-95 transition-all">
                    ✕ Rejeter
                  </button>
                </div>
              </Card>
            ))}
            </div>
          )
        )}

        {tab === 'publies' && !loading && (
          wall.length === 0 ? (
            <div className="text-center py-10 text-sm text-[#6b6b78]">
              <div className="text-3xl mb-2">🪶</div>
              <p>Aucune publication pour le moment.</p>
            </div>
          ) : (
            <div className="lg:columns-2 lg:gap-4">
              {wall.map((sub, i) => (
                <div key={sub.id} className="break-inside-avoid mb-3.5">
                  <CodexItem
                    submission={sub}
                    priority={i === 0}
                    canReact={!!currentUserId}
                    reactCount={reactions[sub.id] ?? 0}
                    hasReacted={reacted.has(sub.id)}
                    isReacting={reactionPending.has(sub.id)}
                    onReact={handleReact}
                    onUnreact={handleUnreact}
                  />
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
