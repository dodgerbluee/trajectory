import { useCallback, useState } from 'react';
import { childrenApi, ApiClientError } from '../../../shared/lib/api-client';
import type { Child } from '../../../shared/types/api';

export function useChildren() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChildren = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await childrenApi.getAll();
      const sortedChildren = [...response.data].sort((a, b) => {
        const dateA = new Date(a.date_of_birth).getTime();
        const dateB = new Date(b.date_of_birth).getTime();
        return dateA - dateB;
      });
      setChildren(sortedChildren);
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

  return {
    children,
    loading,
    error,
    loadChildren,
  };
}
