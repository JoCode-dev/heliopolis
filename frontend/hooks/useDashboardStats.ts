'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { territoriesApi } from '@/lib/api';
import type { DashboardStats } from '@/types/dashboard-stats';

export function useDashboardStats() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasData = useRef(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: stats } = await territoriesApi.dashboardStats();
      setData(stats);
      hasData.current = true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erreur de chargement'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    // Si le premier chargement échoue (DB indisponible), relancer toutes les 20s jusqu'au succès
    const timer = setInterval(() => {
      if (!hasData.current) void refetch();
    }, 20_000);
    return () => clearInterval(timer);
  }, [refetch]);

  return { data, loading, error, refetch };
}
