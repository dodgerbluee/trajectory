import { useCallback, useEffect, useState } from 'react';
import { visitsApi, childrenApi, ApiClientError } from '@lib/api-client';
import type { Visit, Child, VisitType } from '@shared/types/api';

export function useAllVisits() {
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterChildId, setFilterChildId] = useState<number | undefined>(undefined);
  const [filterVisitType, setFilterVisitType] = useState<VisitType | undefined>(undefined);
  const [visitsWithAttachments, setVisitsWithAttachments] = useState<Set<number>>(new Set());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [visitsResponse, childrenResponse] = await Promise.all([
        visitsApi.getAll({
          child_id: filterChildId,
          limit: 500,
        }),
        childrenApi.getAll(),
      ]);

      setAllVisits(visitsResponse.data);
      const displayed = filterVisitType ? visitsResponse.data.filter(v => v.visit_type === filterVisitType) : visitsResponse.data;
      setVisits(displayed);
      setChildren(childrenResponse.data);

      try {
        const checks = await Promise.all(
          displayed.map(async (visit) => {
            try {
              const resp = await visitsApi.getAttachments(visit.id);
              return (resp.data && resp.data.length > 0) ? visit.id : null;
            } catch (err) {
              return null;
            }
          })
        );

        const ids = new Set<number>();
        checks.forEach(id => { if (id !== null) ids.add(id as number); });
        setVisitsWithAttachments(ids);
      } catch (err) {
        // ignore
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load visits');
      }
    } finally {
      setLoading(false);
    }
  }, [filterChildId, filterVisitType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    allVisits,
    visits,
    children,
    loading,
    error,
    filterChildId,
    filterVisitType,
    setFilterChildId,
    setFilterVisitType,
    visitsWithAttachments,
    reload: loadData,
  };
}
