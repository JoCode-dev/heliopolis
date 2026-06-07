'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { DashboardChartsSection } from '@/components/dashboard/DashboardChartsSection';
import { campsApi } from '@/lib/api';
import type { Camp } from '@/types';

const QUICK_LINKS = [
  { href: '/dashboard/region/camps',        icon: '⛺', label: 'Camps',         color: 'bg-[#C62828]/10 text-[#C62828]' },
  { href: '/dashboard/region/participants', icon: '👥', label: 'Participants',   color: 'bg-[#6A1B9A]/10 text-[#6A1B9A]' },
  { href: '/dashboard/region/districts',     icon: '🛡️', label: 'Districts',      color: 'bg-[#D9A441]/10 text-[#D9A441]' },
  { href: '/dashboard/region/guides',       icon: '📖', label: 'Encadrants',     color: 'bg-[#2E7D32]/10 text-[#2E7D32]' },
  { href: '/dashboard/region/gardiens',     icon: '🤝', label: 'Gardiens',       color: 'bg-[#1F1B2E]/10 text-[#1F1B2E]' },
  { href: '/dashboard/region/codex',        icon: '🪶', label: 'Modération',     color: 'bg-[#6A1B9A]/10 text-[#6A1B9A]' },
  { href: '/dashboard/region/messages',     icon: '💬', label: 'Messages',       color: 'bg-[#2E7D32]/10 text-[#2E7D32]' },
  { href: '/dashboard/region/export',       icon: '📤', label: 'Exports',        color: 'bg-[#D9A441]/10 text-[#D9A441]' },
];

export default function RegionHomePage() {
  const { user } = useAuthStore();
  const { data: dashboard, loading: dashboardLoading } = useDashboardStats();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [campsLoading, setCampsLoading] = useState(true);

  useEffect(() => {
    campsApi.list()
      .then(r => {
        const all = r.data as Camp[];
        setCamps(all.filter(camp => ['EN_COURS', 'OUVERT'].includes(camp.statut)));
      })
      .catch(() => {})
      .finally(() => setCampsLoading(false));
  }, []);

  const overview = dashboard?.overview;
  const activeCamp = camps.find(c => c.statut === 'EN_COURS');

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f6f6fa]">

      {/* Bandeau accueil */}
      <div className="bg-gradient-to-br from-[#C62828] to-[#8e1a1a] text-white px-4 pt-5 pb-6 lg:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] opacity-60 uppercase tracking-widest mb-1">Conseil d&apos;Héliopolis</p>
            <h1 className="text-xl font-black">
              Bonjour, {user?.prenoms} 👋
            </h1>
            <p className="text-[12px] opacity-70 mt-1">
              {user?.region?.nom ?? 'Région'} · Vue régionale
            </p>
          </div>
          {activeCamp && (
            <Link href="/dashboard/region/camps"
              className="flex-shrink-0 flex items-center gap-1.5 bg-[#D9A441] text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Camp en cours
            </Link>
          )}
        </div>

        {/* Stats rapides */}
        {!dashboardLoading && overview && (
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { label: 'Camps',       value: overview.campsOuverts,  icon: '⛺' },
              { label: 'Sentinelles', value: overview.sentinelles,   icon: '🛡️' },
              { label: 'Gardiens',    value: overview.totalGardiens, icon: '🤝' },
              { label: 'Districts',   value: overview.districts,     icon: '🗺️' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl p-2.5 text-center">
                <div className="text-base leading-none mb-0.5">{s.icon}</div>
                <div className="text-lg font-black leading-none">{s.value}</div>
                <div className="text-[9px] opacity-70 mt-0.5 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        )}
        {dashboardLoading && (
          <div className="grid grid-cols-4 gap-2 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white/10 rounded-xl p-2.5 h-14 animate-pulse" />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-4 pb-8 lg:px-6 space-y-5">

        {/* Camps en cours / ouverts */}
        {!campsLoading && camps.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-bold text-[#1F1B2E]">⛺ Camps actifs</h2>
              <Link href="/dashboard/region/camps" className="text-xs text-[#C62828] font-semibold">Voir tous →</Link>
            </div>
            <div className="flex flex-col gap-2">
              {camps.slice(0, 2).map(camp => (
                <Link key={camp.id} href="/dashboard/region/camps"
                  className="flex items-center gap-3 bg-white rounded-2xl border border-[#ececf0] px-4 py-3 hover:border-[#c0c0cc] transition-colors">
                  <div className={`w-2 h-10 rounded-full flex-shrink-0 ${camp.statut === 'EN_COURS' ? 'bg-[#D9A441]' : 'bg-[#2E7D32]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[#1F1B2E] truncate">{camp.nom}</div>
                    <div className="text-[11px] text-[#6b6b78] mt-0.5">
                      {camp.statut === 'EN_COURS' ? '🔴 En cours' : '🟢 Ouvert'} · {camp._count?.participants ?? 0} participants
                    </div>
                  </div>
                  <span className="text-[#6b6b78] text-sm flex-shrink-0">›</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Graphiques statistiques */}
        <section>
          <h2 className="text-sm font-bold text-[#1F1B2E] mb-2.5">📊 Statistiques</h2>
          <DashboardChartsSection data={dashboard} loading={dashboardLoading} compact />
        </section>

        {/* Accès rapides */}
        <section>
          <h2 className="text-sm font-bold text-[#1F1B2E] mb-2.5">Accès rapides</h2>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_LINKS.map(l => (
              <Link key={l.href} href={l.href}
                className="flex flex-col items-center gap-1.5 bg-white rounded-2xl border border-[#ececf0] py-3.5 px-1.5 hover:border-[#c0c0cc] transition-colors active:scale-95">
                <div className={`w-10 h-10 rounded-xl ${l.color} flex items-center justify-center text-xl`}>
                  {l.icon}
                </div>
                <span className="text-[10px] font-semibold text-[#1F1B2E] text-center leading-tight">{l.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Nouveau camp */}
        <Link href="/dashboard/region/camps/nouveau"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-[#C62828] text-white font-bold text-sm hover:bg-[#b51d1d] transition-colors shadow-sm">
          ⛺ Créer un nouveau camp
        </Link>
      </div>
    </div>
  );
}
