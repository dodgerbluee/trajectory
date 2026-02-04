import { useState, useEffect, useCallback } from 'react';
import { childrenApi, ApiClientError } from '@lib/api-client';
import type { Child } from '@shared/types/api';

interface UseChildrenDataResult {
  children: Child[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useChildrenData(): UseChildrenDataResult {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await childrenApi.getAll();
      const sorted = [...response.data].sort(
        (a, b) =>
          new Date(a.date_of_birth).getTime() -
          new Date(b.date_of_birth).getTime()
      );
      setChildren(sorted);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load children');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { children, loading, error, reload };
}
