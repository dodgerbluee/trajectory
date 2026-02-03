import { useCallback, useState } from 'react';
import { visitsApi, ApiClientError } from '../../../lib/api-client';
import type { Visit } from '../../../types/api';
import { isFutureDate } from '../../../lib/date-utils';
import { visitHasOutcomeData } from '../../../lib/visit-utils';

export function useUpcomingVisits() {
  const [upcomingVisits, setUpcomingVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUpcomingVisits = useCallback(async () => {
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

  return {
    upcomingVisits,
    loading,
    error,
    loadUpcomingVisits,
  };
}
