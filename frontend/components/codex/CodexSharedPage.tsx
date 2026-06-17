'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { codexApi } from '@/lib/api';
import { CodexItem } from '@/components/codex/CodexItem';
import { CodexWall } from '@/components/codex/CodexWall';
import { PhotothequeTab } from '@/components/phototheque/PhotothequeTab';
import { useCodexReactions } from '@/hooks/useCodexReactions';
import { useAuthStore } from '@/store/auth';
import type { Submission } from '@/types';

type Tab = 'phototheque' | 'publies' | 'moderation';

export function CodexSharedPage() {
  const { user } = useAuthStore();
  const role = user?.role ?? '';
  const currentUserId = user?.id;

  const canUpload   = ['ADMIN', 'REGION', 'PHOTOGRAPHE'].includes(role);
  const canModerate = ['ADMIN', 'REGION', 'GUIDE', 'SENTINELLE'].includes(role);
  const isGardien   = role === 'GARDIEN';

  const [tab, setTab]               = useState<Tab>('phototheque');
  const [pending, setPending]       = useState<Submission[]>([]);
  const [wall, setWall]             = useState<Submission[]>([]);
  const [wallTotal, setWallTotal]   = useState(0);
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setAction]  = useState<string | null>(null);

  const { reactions, reacted, reactionPending, syncSubmissions, handleReact, handleUnreact } =
    useCodexReactions(currentUserId);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const calls = isGardien
      ? [Promise.resolve(null), codexApi.wall(1)]
      : [codexApi.pending(), codexApi.wall(1)];

    const [p, w] = await Promise.allSettled(calls);

    if (p.status === 'fulfilled' && p.value) {
      setPending((p.value as { data: Submission[] }).data ?? []);
    }
    if (w.status === 'fulfilled' && w.value) {
      const d = (w.value as { data: unknown }).data as { items: Submission[]; total: number };
      const items: Submission[] = d.items ?? (w.value as { data: Submission[] }).data ?? [];
      setWall(items);
      setWallTotal(d.total ?? items.length);
      syncSubmissions(items, { replace: true });
    }
    setLoading(false);
  }, [isGardien, syncSubmissions]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleApprove = async (id: string) => {
    setAction(id + '-approve');
    try { await codexApi.approve(id); await fetchData(); }
    catch { /* ignore */ }
    finally { setAction(null); }
  };

  const handleReject = async (id: string) => {
    setAction(id + '-reject');
    try { await codexApi.reject(id, 'Contenu inapproprié'); await fetchData(); }
    catch { /* ignore */ }
    finally { setAction(null); }
  };

  const tabs: { value: Tab; label: string }[] = canModerate
    ? [
        { value: 'phototheque', label: '📷 Photothèque' },
        { value: 'publies',     label: '✓ Publiés' },
        { value: 'moderation',  label: `⏳ À modérer (${pending.length})` },
      ]
    : [
        { value: 'phototheque', label: '📷 Photothèque' },
        { value: 'publies',     label: '🪶 Publications' },
      ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header + onglets */}
      <div className="bg-white border-b border-[#ececf0] px-4 pt-4 pb-0 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E] flex-1">🪶 Mur du Codex</h1>
          {canModerate && pending.length > 0 && (
            <span className="bg-[#E55A35] text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pending.length} à modérer
            </span>
          )}
        </div>
        <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {tabs.map(t => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`flex-shrink-0 py-2.5 px-3 text-xs font-bold uppercase tracking-wider relative whitespace-nowrap ${
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

      {/* Photothèque */}
      {tab === 'phototheque' && <PhotothequeTab canUpload={canUpload} />}

      {/* Publications */}
      {tab === 'publies' && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f5eed8]">
          {isGardien && (
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
          )}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#6b6b78] text-sm">
              <div className="text-3xl mb-3 animate-pulse">🪶</div>
              <p>Chargement…</p>
            </div>
          ) : isGardien ? (
            <CodexWall initialPosts={wall} initialTotal={wallTotal} />
          ) : wall.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#6b6b78] p-4">
              <div className="text-5xl mb-3">🪶</div>
              <p className="font-semibold">Le mur du Codex est vide</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-4 lg:p-6">
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
        </div>
      )}

      {/* Modération */}
      {tab === 'moderation' && canModerate && (
        <div className="flex-1 overflow-y-auto px-4 py-4 lg:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#6b6b78] text-sm">Chargement…</div>
          ) : pending.length === 0 ? (
            <div className="text-center py-10 text-sm text-[#6b6b78]">
              <div className="text-3xl mb-2">✅</div>
              <p>Aucune soumission en attente de modération</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-w-2xl">
              {pending.map(sub => {
                const gardien = sub.gardien;
                const isApproving = actionLoading === sub.id + '-approve';
                const isRejecting = actionLoading === sub.id + '-reject';
                return (
                  <div key={sub.id} className="bg-white border border-[#ececf0] rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-[#1F1B2E] text-sm">
                            {gardien ? `${gardien.prenoms} ${gardien.nom}` : 'Gardien'}
                          </span>
                          {gardien?.matricule && (
                            <span className="text-xs text-[#6b6b78] font-mono">{gardien.matricule}</span>
                          )}
                        </div>
                        <p className="text-xs text-[#6b6b78] mb-2">
                          Quête : <span className="font-semibold text-[#1F1B2E]">{sub.challenge?.titre ?? '—'}</span>
                        </p>
                        {sub.texte && (
                          <p className="text-xs text-[#1F1B2E] bg-[#f9f9fc] rounded-lg px-3 py-2 italic">
                            « {sub.texte} »
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => handleApprove(sub.id)} disabled={!!actionLoading}
                          className="text-xs bg-[#e1f4e3] text-[#2E7D32] border border-[#2E7D32]/30 rounded-lg px-3 py-1.5 font-semibold hover:bg-[#2E7D32] hover:text-white transition-colors disabled:opacity-60">
                          {isApproving ? '…' : '✓ Valider'}
                        </button>
                        <button onClick={() => handleReject(sub.id)} disabled={!!actionLoading}
                          className="text-xs bg-[#fff8f3] text-[#E55A35] border border-[#E55A35]/30 rounded-lg px-3 py-1.5 font-semibold hover:bg-[#E55A35] hover:text-white transition-colors disabled:opacity-60">
                          {isRejecting ? '…' : '✕ Rejeter'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
