import { LuActivity, LuEye, LuHeart } from 'react-icons/lu';
import { LuPill } from 'react-icons/lu';
import { MdOutlinePersonalInjury } from 'react-icons/md';
import { HugeiconsIcon } from '@hugeicons/react';
import { DentalToothIcon } from '@hugeicons/core-free-icons';
import type { Visit } from '@shared/types/api';
import { VisitFilterSidebar, VisitsTimeline } from '@features/visits';
import visitsLayout from '@shared/styles/VisitsLayout.module.css';

type VisitTypeFilter = 'all' | 'wellness' | 'sick' | 'injury' | 'vision' | 'dental';

type Props = {
  visits: Visit[];
  visibleVisits: Visit[];
  visitsWithAttachments: Set<number>;
  visitTypeFilter: VisitTypeFilter;
  onChangeVisitTypeFilter: (filter: VisitTypeFilter) => void;
  onAddVisitClick: () => void;
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
};

export default function VisitsTab({
  visits,
  visibleVisits,
  visitsWithAttachments,
  visitTypeFilter,
  onChangeVisitTypeFilter,
  onAddVisitClick,
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
}: Props) {
  return (
    <div className={visitsLayout.pageLayout}>
      <VisitFilterSidebar
        stats={[
          {
            label: 'Total Visits',
            value: visits.length,
            icon: LuActivity,
            color: 'gray',
            onClick: () => onChangeVisitTypeFilter('all'),
            active: visitTypeFilter === 'all',
          },
          {
            label: 'Wellness',
            value: visits.filter((v) => v.visit_type === 'wellness').length,
            icon: LuHeart,
            color: 'emerald',
            onClick: () => onChangeVisitTypeFilter('wellness'),
            active: visitTypeFilter === 'wellness',
          },
          {
            label: 'Sick',
            value: visits.filter((v) => v.visit_type === 'sick').length,
            icon: LuPill,
            color: 'red',
            onClick: () => onChangeVisitTypeFilter('sick'),
            active: visitTypeFilter === 'sick',
          },
          {
            label: 'Injury',
            value: visits.filter((v) => v.visit_type === 'injury').length,
            icon: MdOutlinePersonalInjury,
            color: 'blue',
            onClick: () => onChangeVisitTypeFilter('injury'),
            active: visitTypeFilter === 'injury',
          },
          {
            label: 'Dental',
            value: visits.filter((v) => v.visit_type === 'dental').length,
            icon: (props: { className?: string }) => (
              <HugeiconsIcon icon={DentalToothIcon} {...props} size={24} color="currentColor" />
            ),
            color: 'teal',
            onClick: () => onChangeVisitTypeFilter('dental'),
            active: visitTypeFilter === 'dental',
          },
          {
            label: 'Vision',
            value: visits.filter((v) => v.visit_type === 'vision').length,
            icon: LuEye,
            color: 'purple',
            onClick: () => onChangeVisitTypeFilter('vision'),
            active: visitTypeFilter === 'vision',
          },
        ]}
        childrenList={[]}
        selectedChildId={undefined}
        onSelectChild={() => {}}
        hideChildFilter
        onAddVisitClick={onAddVisitClick}
      />

      <main className={visitsLayout.main}>
        <VisitsTimeline
          visits={visibleVisits}
          visitsWithAttachments={visitsWithAttachments}
          showChildName={false}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
        />
      </main>
    </div>
  );
}
