import { useState, useEffect, useCallback, useMemo } from 'react';
import { visitsApi, ApiClientError } from '@lib/api-client';
import type { Visit, VisitType } from '@shared/types/api';

interface UseVisitsDataOptions {
  childId?: number;
  visitType?: VisitType;
  limit?: number;
}

interface UseVisitsDataResult {
  allVisits: Visit[];
  displayVisits: Visit[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useVisitsData(options: UseVisitsDataOptions = {}): UseVisitsDataResult {
  const { childId, visitType, limit = 500 } = options;
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await visitsApi.getAll({
        child_id: childId,
        limit,
      });
      setAllVisits(response.data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load visits');
      }
    } finally {
      setLoading(false);
    }
  }, [childId, limit]);

  useEffect(() => {
    reload();
  }, [reload]);

  const displayVisits = useMemo(() => {
    if (!visitType) return allVisits;
    return allVisits.filter(v => v.visit_type === visitType);
  }, [allVisits, visitType]);

  return { allVisits, displayVisits, loading, error, reload };
}
