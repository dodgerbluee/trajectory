import { useEffect, useState, useCallback } from 'react';
import { illnessesApi, childrenApi, ApiClientError } from '@lib/api-client';
import type { HeatmapData, Child } from '@shared/types/api';

/**
 * Fetches the illness heatmap for a given year + optional child filter, plus
 * the children list used to render summary avatars and day-detail cards.
 *
 * Returns `{ heatmapData, children, loading, error, reload }`.
 */
export function useHeatmapData(year: number, childId?: number) {
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [heatmapResponse, childrenResponse] = await Promise.all([
        illnessesApi.getHeatmapData({ year, child_id: childId }),
        childrenApi.getAll(),
      ]);
      setHeatmapData(heatmapResponse.data);
      setChildren(childrenResponse.data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load metrics data');
      }
    } finally {
      setLoading(false);
    }
  }, [year, childId]);

  useEffect(() => {
    load();
  }, [load]);

  return { heatmapData, children, loading, error, reload: load };
}
