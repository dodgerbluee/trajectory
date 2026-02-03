import { useCallback, useEffect, useState } from 'react';
import { illnessesApi, childrenApi, ApiClientError } from '@lib/api-client';
import type { Illness, Child, IllnessType } from '@shared/types/api';

export function useIllnesses() {
  const [allIllnesses, setAllIllnesses] = useState<Illness[]>([]);
  const [illnesses, setIllnesses] = useState<Illness[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterChildId, setFilterChildId] = useState<number | undefined>(undefined);
  const [filterIllnessType, setFilterIllnessType] = useState<IllnessType | undefined>(undefined);
  const [filterIllnessStatus, setFilterIllnessStatus] = useState<'ongoing' | 'ended' | undefined>(undefined);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [illnessesResponse, childrenResponse] = await Promise.all([
        illnessesApi.getAll({
          child_id: filterChildId,
          limit: 500,
        }),
        childrenApi.getAll(),
      ]);

      setAllIllnesses(illnessesResponse.data);
      let displayed = filterIllnessType ? illnessesResponse.data.filter((i) => i.illness_types?.includes(filterIllnessType)) : illnessesResponse.data;
      if (filterIllnessStatus === 'ongoing') {
        displayed = displayed.filter(i => !i.end_date);
      } else if (filterIllnessStatus === 'ended') {
        displayed = displayed.filter(i => !!i.end_date);
      }
      setIllnesses(displayed);
      setChildren(childrenResponse.data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load illnesses');
      }
    } finally {
      setLoading(false);
    }
  }, [filterChildId, filterIllnessType, filterIllnessStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    allIllnesses,
    illnesses,
    children,
    loading,
    error,
    filterChildId,
    filterIllnessType,
    filterIllnessStatus,
    setFilterChildId,
    setFilterIllnessType,
    setFilterIllnessStatus,
    reload: loadData,
  };
}
