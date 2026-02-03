import { useEffect, useState, useMemo } from 'react';
import { visitsApi, childrenApi, ApiClientError } from '../lib/api-client';
import type { Visit, Child, VisitType } from '../types/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import VisitsTimeline from './VisitsTimeline';
import VisitsSidebar from './VisitsSidebar';
import visitsLayout from '../styles/VisitsLayout.module.css';
import { HugeiconsIcon } from '@hugeicons/react';
import { DentalToothIcon } from '@hugeicons/core-free-icons';
import { LuActivity, LuHeart, LuPill, LuEye } from 'react-icons/lu';
import { MdOutlinePersonalInjury } from 'react-icons/md';

function AllVisitsView() {
  // `allVisits` holds visits for the current child (if selected) but without a visit_type filter.
  // `visits` is the currently displayed list (may be filtered by `filterVisitType`).
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterChildId, setFilterChildId] = useState<number | undefined>(undefined);
  const [filterVisitType, setFilterVisitType] = useState<VisitType | undefined>(undefined);

  useEffect(() => {
    loadData();
  }, [filterChildId, filterVisitType]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [visitsResponse, childrenResponse] = await Promise.all([
        // Fetch visits for the selected child (if any) but DO NOT apply visit_type on the API
        // so we can compute stable stats. We'll apply visit_type filtering client-side.
        visitsApi.getAll({
          child_id: filterChildId,
          limit: 500,
        }),
        childrenApi.getAll(),
      ]);

      // Keep the full set (for stats) and a displayed set (filtered by visit type client-side)
      setAllVisits(visitsResponse.data);
      const displayed = filterVisitType ? visitsResponse.data.filter(v => v.visit_type === filterVisitType) : visitsResponse.data;
      setVisits(displayed);
      setChildren(childrenResponse.data);

      // Determine which displayed visits have attachments for the timeline indicator
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
  };

  // Track which visits have attachments (visit ID set)
  const [visitsWithAttachments, setVisitsWithAttachments] = useState<Set<number>>(new Set());

  // Compute stable stats from the unfiltered set (allVisits) so counts don't collapse
  // when `filterVisitType` is applied.
  const statsSource = useMemo(() => allVisits, [allVisits]);

  if (loading) {
    return <LoadingSpinner message="Loading visits..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  return (
    <div className={visitsLayout.pageLayout}>
      <VisitsSidebar
        stats={[
          { label: 'Total Visits', value: statsSource.length, icon: LuActivity, color: 'gray', onClick: () => setFilterVisitType(undefined), active: !filterVisitType },
          { label: 'Wellness', value: statsSource.filter(v => v.visit_type === 'wellness').length, icon: LuHeart, color: 'emerald', onClick: () => setFilterVisitType('wellness'), active: filterVisitType === 'wellness' },
          { label: 'Sick', value: statsSource.filter(v => v.visit_type === 'sick').length, icon: LuPill, color: 'red', onClick: () => setFilterVisitType('sick'), active: filterVisitType === 'sick' },
          { label: 'Injury', value: statsSource.filter(v => v.visit_type === 'injury').length, icon: MdOutlinePersonalInjury, color: 'blue', onClick: () => setFilterVisitType('injury'), active: filterVisitType === 'injury' },
          { label: 'Dental', value: statsSource.filter(v => v.visit_type === 'dental').length, icon: (props: { className?: string }) => <HugeiconsIcon icon={DentalToothIcon} {...props} size={24} color="currentColor" />, color: 'teal', onClick: () => setFilterVisitType('dental'), active: filterVisitType === 'dental' },
          { label: 'Vision', value: statsSource.filter(v => v.visit_type === 'vision').length, icon: LuEye, color: 'purple', onClick: () => setFilterVisitType('vision'), active: filterVisitType === 'vision' },
        ]}
        childrenList={children}
        selectedChildId={filterChildId}
        onSelectChild={(id: number | undefined) => setFilterChildId(id)}
      />

      <main className={visitsLayout.main}>
        <VisitsTimeline
          visits={visits}
          children={children}
          visitsWithAttachments={visitsWithAttachments}
          showChildName={true}
        />
      </main>
    </div>
  );
}

export default AllVisitsView;
