import { useCallback, useState } from 'react';
import { familiesApi, ApiClientError } from '../../../lib/api-client';
import type { Family } from '../../../types/api';

export function useFamilies() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFamilies = useCallback(async () => {
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

  return {
    families,
    loading,
    error,
    loadFamilies,
  };
}
