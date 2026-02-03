import { useState, useEffect, useCallback } from 'react';
import { visitsApi, ApiClientError } from '@lib/api-client';
import type { Visit } from '@shared/types/api';
import { isFutureDate } from '@lib/date-utils';
import { visitHasOutcomeData } from '@lib/visit-utils';

interface UseUpcomingVisitsDataResult {
  upcomingVisits: Visit[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useUpcomingVisitsData(): UseUpcomingVisitsDataResult {
  const [upcomingVisits, setUpcomingVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await visitsApi.getAll({ limit: 80 });
      const all = response.data;
      const upcoming = all
        .filter((v) => isFutureDate(v.visit_date) || !visitHasOutcomeData(v))
        .sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime())
        .slice(0, 30);
      setUpcomingVisits(upcoming);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load upcoming visits');
      }
      setUpcomingVisits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { upcomingVisits, loading, error, reload };
}
