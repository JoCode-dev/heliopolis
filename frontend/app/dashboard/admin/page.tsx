'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usersApi, messagingApi, codexApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { DashboardChartsSection } from '@/components/dashboard/DashboardChartsSection';
import { Progress, Pill } from '@/components/ui';
import type { User, Conversation, Submission } from '@/types';

const CONV_ICON: Record<string, string> = {
  COMMUNAUTE: '🌍', REGION: '🗺️', DOYENNE: '🛡️', PAROISSE: '⛪', PRIVE: '🤝', GROUPE: '👥',
};
const CONV_GRADIENT: Record<string, string> = {
  COMMUNAUTE: 'from-[#F58A4B] to-[#C62828]', REGION: 'from-[#F58A4B] to-[#C62828]',
  DOYENNE: 'from-[#6A1B9A] to-[#3d1163]', PAROISSE: 'from-[#C62828] to-[#7a1717]',
  PRIVE: 'from-[#1F1B2E] to-[#3a1d4d]', GROUPE: 'from-[#2E7D32] to-[#1a5021]',
};

export default function AccueilPage() {
  const { user } = useAuthStore();
  const { data: dashboard, loading: dashboardLoading } = useDashboardStats();
  const [sentinelles, setSentinelles] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pending, setPending] = useState<Submission[]>([]);
  const [modActionId, setModActionId] = useState<string | null>(null);

  const reloadPending = useCallback(() =>
    codexApi.pending().then(r => setPending(r.data)).catch(() => {}),
  []);

  useEffect(() => {
    (async () => {
      try {
        const [sent, conv, p] = await Promise.all([
          usersApi.list({ role: 'SENTINELLE' }),
          messagingApi.conversations(),
          codexApi.pending(),
        ]);
        setSentinelles(sent.data);
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

  const districts = dashboard?.districts ?? [];
  const activeCamp = dashboard?.activeCamp;
  const activeCampParticipants = dashboard?.camps.find(c => c.id === activeCamp?.id)?.participants ?? 0;
  const parishesCount = districts.reduce((t, d) => t + d.paroisses, 0);
  const transmittedDistricts = districts.filter(d => d.selectionnes > 0).length;

  const sentinelleByDistrict = new Map<string, User>();
  for (const s of sentinelles) {
    if (s.district?.id) sentinelleByDistrict.set(s.district.id, s);
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6">

      {/* Top bar */}
      <div className="flex justify-between items-center mb-5 border-b border-[#ececf0] pb-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E]">Accueil</h1>
          <p className="text-xs text-[#6b6b78] mt-0.5 truncate">
            {user ? `${user.prenoms} ${user.nom}` : '—'} · {user?.region?.nom ?? 'Région'}
          </p>
        </div>
        <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
          <input
            className="bg-white border border-[#e0e0e8] rounded-xl px-3 py-2 text-sm outline-none w-56"
            placeholder="🔍 District, paroisse, camp…"
          />
          <Link
            href="/dashboard/admin/camps/nouveau"
            className="bg-[#C62828] text-white font-bold text-sm px-4 py-2 rounded-xl whitespace-nowrap"
          >
            + Créer camp
          </Link>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F58A4B] to-[#C62828] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user ? `${user.nom[0]}${user.prenoms[0]}`.toUpperCase() : 'HR'}
          </div>
        </div>
        <Link
          href="/dashboard/admin/camps/nouveau"
          className="lg:hidden bg-[#C62828] text-white font-bold text-xs px-3 py-2 rounded-xl whitespace-nowrap flex-shrink-0 ml-3"
        >
          + Camp
        </Link>
      </div>

      {/* KPIs cliquables */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        {[
          {
            label: 'Districts',
            value: dashboard?.overview.districts ?? districts.length,
            delta: `${districts.length} chargés`,
            icon: '🛡️',
            color: '#C62828',
            href: '/dashboard/admin/districts',
          },
          {
            label: 'Paroisses actives',
            value: parishesCount,
            delta: 'données territoriales',
            icon: '⛪',
            color: '#6A1B9A',
            href: '/dashboard/admin/paroisses',
          },
          {
            label: activeCamp?.nom ?? 'Aucun camp',
            value: activeCampParticipants,
            delta: 'participants sélectionnés',
            icon: '⛺',
            color: '#D9A441',
            href: activeCamp
              ? `/dashboard/admin/participants?campId=${activeCamp.id}`
              : '/dashboard/admin/camps',
          },
          {
            label: 'Districts transmis',
            value: `${transmittedDistricts} / ${districts.length || 0}`,
            delta: activeCamp ? activeCamp.nom : 'aucun camp ouvert',
            icon: '✓',
            color: '#2E7D32',
            neg: transmittedDistricts < districts.length,
            href: '/dashboard/admin/participants',
          },
        ].map(kpi => (
          <Link key={kpi.label} href={kpi.href} className="bg-white border border-[#ececf0] rounded-2xl p-4 relative overflow-hidden hover:border-[#C62828]/30 hover:shadow-sm transition-all">
            <div className="absolute top-0 right-0 w-10 h-10 rounded-bl-2xl flex items-center justify-center text-lg"
              style={{ background: kpi.color, color: 'white' }}>{kpi.icon}</div>
            <div className="text-xs text-[#6b6b78] uppercase tracking-wide">{kpi.label}</div>
            <div className="text-3xl font-black text-[#1F1B2E] mt-1.5">{kpi.value}</div>
            <div className={`text-xs mt-1 font-semibold ${'neg' in kpi && kpi.neg ? 'text-[#C62828]' : 'text-[#2E7D32]'}`}>
              {kpi.delta}
            </div>
          </Link>
        ))}
      </div>

      {/* Graphiques statistiques */}
      <div className="mb-5">
        <DashboardChartsSection data={dashboard} loading={dashboardLoading} />
      </div>

      {/* Tableau suivi districts */}
      <div className="bg-white border border-[#ececf0] rounded-2xl p-4 mb-5">
        <h3 className="font-bold text-sm text-[#1F1B2E] mb-4 flex justify-between">
          Suivi des districts — {activeCamp?.nom ?? 'aucun camp ouvert'}
          <Link href="/dashboard/admin/districts" className="text-xs text-[#C62828] font-semibold">
            Détail →
          </Link>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-[#f9f9fc] text-[#6b6b78] uppercase tracking-wide">
                {['District', 'Sentinelle', 'Paroisses', 'Routiers', 'Sélectionnés', 'Statut', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 font-semibold border-b border-[#ececf0]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {districts.map(district => {
                const sentinelle = sentinelleByDistrict.get(district.id);
                const routiers = district.routiers;
                const selected = district.selectionnes;
                return (
                  <tr key={district.id} className="border-b border-[#f0f0f4] hover:bg-[#fafafc]">
                    <td className="px-3 py-3 font-semibold text-[#1F1B2E]">{district.nom}</td>
                    <td className="px-3 py-3 text-[#6b6b78]">
                      {sentinelle ? `${sentinelle.prenoms} ${sentinelle.nom}` : '—'}
                    </td>
                    <td className="px-3 py-3 text-center text-[#6b6b78]">{district.paroisses}</td>
                    <td className="px-3 py-3 text-center text-[#6b6b78]">{routiers}</td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-[#1F1B2E] mb-1">{selected} / {routiers}</div>
                      <Progress value={selected} max={routiers} />
                    </td>
                    <td className="px-3 py-3">
                      {selected > 0
                        ? <Pill variant="vert">✓ Transmis</Pill>
                        : <Pill variant="or">⏳ En attente</Pill>}
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/dashboard/admin/paroisses?districtId=${district.id}`}
                        className="text-[11px] border border-[#e6e6ea] text-[#1F1B2E] rounded-lg px-2.5 py-1 font-semibold hover:bg-[#f6f6fa] transition-colors"
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!dashboardLoading && districts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-[#6b6b78]">
                    Aucun district chargé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modération + Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {pending.length > 0 && (
          <div className="bg-white border border-[#ececf0] rounded-2xl p-4">
            <h3 className="font-bold text-sm text-[#1F1B2E] mb-4 flex justify-between">
              🪶 À modérer
              <Link href="/dashboard/admin/codex" className="text-xs text-[#C62828] font-semibold">
                Tout voir ({pending.length}) →
              </Link>
            </h3>
            <div className="flex flex-col gap-2">
              {pending.slice(0, 3).map(sub => (
                <div key={sub.id} className="flex items-center gap-2.5 bg-[#f9f9fc] rounded-xl p-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#C62828] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
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
                      className="w-7 h-7 rounded-lg bg-[#C62828] text-white text-xs flex items-center justify-center disabled:opacity-50"
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
              <Link href="/dashboard/admin/messages" className="text-xs text-[#C62828] font-semibold">
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
  );
}
