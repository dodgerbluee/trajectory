import { useState, useMemo } from 'react';
import type { IllnessType } from '@shared/types/api';
import { useIllnessesData } from './useIllnessesData';
import { useChildrenData } from '@features/children/hooks';

export function useIllnesses() {
  const { illnesses: allIllnesses, loading: loadingIllnesses, error: errorIllnesses, reload: reloadIllnesses } = useIllnessesData();
  const { children, loading: loadingChildren, error: errorChildren, reload: reloadChildren } = useChildrenData();
  
  const [filterChildId, setFilterChildId] = useState<number | undefined>(undefined);
  const [filterIllnessType, setFilterIllnessType] = useState<IllnessType | undefined>(undefined);
  const [filterIllnessStatus, setFilterIllnessStatus] = useState<'ongoing' | 'ended' | undefined>(undefined);

  const illnesses = useMemo(() => {
    let result = allIllnesses;
    if (filterChildId) {
      result = result.filter(i => i.child_id === filterChildId);
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
  }, [allIllnesses, filterChildId, filterIllnessType, filterIllnessStatus]);

  return {
    allIllnesses,
    illnesses,
    children,
    loading: loadingIllnesses || loadingChildren,
    error: errorIllnesses || errorChildren,
    filterChildId,
    filterIllnessType,
    filterIllnessStatus,
    setFilterChildId,
    setFilterIllnessType,
    setFilterIllnessStatus,
    reload: async () => {
      await Promise.all([reloadIllnesses(), reloadChildren()]);
    },
  };
}
