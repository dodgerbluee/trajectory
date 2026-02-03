import { useEffect, useState, useMemo } from 'react';
import { visitsApi } from '@lib/api-client';
import type { VisitType } from '@shared/types/api';
import { useVisitsData } from './useVisitsData';
import { useChildrenData } from '@features/children/hooks';

export function useAllVisits() {
  const { allVisits, loading: loadingVisits, error: errorVisits, reload: reloadVisits } = useVisitsData();
  const { children, loading: loadingChildren, error: errorChildren, reload: reloadChildren } = useChildrenData();
  
  const [filterChildId, setFilterChildId] = useState<number | undefined>(undefined);
  const [filterVisitType, setFilterVisitType] = useState<VisitType | undefined>(undefined);
  const [visitsWithAttachments, setVisitsWithAttachments] = useState<Set<number>>(new Set());
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  const filteredVisits = useMemo(() => {
    let result = allVisits;
    if (filterChildId) {
      result = result.filter(v => v.child_id === filterChildId);
    }
    if (filterVisitType) {
      result = result.filter(v => v.visit_type === filterVisitType);
    }
    return result;
  }, [allVisits, filterChildId, filterVisitType]);

  // Load attachment information for displayed visits
  useEffect(() => {
    const checkAttachments = async () => {
      if (filteredVisits.length === 0) {
        setVisitsWithAttachments(new Set());
        return;
      }

      setLoadingAttachments(true);
      try {
        const checks = await Promise.all(
          filteredVisits.map(async (visit) => {
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
        // ignore attachment loading errors
      } finally {
        setLoadingAttachments(false);
      }
    };

    checkAttachments();
  }, [filteredVisits]);

  return {
    allVisits,
    visits: filteredVisits,
    children,
    loading: loadingVisits || loadingChildren || loadingAttachments,
    error: errorVisits || errorChildren,
    filterChildId,
    filterVisitType,
    setFilterChildId,
    setFilterVisitType,
    visitsWithAttachments,
    reload: async () => {
      await Promise.all([reloadVisits(), reloadChildren()]);
    },
  };
}
