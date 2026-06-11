'use client';
import { useEffect, useState, useCallback } from 'react';
import { codexApi } from '@/lib/api';
import { CodexItem } from '@/components/codex/CodexItem';
import { PhotothequeTab } from '@/components/phototheque/PhotothequeTab';
import { SectionTitle } from '@/components/ui';
import { useCodexReactions } from '@/hooks/useCodexReactions';
import { useAuthStore } from '@/store/auth';
import type { Submission } from '@/types';

type Tab = 'phototheque' | 'codex';

export default function GuideCodexPage() {
  const { user } = useAuthStore();
  const currentUserId = user?.id;
  const [tab, setTab] = useState<Tab>('phototheque');
  const [pending, setPending] = useState<Submission[]>([]);
  const [wall, setWall] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [moderating, setModerating] = useState<string | null>(null);
  const {
    reactions,
    reacted,
    reactionPending,
    syncSubmissions,
    handleReact,
    handleUnreact,
  } = useCodexReactions(currentUserId);

  const loadData = useCallback(() => {
    Promise.allSettled([
      codexApi.pending(),
      codexApi.wall(1),
    ]).then(([p, w]) => {
      if (p.status === 'fulfilled') setPending(p.value.data ?? []);
      if (w.status === 'fulfilled') {
        const d = w.value.data as { items: Submission[]; total: number };
        const items: Submission[] = d.items ?? w.value.data ?? [];
        setWall(items);
        syncSubmissions(items, { replace: true });
      }
    }).finally(() => setLoading(false));
  }, [syncSubmissions]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (id: string) => {
    setModerating(id);
    try {
      await codexApi.approve(id);
      loadData();
    } catch { /* silent */ } finally {
      setModerating(null);
    }
  };

  const handleReject = async (id: string) => {
    setModerating(id);
    try {
      await codexApi.reject(id, 'Contenu inapproprié');
      loadData();
    } catch { /* silent */ } finally {
      setModerating(null);
    }
  };

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

      <div className={`flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 bg-[#f5eed8] ${tab !== 'codex' ? 'hidden' : ''}`}>
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-[#6b6b78] text-sm">
            <div className="text-3xl mb-3 animate-pulse">🪶</div>
            <p>Chargement…</p>
          </div>
        )}

        {!loading && pending.length > 0 && (
          <>
            <SectionTitle>À modérer ({pending.length})</SectionTitle>
            <div className="lg:grid lg:grid-cols-2 lg:gap-4">
            {pending.map(sub => (
              <div key={sub.id} className="bg-white rounded-2xl border border-[#ececf0] p-3.5 mb-3 shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#4a1370] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {sub.gardien ? `${sub.gardien.nom?.[0] ?? ''}${sub.gardien.prenoms?.[0] ?? ''}`.toUpperCase() : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[#1F1B2E]">
                      {sub.gardien ? `${sub.gardien.prenoms} ${sub.gardien.nom}` : 'Gardien'}
                    </div>
                    <div className="text-xs text-[#6b6b78] mt-0.5">{sub.challenge?.titre ?? 'Défi'}</div>
                  </div>
                  <span className="text-[10px] bg-[#fff3d6] text-[#9c7218] px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                    En attente
                  </span>
                </div>

                {sub.texte && (
                  <p className="text-sm text-[#1F1B2E] leading-relaxed mb-3 px-1">{sub.texte}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(sub.id)}
                    disabled={moderating === sub.id}
                    className="flex-1 bg-[#2E7D32] text-white font-bold text-sm py-2.5 rounded-xl disabled:opacity-60"
                  >
                    {moderating === sub.id ? '…' : '✓ Valider'}
                  </button>
                  <button
                    onClick={() => handleReject(sub.id)}
                    disabled={moderating === sub.id}
                    className="flex-1 bg-white border border-[#e6e6ea] text-[#E55A35] font-bold text-sm py-2.5 rounded-xl disabled:opacity-60"
                  >
                    {moderating === sub.id ? '…' : '✕ Rejeter'}
                  </button>
                </div>
              </div>
            ))}
            </div>
          </>
        )}

        {!loading && pending.length === 0 && (
          <div className="bg-[#e8f5e9] rounded-2xl p-4 mb-4 flex items-start gap-3">
            <span className="text-xl">✅</span>
            <div>
              <p className="text-sm font-semibold text-[#2E7D32]">Aucune preuve en attente</p>
              <p className="text-xs text-[#6b6b78] mt-1">Toutes les soumissions ont été traitées.</p>
            </div>
          </div>
        )}

        {!loading && (
          <>
            <SectionTitle>Publications récentes</SectionTitle>
            {wall.length === 0 ? (
              <div className="text-center py-8 text-[#6b6b78] text-sm">
                <div className="text-4xl mb-3">🪶</div>
                <p>Aucune publication pour le moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {wall.map((sub, i) => (
                  <CodexItem
                    key={sub.id}
                    submission={sub}
                    priority={i === 0}
                    canReact={!!currentUserId}
                    reactCount={reactions[sub.id] ?? 0}
                    hasReacted={reacted.has(sub.id)}
                    isReacting={reactionPending.has(sub.id)}
                    onReact={handleReact}
                    onUnreact={handleUnreact}
                  />
                ))}
              </div>
            )}
          </>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
