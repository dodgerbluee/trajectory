import { useState, useEffect, useCallback } from 'react';
import { peopleApi, ApiClientError } from '@lib/api-client';
import type { Person } from '@shared/types/api';

interface UseChildrenDataResult {
  people: Person[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function usePeopleData(): UseChildrenDataResult {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await peopleApi.getAll();
      const sorted = [...response.data].sort(
        (a, b) =>
          new Date(a.date_of_birth).getTime() -
          new Date(b.date_of_birth).getTime()
      );
      setPeople(sorted);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load people');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { people, loading, error, reload };
}
