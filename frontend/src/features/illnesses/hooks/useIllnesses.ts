import { useState, useMemo, useEffect } from 'react';
import type { IllnessType } from '@shared/types/api';
import { useIllnessesData } from './useIllnessesData';
import { usePeopleData } from '@features/people/hooks';

export function useIllnesses() {
  const DEFAULT_ITEMS_PER_PAGE = 20;
  
  const { illnesses: allIllnesses, loading: loadingIllnesses, error: errorIllnesses, reload: reloadIllnesses } = useIllnessesData();
  const { people, loading: loadingPeople, error: errorPeople, reload: reloadPeople } = usePeopleData();
  
  const [filterPersonId, setFilterPersonId] = useState<number | undefined>(undefined);
  const [filterIllnessType, setFilterIllnessType] = useState<IllnessType | undefined>(undefined);
  const [filterIllnessStatus, setFilterIllnessStatus] = useState<'ongoing' | 'ended' | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  const filteredIllnesses = useMemo(() => {
    let result = allIllnesses;
    if (filterPersonId) {
      result = result.filter(i => i.person_id === filterPersonId);
    }
    if (filterIllnessType) {
      result = result.filter(i => i.illness_types?.includes(filterIllnessType));
    }
    if (filterIllnessStatus === 'ongoing') {
      result = result.filter(i => !i.end_date);
    } else if (filterIllnessStatus === 'ended') {
      result = result.filter(i => !!i.end_date);
    }
    return result;
  }, [allIllnesses, filterPersonId, filterIllnessType, filterIllnessStatus]);

  useEffect(() => {
    setCurrentPage(0);
  }, [filterPersonId, filterIllnessType, filterIllnessStatus]);

  const illnesses = useMemo(() => {
    const startIdx = currentPage * itemsPerPage;
    return filteredIllnesses.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredIllnesses, currentPage, itemsPerPage]);

  return {
    allIllnesses,
    illnesses,
    people,
    loading: loadingIllnesses || loadingPeople,
    error: errorIllnesses || errorPeople,
    filterPersonId,
    filterIllnessType,
    filterIllnessStatus,
    setFilterPersonId,
    setFilterIllnessType,
    setFilterIllnessStatus,
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    totalFilteredIllnesses: filteredIllnesses.length,
    reload: async () => {
      setCurrentPage(0);
      await Promise.all([reloadIllnesses(), reloadPeople()]);
    },
  };
}
