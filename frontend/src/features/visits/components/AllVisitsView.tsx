import { useMemo, memo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { DentalToothIcon } from '@hugeicons/core-free-icons';
import { LuActivity, LuStethoscope, LuPill, LuEye } from 'react-icons/lu';
import { MdOutlinePersonalInjury } from 'react-icons/md';
import ErrorMessage from '@shared/components/ErrorMessage';
import VisitCardSkeleton from './VisitCardSkeleton';
import { useIsMobile } from '@shared/hooks';
import visitsLayout from '@shared/styles/VisitsLayout.module.css';
import { VisitFilterSidebar, VisitsTimelineView } from '.';
import MobileAllVisitsView from './MobileAllVisitsView';
import { useAllVisits } from '../hooks';

/**
 * Mobile branch is rendered before the desktop hook fires so the two
 * variants don't both subscribe to `useAllVisits` simultaneously.
 */
function AllVisitsView() {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <MobileAllVisitsView />;
  }
  return <DesktopAllVisitsView />;
}

function DesktopAllVisitsView() {
  const {
    visits,
    people,
    loading,
    error,
    filterPersonId,
    filterVisitType,
    setFilterPersonId,
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
    { label: 'Wellness', value: stats.wellness, icon: LuStethoscope, color: 'emerald', onClick: () => setFilterVisitType('wellness'), active: filterVisitType === 'wellness' },
    { label: 'Sick', value: stats.sick, icon: LuPill, color: 'red', onClick: () => setFilterVisitType('sick'), active: filterVisitType === 'sick' },
    { label: 'Injury', value: stats.injury, icon: MdOutlinePersonalInjury, color: 'blue', onClick: () => setFilterVisitType('injury'), active: filterVisitType === 'injury' },
    { label: 'Dental', value: stats.dental, icon: (props: { className?: string }) => <HugeiconsIcon icon={DentalToothIcon} {...props} size={24} color="currentColor" />, color: 'teal', onClick: () => setFilterVisitType('dental'), active: filterVisitType === 'dental' },
    { label: 'Vision', value: stats.vision, icon: LuEye, color: 'purple', onClick: () => setFilterVisitType('vision'), active: filterVisitType === 'vision' },
  ], [stats, filterVisitType, setFilterVisitType]);

  if (error) {
    return <ErrorMessage message={error} onRetry={reload} />;
  }

  if (loading) {
    return (
      <div className={visitsLayout.pageLayout}>
        <VisitFilterSidebar
          stats={sidebarStats}
          peopleList={people}
          selectedPersonId={filterPersonId}
          onSelectPerson={(id: number | undefined) => setFilterPersonId(id)}
        />
        <div aria-busy="true" aria-label="Loading visits">
          {Array.from({ length: 6 }).map((_, i) => (
            <VisitCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={visitsLayout.pageLayout}>
      <VisitFilterSidebar
        stats={sidebarStats}
        peopleList={people}
        selectedPersonId={filterPersonId}
        onSelectPerson={(id: number | undefined) => setFilterPersonId(id)}
      />

      <VisitsTimelineView
        visits={visits}
        people={people}
        visitsWithAttachments={visitsWithAttachments}
        showPersonName={true}
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
