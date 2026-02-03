import { useMemo, memo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { DentalToothIcon } from '@hugeicons/core-free-icons';
import { LuActivity, LuHeart, LuPill, LuEye } from 'react-icons/lu';
import { MdOutlinePersonalInjury } from 'react-icons/md';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import visitsLayout from '@shared/styles/VisitsLayout.module.css';
import { VisitFilterSidebar, VisitsTimelineView } from '.';
import { useAllVisits } from '../hooks';

function AllVisitsView() {
  const {
    visits,
    children,
    loading,
    loadingAttachments,
    error,
    filterChildId,
    filterVisitType,
    setFilterChildId,
    setFilterVisitType,
    visitsWithAttachments,
    stats,
    reload,
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    totalFilteredVisits,
  } = useAllVisits();

  const sidebarStats = useMemo(() => [
    { label: 'Total Visits', value: stats.total, icon: LuActivity, color: 'gray', onClick: () => setFilterVisitType(undefined), active: !filterVisitType },
    { label: 'Wellness', value: stats.wellness, icon: LuHeart, color: 'emerald', onClick: () => setFilterVisitType('wellness'), active: filterVisitType === 'wellness' },
    { label: 'Sick', value: stats.sick, icon: LuPill, color: 'red', onClick: () => setFilterVisitType('sick'), active: filterVisitType === 'sick' },
    { label: 'Injury', value: stats.injury, icon: MdOutlinePersonalInjury, color: 'blue', onClick: () => setFilterVisitType('injury'), active: filterVisitType === 'injury' },
    { label: 'Dental', value: stats.dental, icon: (props: { className?: string }) => <HugeiconsIcon icon={DentalToothIcon} {...props} size={24} color="currentColor" />, color: 'teal', onClick: () => setFilterVisitType('dental'), active: filterVisitType === 'dental' },
    { label: 'Vision', value: stats.vision, icon: LuEye, color: 'purple', onClick: () => setFilterVisitType('vision'), active: filterVisitType === 'vision' },
  ], [stats, filterVisitType, setFilterVisitType]);

  if (loading) {
    return <LoadingSpinner message="Loading visits..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={reload} />;
  }

  return (
    <div className={visitsLayout.pageLayout}>
      <VisitFilterSidebar
        stats={sidebarStats}
        childrenList={children}
        selectedChildId={filterChildId}
        onSelectChild={(id: number | undefined) => setFilterChildId(id)}
      />

      <VisitsTimelineView
        visits={visits}
        children={children}
        visitsWithAttachments={visitsWithAttachments}
        showChildName={true}
        isLoading={loadingAttachments}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalItems={totalFilteredVisits}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
}

export default memo(AllVisitsView);
