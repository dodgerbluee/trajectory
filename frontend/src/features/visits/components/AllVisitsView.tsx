import { useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { DentalToothIcon } from '@hugeicons/core-free-icons';
import { LuActivity, LuHeart, LuPill, LuEye } from 'react-icons/lu';
import { MdOutlinePersonalInjury } from 'react-icons/md';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import visitsLayout from '@shared/styles/VisitsLayout.module.css';
import { VisitsTimeline, VisitFilterSidebar } from '.';
import { useAllVisits } from '../hooks';

function AllVisitsView() {
  const {
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
    reload,
  } = useAllVisits();

  const statsSource = useMemo(() => allVisits, [allVisits]);

  if (loading) {
    return <LoadingSpinner message="Loading visits..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={reload} />;
  }

  return (
    <div className={visitsLayout.pageLayout}>
      <VisitFilterSidebar
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
