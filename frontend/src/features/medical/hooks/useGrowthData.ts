import { useEffect, useState, useCallback } from 'react';
import { visitsApi, ApiClientError } from '@lib/api-client';
import type { GrowthDataPoint } from '@shared/types/api';

/**
 * Fetches growth-data points (one per wellness visit with measurements) for one
 * person or all people. Returns the same `{ data, loading, error, reload }`
 * shape used by the rest of the app's data hooks.
 *
 * Pass `personId` to scope to a single person; omit for all people.
 */
export function useGrowthData(personId?: number) {
  const [data, setData] = useState<GrowthDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await visitsApi.getGrowthData({ person_id: personId });
      setData(response.data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load growth data');
      }
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
