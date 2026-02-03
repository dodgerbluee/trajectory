import { useEffect, useState, useMemo } from 'react';
import { visitsApi } from '@lib/api-client';
import type { VisitType } from '@shared/types/api';
import { useVisitsData } from './useVisitsData';
import { useChildrenData } from '@features/children/hooks';

const DEFAULT_ITEMS_PER_PAGE = 20;
const ATTACHMENT_CHECK_BATCH_SIZE = 10;
const ATTACHMENT_CHECK_DELAY = 100; // ms between batches

export function useAllVisits() {
  const { allVisits, loading: loadingVisits, error: errorVisits, reload: reloadVisits } = useVisitsData();
  const { children, loading: loadingChildren, error: errorChildren, reload: reloadChildren } = useChildrenData();
  
  const [filterChildId, setFilterChildId] = useState<number | undefined>(undefined);
  const [filterVisitType, setFilterVisitType] = useState<VisitType | undefined>(undefined);
  const [visitsWithAttachments, setVisitsWithAttachments] = useState<Set<number>>(new Set());
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

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

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [filterChildId, filterVisitType]);

  // Get only visible visits on current page
  const visibleVisits = useMemo(() => {
    const startIdx = currentPage * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return filteredVisits.slice(startIdx, endIdx);
  }, [filteredVisits, currentPage, itemsPerPage]);

  // Load attachment info only for visible visits, in batches
  useEffect(() => {
    const checkAttachments = async () => {
      if (visibleVisits.length === 0) {
        return;
      }

      setLoadingAttachments(true);
      try {
        const newAttachments = new Set(visitsWithAttachments);
        const visitsToCheck = visibleVisits.filter(v => !visitsWithAttachments.has(v.id));

        // Check attachments in batches to avoid overwhelming the server
        for (let i = 0; i < visitsToCheck.length; i += ATTACHMENT_CHECK_BATCH_SIZE) {
          const batch = visitsToCheck.slice(i, i + ATTACHMENT_CHECK_BATCH_SIZE);
          
          const checks = await Promise.all(
            batch.map(async (visit) => {
              try {
                const resp = await visitsApi.getAttachments(visit.id);
                return (resp.data && resp.data.length > 0) ? visit.id : null;
              } catch (err) {
                return null;
              }
            })
          );

          checks.forEach(id => { if (id !== null) newAttachments.add(id as number); });
          
          // Add delay between batches to avoid hammering server
          if (i + ATTACHMENT_CHECK_BATCH_SIZE < visitsToCheck.length) {
            await new Promise(resolve => setTimeout(resolve, ATTACHMENT_CHECK_DELAY));
          }
        }

        setVisitsWithAttachments(newAttachments);
      } catch (err) {
        // ignore attachment loading errors
      } finally {
        setLoadingAttachments(false);
      }
    };

    checkAttachments();
  }, [visibleVisits, visitsWithAttachments]);

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
    children,
    loading: loadingVisits || loadingChildren,
    loadingAttachments,
    error: errorVisits || errorChildren,
    filterChildId,
    filterVisitType,
    setFilterChildId,
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
      setVisitsWithAttachments(new Set());
      await Promise.all([reloadVisits(), reloadChildren()]);
    },
  };
}
