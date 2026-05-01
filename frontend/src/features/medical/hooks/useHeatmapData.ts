import { useEffect, useState, useCallback } from 'react';
import { illnessesApi, peopleApi, ApiClientError } from '@lib/api-client';
import type { HeatmapData, Person } from '@shared/types/api';

/**
 * Fetches the illness heatmap for a given year + optional person filter, plus
 * the people list used to render summary avatars and day-detail cards.
 *
 * Returns `{ heatmapData, people, loading, error, reload }`.
 */
export function useHeatmapData(year: number, personId?: number) {
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [heatmapResponse, peopleResponse] = await Promise.all([
        illnessesApi.getHeatmapData({ year, person_id: personId }),
        peopleApi.getAll(),
      ]);
      setHeatmapData(heatmapResponse.data);
      setPeople(peopleResponse.data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load metrics data');
      }
    } finally {
      setLoading(false);
    }
  }, [year, personId]);

  useEffect(() => {
    load();
  }, [load]);

  return { heatmapData, people, loading, error, reload: load };
}
