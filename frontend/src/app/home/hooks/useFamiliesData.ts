import { useState, useEffect, useCallback } from 'react';
import { familiesApi, ApiClientError } from '@lib/api-client';
import type { Family } from '@shared/types/api';

interface UseFamiliesDataResult {
  families: Family[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useFamiliesData(): UseFamiliesDataResult {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await familiesApi.getAll();
      setFamilies(response.data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load families');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { families, loading, error, reload };
}
