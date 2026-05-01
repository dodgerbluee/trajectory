import { useEffect, useState, useMemo } from 'react';
import type { VisitType } from '@shared/types/api';
import { useVisitsData } from './useVisitsData';
import { usePeopleData } from '@features/people/hooks';

const DEFAULT_ITEMS_PER_PAGE = 20;

export function useAllVisits() {
  const { allVisits, loading: loadingVisits, error: errorVisits, reload: reloadVisits } = useVisitsData();
  const { people, loading: loadingPeople, error: errorPeople, reload: reloadPeople } = usePeopleData();

  const [filterPersonId, setFilterPersonId] = useState<number | undefined>(undefined);
  const [filterVisitType, setFilterVisitType] = useState<VisitType | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  const filteredVisits = useMemo(() => {
    let result = allVisits;
    if (filterPersonId) {
      result = result.filter(v => v.person_id === filterPersonId);
    }
    if (filterVisitType) {
      result = result.filter(v => v.visit_type === filterVisitType);
    }
    return result;
  }, [allVisits, filterPersonId, filterVisitType]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [filterPersonId, filterVisitType]);

  // Get only visible visits on current page
  const visibleVisits = useMemo(() => {
    const startIdx = currentPage * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return filteredVisits.slice(startIdx, endIdx);
  }, [filteredVisits, currentPage, itemsPerPage]);

  // Derived from server-provided visit.has_attachments — no per-visit network calls.
  const visitsWithAttachments = useMemo(() => {
    const set = new Set<number>();
    for (const v of allVisits) {
      if (v.has_attachments) set.add(v.id);
    }
    return set;
  }, [allVisits]);

  // Memoized stats to avoid recalculation on every render
  const stats = useMemo(() => ({
    wellness: allVisits.filter(v => v.visit_type === 'wellness').length,
    sick: allVisits.filter(v => v.visit_type === 'sick').length,
    injury: allVisits.filter(v => v.visit_type === 'injury').length,
    dental: allVisits.filter(v => v.visit_type === 'dental').length,
    vision: allVisits.filter(v => v.visit_type === 'vision').length,
    total: allVisits.length,
  }), [allVisits]);

  return {
    allVisits,
    visits: visibleVisits,
    people,
    loading: loadingVisits || loadingPeople,
    loadingAttachments: false,
    error: errorVisits || errorPeople,
    filterPersonId,
    filterVisitType,
    setFilterPersonId,
    setFilterVisitType,
    visitsWithAttachments,
    stats,
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    totalFilteredVisits: filteredVisits.length,
    reload: async () => {
      setCurrentPage(0);
      await Promise.all([reloadVisits(), reloadPeople()]);
    },
  };
}
