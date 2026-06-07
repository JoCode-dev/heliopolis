'use client';

import { useCallback, useEffect, useState } from 'react';
import { territoriesApi } from '@/lib/api';
import type { DashboardStats } from '@/types/dashboard-stats';

export function useDashboardStats() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: stats } = await territoriesApi.dashboardStats();
      setData(stats);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erreur de chargement'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
