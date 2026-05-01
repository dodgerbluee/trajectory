import { useCallback, useState } from 'react';
import { peopleApi, ApiClientError } from '@lib/api-client';
import type { Person } from '@shared/types/api';

export function usePeople() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPeople = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await peopleApi.getAll();
      const sortedChildren = [...response.data].sort((a, b) => {
        const dateA = new Date(a.date_of_birth).getTime();
        const dateB = new Date(b.date_of_birth).getTime();
        return dateA - dateB;
      });
      setPeople(sortedChildren);
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

  return {
    people,
    loading,
    error,
    loadPeople,
  };
}
