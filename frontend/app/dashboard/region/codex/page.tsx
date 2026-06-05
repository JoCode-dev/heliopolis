'use client';
import { useEffect, useState } from 'react';
import { codexApi } from '@/lib/api';
import { Pill } from '@/components/ui';
import { CodexItem } from '@/components/codex/CodexItem';
import type { Submission } from '@/types';

export default function CodexPage() {
  const [pending, setPending] = useState<Submission[]>([]);
  const [wall, setWall] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [moderationOpen, setModerationOpen] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    const [p, w] = await Promise.allSettled([
      codexApi.pending(),
      codexApi.wall(1),
    ]);
    if (p.status === 'fulfilled') setPending(p.value.data ?? []);
    if (w.status === 'fulfilled') {
      const d = w.value.data as { items: Submission[]; total: number };
      setWall(d.items ?? w.value.data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id + '-approve');
    try {
      await codexApi.approve(id);
      await fetchData();
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id + '-reject');
    try {
      await codexApi.reject(id, 'Rejeté par le responsable régional');
      await fetchData();
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const handleReact = async (id: string) => {
    try {
      await codexApi.react(id);
      await fetchData();
    } catch { /* ignore */ }
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-5 border-b border-[#ececf0] pb-4">
        <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E]">🪶 Mur du Codex</h1>
        {pending.length > 0 && (
          <Pill variant="or">{pending.length} en attente</Pill>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-[#6b6b78] text-sm">Chargement…</div>
      )}

      {!loading && (
        <>
          {/* Section "À modérer" collapsible */}
          <div className="mb-6">
            <button
              onClick={() => setModerationOpen(v => !v)}
              className="w-full flex items-center justify-between bg-white border border-[#ececf0] rounded-2xl px-4 py-3 text-sm font-bold text-[#1F1B2E] hover:bg-[#fafafc] transition-colors">
              <span>
                À modérer
                {pending.length > 0 && (
                  <span className="ml-2 bg-[#C62828] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {pending.length}
                  </span>
                )}
              </span>
              <span className="text-[#6b6b78]">{moderationOpen ? '▲' : '▼'}</span>
            </button>

            {moderationOpen && (
              <div className="mt-3 flex flex-col gap-3">
                {pending.length === 0 && (
                  <div className="text-center py-8 text-[#6b6b78] text-sm bg-white border border-[#ececf0] rounded-2xl">
                    Aucune soumission en attente de modération
                  </div>
                )}
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
                            Défi : <span className="font-semibold text-[#1F1B2E]">{sub.challenge?.titre ?? '—'}</span>
                          </p>
                          {sub.texte && (
                            <p className="text-xs text-[#1F1B2E] bg-[#f9f9fc] rounded-lg px-3 py-2 italic">
                              « {sub.texte} »
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleApprove(sub.id)}
                            disabled={!!actionLoading}
                            className="text-xs bg-[#e1f4e3] text-[#2E7D32] border border-[#2E7D32]/30 rounded-lg px-3 py-1.5 font-semibold hover:bg-[#2E7D32] hover:text-white transition-colors disabled:opacity-50">
                            {isApproving ? '…' : '✓ Valider'}
                          </button>
                          <button
                            onClick={() => handleReject(sub.id)}
                            disabled={!!actionLoading}
                            className="text-xs bg-[#ffe6e6] text-[#C62828] border border-[#C62828]/30 rounded-lg px-3 py-1.5 font-semibold hover:bg-[#C62828] hover:text-white transition-colors disabled:opacity-50">
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

          {/* Section Publications */}
          <div>
            <h2 className="text-sm font-bold text-[#1F1B2E] mb-4 flex items-center gap-2">
              <span>🪶</span> Publications
              <span className="text-xs font-normal text-[#6b6b78]">({wall.length} entrées)</span>
            </h2>

            {wall.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-[#6b6b78]">
                <div className="text-5xl mb-3">🪶</div>
                <p className="font-semibold">Le mur du Codex est vide</p>
                <p className="text-xs mt-1">Les soumissions validées apparaîtront ici.</p>
              </div>
            )}

            <div className="max-w-2xl">
              {wall.map(sub => (
                <CodexItem key={sub.id} submission={sub} onReact={handleReact} priority={wall.indexOf(sub) === 0} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
