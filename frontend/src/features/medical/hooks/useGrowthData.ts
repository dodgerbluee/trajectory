import { useEffect, useState, useCallback } from 'react';
import { visitsApi, ApiClientError } from '@lib/api-client';
import type { GrowthDataPoint } from '@shared/types/api';

/**
 * Fetches growth-data points (one per wellness visit with measurements) for one
 * child or all children. Returns the same `{ data, loading, error, reload }`
 * shape used by the rest of the app's data hooks.
 *
 * Pass `childId` to scope to a single child; omit for all children.
 */
export function useGrowthData(childId?: number) {
  const [data, setData] = useState<GrowthDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await visitsApi.getGrowthData({ child_id: childId });
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
  }, [childId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
