import { useState, useEffect, useCallback } from 'react';
import { illnessesApi, ApiClientError } from '@lib/api-client';
import type { Illness } from '@shared/types/api';

interface UseIllnessesDataOptions {
  childId?: number;
  limit?: number;
}

interface UseIllnessesDataResult {
  illnesses: Illness[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useIllnessesData(options: UseIllnessesDataOptions = {}): UseIllnessesDataResult {
  const { childId, limit = 500 } = options;
  const [illnesses, setIllnesses] = useState<Illness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await illnessesApi.getAll({
        child_id: childId,
        limit,
      });
      setIllnesses(response.data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load illnesses');
      }
    } finally {
      setLoading(false);
    }
  }, [childId, limit]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { illnesses, loading, error, reload };
}
