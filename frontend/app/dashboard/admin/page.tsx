'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { messagingApi, codexApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { DashboardChartsSection } from '@/components/dashboard/DashboardChartsSection';
import type { Conversation, Submission } from '@/types';

const CONV_ICON: Record<string, string> = {
  COMMUNAUTE: '🌍', REGION: '🗺️', DOYENNE: '🛡️', PAROISSE: '⛪', PRIVE: '🤝', GROUPE: '👥',
};
const CONV_GRADIENT: Record<string, string> = {
  COMMUNAUTE: 'from-[#FFB36B] to-[#7A2820]', REGION: 'from-[#FFB36B] to-[#7A2820]',
  DOYENNE: 'from-[#6A1B9A] to-[#3d1163]', PAROISSE: 'from-[#F58A4B] to-[#7A2820]',
  PRIVE: 'from-[#1F1B2E] to-[#3a1d4d]', GROUPE: 'from-[#2E7D32] to-[#1a5021]',
};

export default function AccueilPage() {
  const { user } = useAuthStore();
  const { data: dashboard, loading: dashboardLoading } = useDashboardStats();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pending, setPending] = useState<Submission[]>([]);
  const [modActionId, setModActionId] = useState<string | null>(null);

  const reloadPending = useCallback(() =>
    codexApi.pending().then(r => setPending(r.data)).catch(() => {}),
  []);

  useEffect(() => {
    (async () => {
      try {
        const [conv, p] = await Promise.all([
          messagingApi.conversations(),
          codexApi.pending(),
        ]);
        setConversations(conv.data);
        setPending(p.data);
      } catch { /* ignore */ }
    })();
  }, []);

  const handleApprove = async (id: string) => {
    setModActionId(id + '-approve');
    try { await codexApi.approve(id); await reloadPending(); } catch { /* ignore */ }
    finally { setModActionId(null); }
  };

  const handleReject = async (id: string) => {
    setModActionId(id + '-reject');
    try { await codexApi.reject(id, 'Contenu inapproprié'); await reloadPending(); } catch { /* ignore */ }
    finally { setModActionId(null); }
  };

  const activeCamp = dashboard?.activeCamp;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 py-4 lg:p-6">

      {/* Top bar */}
      <div className="flex justify-between items-center mb-5 border-b border-[#ececf0] pb-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E]">Accueil</h1>
          <p className="text-xs text-[#6b6b78] mt-0.5 truncate">
            {user ? `${user.prenoms} ${user.nom}` : '—'} · {user?.region?.nom ?? 'Région'}
          </p>
        </div>
        <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
          <Link
            href="/dashboard/admin/camps/nouveau"
            className="bg-[#E55A35] text-white font-bold text-sm px-4 py-2 rounded-xl whitespace-nowrap"
          >
            + Créer camp
          </Link>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFB36B] to-[#7A2820] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user ? `${user.nom?.[0] ?? ''}${user.prenoms?.[0] ?? ''}`.toUpperCase() : 'HR'}
          </div>
        </div>
        <Link
          href="/dashboard/admin/camps/nouveau"
          className="lg:hidden bg-[#E55A35] text-white font-bold text-xs px-3 py-2 rounded-xl whitespace-nowrap flex-shrink-0 ml-3"
        >
          + Camp
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          {
            label: 'Gardiens',
            value: dashboard?.overview.totalGardiens ?? '—',
            delta: 'gardiens actifs',
            icon: '🤝',
            color: '#E55A35',
            bg: '#fef3ef',
            href: '/dashboard/admin/gardiens',
          },
          {
            label: 'Encadrants',
            value: dashboard
              ? (dashboard.overview.guides ?? 0) + (dashboard.overview.sentinelles ?? 0)
              : '—',
            delta: `${dashboard?.overview.guides ?? 0} guides · ${dashboard?.overview.sentinelles ?? 0} sent.`,
            icon: '📖',
            color: '#6A1B9A',
            bg: '#f5eeff',
            href: '/dashboard/admin/guides',
          },
          {
            label: 'Camps',
            value: dashboard?.overview.campsOuverts ?? '—',
            delta: 'ouverts ou en cours',
            icon: '⛺',
            color: '#D9A441',
            bg: '#fdf8ec',
            href: '/dashboard/admin/camps',
          },
          {
            label: 'Conseils',
            value: dashboard?.overview.conseilsAVenir ?? '—',
            delta: 'conseils planifiés',
            icon: '🏛️',
            color: '#2E7D32',
            bg: '#edf7ee',
            href: '/dashboard/admin/conseils',
          },
        ].map(kpi => (
          <Link key={kpi.label} href={kpi.href}
            className="bg-white border border-[#ececf0] rounded-xl p-3 flex flex-col hover:border-[#E55A35]/30 hover:shadow-sm transition-all">
            <div className="flex items-start justify-between mb-2">
              <span className="text-[9px] font-bold text-[#6b6b78] uppercase tracking-wider leading-tight">{kpi.label}</span>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ml-1.5"
                style={{ background: kpi.bg }}>{kpi.icon}</span>
            </div>
            <div className="text-2xl font-black leading-none" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-[10px] text-[#6b6b78] mt-1 leading-tight">{kpi.delta}</div>
          </Link>
        ))}
      </div>

      {/* Graphiques */}
      <div className="mb-5">
        <DashboardChartsSection data={dashboard} loading={dashboardLoading} />
      </div>

      {/* Modération + Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {pending.length > 0 && (
          <div className="bg-white border border-[#ececf0] rounded-2xl p-4">
            <h3 className="font-bold text-sm text-[#1F1B2E] mb-4 flex justify-between">
              🪶 À modérer
              <Link href="/dashboard/admin/codex" className="text-xs text-[#E55A35] font-semibold">
                Tout voir ({pending.length}) →
              </Link>
            </h3>
            <div className="flex flex-col gap-2">
              {pending.slice(0, 3).map(sub => (
                <div key={sub.id} className="flex items-center gap-2.5 bg-[#f9f9fc] rounded-xl p-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#E55A35] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                    {sub.gardien?.nom?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#1F1B2E] truncate">
                      {sub.gardien?.prenoms} {sub.gardien?.nom}
                    </div>
                    <div className="text-[11px] text-[#6b6b78] truncate">
                      {sub.texte ?? sub.challenge?.titre ?? '—'}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(sub.id)}
                      disabled={!!modActionId}
                      className="w-7 h-7 rounded-lg bg-[#2E7D32] text-white text-xs flex items-center justify-center disabled:opacity-50"
                    >
                      {modActionId === sub.id + '-approve' ? '…' : '✓'}
                    </button>
                    <button
                      onClick={() => handleReject(sub.id)}
                      disabled={!!modActionId}
                      className="w-7 h-7 rounded-lg bg-[#E55A35] text-white text-xs flex items-center justify-center disabled:opacity-50"
                    >
                      {modActionId === sub.id + '-reject' ? '…' : '✕'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {conversations.length > 0 && (
          <div className={`bg-white border border-[#ececf0] rounded-2xl p-4 ${pending.length === 0 ? 'lg:col-span-2' : ''}`}>
            <h3 className="font-bold text-sm text-[#1F1B2E] mb-4 flex justify-between">
              💬 Messages récents
              <Link href="/dashboard/admin/messages" className="text-xs text-[#E55A35] font-semibold">
                Tout voir →
              </Link>
            </h3>
            <div className="flex flex-col gap-2">
              {conversations.slice(0, 4).map(conv => {
                const lastMsg = conv.messages?.[0];
                const timeStr = conv.lastMessageAt
                  ? new Date(conv.lastMessageAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : '';
                return (
                  <Link key={conv.id} href={`/dashboard/admin/messages/${conv.id}`}
                    className="flex items-center gap-3 py-2 border-b border-[#f0f0f4] last:border-0 hover:bg-[#fafafc] px-1 rounded-lg transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs text-white bg-gradient-to-br ${CONV_GRADIENT[conv.type] ?? 'from-[#6A1B9A] to-[#3d1163]'} flex-shrink-0`}>
                      {CONV_ICON[conv.type] ?? '💬'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-semibold text-xs text-[#1F1B2E] truncate">{conv.nom ?? 'Conversation'}</span>
                        {timeStr && <span className="text-[10px] text-[#6b6b78] flex-shrink-0">{timeStr}</span>}
                      </div>
                      <p className="text-[11px] text-[#6b6b78] truncate">{lastMsg?.contenu ?? 'Aucun message'}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
